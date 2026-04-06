/**
 * ConsentEngine
 *
 * State machine governing consent for (cbdoId, verifierId, queryType) triples.
 *
 * States: UNKNOWN → PENDING → GRANTED / DENIED
 *         GRANTED → EXPIRED / REVOKED
 *         EXPIRED → PENDING (if renewalPolicy = prompt)
 *         EXPIRED → GRANTED (if renewalPolicy = automatic)
 *
 * No credential data is accessed in this module.
 * Consent evaluation MUST occur before any credential access.
 */

export const ConsentState = Object.freeze({
  UNKNOWN: 'UNKNOWN',
  PENDING: 'PENDING',
  GRANTED: 'GRANTED',
  DENIED: 'DENIED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
});

export class ConsentEngine {
  constructor() {
    // Map<consentKey, ConsentRecord>
    // consentKey = `${cbdoId}::${verifierId}::${queryType}`
    this._records = new Map();
  }

  /**
   * Evaluate whether a query is consented to proceed.
   * Mutates state as needed (e.g. GRANTED→EXPIRED, UNKNOWN→PENDING).
   *
   * @param {Object} query
   * @param {Object} profile
   * @returns {{ consented: boolean, state: string, record: Object }}
   */
  evaluate(query, profile) {
    const { cbdoId, verifierId, queryType } = query;
    const consentRules = profile.consentRules;
    const key = this._key(cbdoId, verifierId, queryType);

    let record = this._records.get(key);

    // If no record exists, initialise it
    if (!record) {
      if (consentRules.defaultConsent) {
        record = this._createRecord(cbdoId, verifierId, queryType, ConsentState.GRANTED, consentRules);
        this._addHistory(record, `UNKNOWN→GRANTED`, 'system', 'defaultConsent=true');
      } else if (consentRules.requireExplicitConsent) {
        record = this._createRecord(cbdoId, verifierId, queryType, ConsentState.PENDING, consentRules);
        this._addHistory(record, `UNKNOWN→PENDING`, 'system', 'requireExplicitConsent=true');
      } else {
        record = this._createRecord(cbdoId, verifierId, queryType, ConsentState.GRANTED, consentRules);
        this._addHistory(record, `UNKNOWN→GRANTED`, 'system', 'implicit consent');
      }
      this._records.set(key, record);
    }

    // Check expiry on GRANTED records
    if (record.state === ConsentState.GRANTED && record.expiresAt !== null) {
      if (Date.now() / 1000 > record.expiresAt) {
        const prevState = record.state;
        record.state = ConsentState.EXPIRED;
        this._addHistory(record, `${prevState}→EXPIRED`, 'system', 'consent expiry elapsed');

        // Apply renewal policy
        if (consentRules.renewalPolicy === 'automatic') {
          record.state = ConsentState.GRANTED;
          record.grantedAt = Math.floor(Date.now() / 1000);
          record.expiresAt = record.grantedAt + consentRules.consentExpiry;
          this._addHistory(record, `EXPIRED→GRANTED`, 'system', 'renewalPolicy=automatic');
        } else {
          // prompt or none — move to PENDING
          record.state = ConsentState.PENDING;
          this._addHistory(record, `EXPIRED→PENDING`, 'system', `renewalPolicy=${consentRules.renewalPolicy}`);
        }
      }
    }

    const consented = record.state === ConsentState.GRANTED;
    return { consented, state: record.state, record: { ...record } };
  }

  /**
   * Grant consent for a (cbdoId, verifierId, queryType) triple.
   * Called when user approves a consent request.
   *
   * @param {string} cbdoId
   * @param {string} verifierId
   * @param {string} queryType
   * @param {string} userDID
   * @param {Object} consentRules
   */
  grant(cbdoId, verifierId, queryType, userDID, consentRules) {
    const key = this._key(cbdoId, verifierId, queryType);
    let record = this._records.get(key);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = consentRules.consentExpiry > 0
      ? now + consentRules.consentExpiry
      : null;

    if (!record) {
      record = this._createRecord(cbdoId, verifierId, queryType, ConsentState.PENDING, consentRules);
      this._records.set(key, record);
    }

    const prevState = record.state;
    record.state = ConsentState.GRANTED;
    record.grantedAt = now;
    record.expiresAt = expiresAt;
    record.grantedBy = userDID;
    this._addHistory(record, `${prevState}→GRANTED`, 'user', `grantedBy=${userDID}`);

    return { ...record };
  }

  /**
   * Deny consent.
   */
  deny(cbdoId, verifierId, queryType, userDID) {
    const key = this._key(cbdoId, verifierId, queryType);
    let record = this._records.get(key);

    if (!record) {
      record = this._createRecord(cbdoId, verifierId, queryType, ConsentState.PENDING, {});
      this._records.set(key, record);
    }

    const prevState = record.state;
    record.state = ConsentState.DENIED;
    this._addHistory(record, `${prevState}→DENIED`, 'user', `deniedBy=${userDID}`);

    return { ...record };
  }

  /**
   * Revoke a previously granted consent.
   */
  revoke(cbdoId, verifierId, queryType, userDID) {
    const key = this._key(cbdoId, verifierId, queryType);
    const record = this._records.get(key);

    if (!record || record.state !== ConsentState.GRANTED) {
      throw new ConsentError(`Cannot revoke consent that is not in GRANTED state`);
    }

    const prevState = record.state;
    record.state = ConsentState.REVOKED;
    this._addHistory(record, `${prevState}→REVOKED`, 'user', `revokedBy=${userDID}`);

    return { ...record };
  }

  /**
   * Get the current consent record for a triple.
   */
  getRecord(cbdoId, verifierId, queryType) {
    return this._records.get(this._key(cbdoId, verifierId, queryType)) ?? null;
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  _key(cbdoId, verifierId, queryType) {
    return `${cbdoId}::${verifierId}::${queryType}`;
  }

  _createRecord(cbdoId, verifierId, queryType, initialState, consentRules) {
    return {
      cbdoId,
      verifierId,
      queryType,
      state: initialState,
      grantedAt: null,
      expiresAt: null,
      grantedBy: null,
      history: [],
    };
  }

  _addHistory(record, transition, actor, reason = '') {
    record.history.push({
      transition,
      timestamp: Math.floor(Date.now() / 1000),
      actor,
      reason,
    });
  }
}

export class ConsentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConsentError';
  }
}
