/**
 * CoreEngine
 *
 * The orchestrator. Coordinates all modules according to the
 * processing pipeline defined in the spec (section 3.2).
 *
 * Pipeline (never skip or reorder steps):
 * 1. RECEIVE query
 * 2. LOAD profile
 * 3. VALIDATE query against profile
 * 4. EVALUATE consent
 * 5. PROCESS query against credential data internally
 * 6. MINIMIZE response
 * 7. GENERATE proof
 * 8. LOG interaction
 * 9. RETURN minimized response + proof
 *
 * Raw credential data is only accessed in step 5, internally.
 * It NEVER appears in any output.
 */

import { ProfileLoader } from './ProfileLoader.js';
import { QueryValidator } from './QueryValidator.js';
import { ConsentEngine } from './ConsentEngine.js';
import { ResponseMinimizer } from './ResponseMinimizer.js';
import { ProofGenerator } from './ProofGenerator.js';
import { AuditLogger, EventType } from './AuditLogger.js';

export class CoreEngine {
  /**
   * @param {Object} options
   * @param {import('./ProofGenerator.js').ProofGenerator} [options.proofGenerator]
   */
  constructor(options = {}) {
    this.profileLoader = new ProfileLoader();
    this.queryValidator = new QueryValidator(this.profileLoader);
    this.consentEngine = new ConsentEngine();
    this.responseMinimizer = new ResponseMinimizer();
    this.proofGenerator = options.proofGenerator ?? new ProofGenerator();
    this.auditLogger = new AuditLogger();
  }

  /**
   * Load a profile into the engine.
   * @param {Object} profileData
   */
  loadProfile(profileData) {
    return this.profileLoader.load(profileData);
  }

  /**
   * Process an incoming query through the full pipeline.
   *
   * @param {Object} query - The incoming query object
   * @param {string} profileId - The CBDO profile to apply
   * @param {Object} credential - The W3C Verifiable Credential (private)
   * @param {string} holderDID - The DID of the credential holder
   * @returns {Promise<Object>} Response object (minimized) or rejection
   */
  async processQuery(query, profileId, credential, holderDID) {
    // Step 1: Log receipt
    this.auditLogger.log(EventType.QUERY_RECEIVED, {
      cbdoId: query.cbdoId,
      verifierId: query.verifierId,
      queryId: query.queryId,
      outcome: 'RECEIVED',
    });

    // Step 2: Load profile
    const profile = this.profileLoader.get(profileId);
    if (!profile) {
      const auditRef = this.auditLogger.log(EventType.QUERY_REJECTED, {
        cbdoId: query.cbdoId,
        verifierId: query.verifierId,
        queryId: query.queryId,
        outcome: 'REJECTED',
        reason: 'PROFILE_NOT_FOUND',
      });
      return this._rejection(query, 'PROFILE_NOT_FOUND', `No profile loaded: '${profileId}'`, auditRef);
    }

    // Step 3: Validate query against profile
    const validation = this.queryValidator.validate(query, profileId);
    if (!validation.valid) {
      const auditRef = this.auditLogger.log(EventType.QUERY_REJECTED, {
        cbdoId: query.cbdoId,
        verifierId: query.verifierId,
        queryId: query.queryId,
        outcome: 'REJECTED',
        reason: validation.reason,
      });
      return this._rejection(query, validation.reason, validation.detail, auditRef);
    }

    const { queryDef } = validation;

    // Step 4: Evaluate consent
    const consentResult = this.consentEngine.evaluate(query, profile);
    if (!consentResult.consented) {
      const auditRef = this.auditLogger.log(EventType.QUERY_REJECTED, {
        cbdoId: query.cbdoId,
        verifierId: query.verifierId,
        queryId: query.queryId,
        outcome: 'REJECTED',
        reason: `CONSENT_${consentResult.state}`,
      });
      return this._rejection(
        query,
        `CONSENT_${consentResult.state}`,
        `Consent is in state '${consentResult.state}'. Query cannot proceed.`,
        auditRef
      );
    }

    // Step 5: Process query against credential data (internal only)
    // This is the ONLY step where credential data is accessed.
    // The result is a raw boolean — the field value never leaves this scope.
    let rawResult;
    try {
      rawResult = this._executeQuery(query, queryDef, credential);
    } catch (err) {
      const auditRef = this.auditLogger.log(EventType.QUERY_REJECTED, {
        cbdoId: query.cbdoId,
        verifierId: query.verifierId,
        queryId: query.queryId,
        outcome: 'ERROR',
        reason: 'EXECUTION_ERROR',
      });
      return this._rejection(query, 'EXECUTION_ERROR', 'Query execution failed', auditRef);
    }

    // Step 6: Minimize the response
    const minimized = this.responseMinimizer.minimize(
      {
        result: rawResult.result,
        issuerId: credential.issuer ?? credential.id,
        profileId,
        timestamp: Math.floor(Date.now() / 1000),
      },
      queryDef,
      profile
    );

    // Step 7: Generate cryptographic proof
    const proof = await this.proofGenerator.generateProof(
      credential,
      query.queryType,
      query.parameters,
      minimized.result,
      holderDID
    );

    // Step 8: Log success
    const auditRef = this.auditLogger.log(EventType.QUERY_PROCESSED, {
      cbdoId: query.cbdoId,
      verifierId: query.verifierId,
      queryId: query.queryId,
      outcome: 'SUCCESS',
    });

    // Step 9: Return minimized response + proof
    return {
      status: 'OK',
      queryId: query.queryId,
      cbdoId: query.cbdoId,
      ...minimized,
      proof,
      auditRef,
    };
  }

  /**
   * Grant consent for a (cbdoId, verifierId, queryType) triple.
   */
  grantConsent(cbdoId, verifierId, queryType, userDID, profileId) {
    const profile = this.profileLoader.get(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);

    const record = this.consentEngine.grant(
      cbdoId, verifierId, queryType, userDID, profile.consentRules
    );

    this.auditLogger.log(EventType.CONSENT_CHANGED, {
      cbdoId,
      verifierId,
      outcome: 'GRANTED',
      meta: { queryType, userDID },
    });

    return record;
  }

  /**
   * Revoke consent.
   */
  revokeConsent(cbdoId, verifierId, queryType, userDID) {
    const record = this.consentEngine.revoke(cbdoId, verifierId, queryType, userDID);

    this.auditLogger.log(EventType.CONSENT_CHANGED, {
      cbdoId,
      verifierId,
      outcome: 'REVOKED',
      meta: { queryType, userDID },
    });

    return record;
  }

  /**
   * Get audit history for a CBDO (for user transparency dashboard).
   */
  getCbdoHistory(cbdoId) {
    return this.auditLogger.getCbdoHistory(cbdoId);
  }

  /**
   * Verify audit log chain integrity.
   */
  verifyAuditChain() {
    return this.auditLogger.verifyChain();
  }

  // ─── Private: Query Execution ─────────────────────────────────────────────

  /**
   * Execute a query against credential data.
   * This is the ONLY place credential field values are accessed.
   * The return value contains ONLY the computed result — never raw field data.
   *
   * @returns {{ result: boolean }}
   */
  _executeQuery(query, queryDef, credential) {
    switch (query.queryType) {
      case 'AGE_THRESHOLD':
        return this._executeAgeThreshold(query.parameters, credential);

      default:
        throw new Error(`Unknown query type: ${query.queryType}`);
    }
  }

  _executeAgeThreshold(parameters, credential) {
    const { threshold } = parameters;
    const subject = credential.credentialSubject;

    if (!subject?.dateOfBirth) {
      throw new Error('Credential does not contain dateOfBirth field');
    }

    // Parse the date of birth — the value is accessed here and only here
    const dob = new Date(subject.dateOfBirth);
    if (isNaN(dob.getTime())) {
      throw new Error('Invalid dateOfBirth format in credential');
    }

    // Compute age without exposing the date value
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    // Return ONLY the boolean result — the dob and age values
    // go out of scope here and are never stored or returned
    return { result: age >= threshold };
  }

  // ─── Private: Response Helpers ────────────────────────────────────────────

  _rejection(query, reason, detail, auditRef) {
    return {
      status: 'REJECTED',
      queryId: query.queryId,
      cbdoId: query.cbdoId,
      reason,
      detail,
      timestamp: Math.floor(Date.now() / 1000),
      auditRef,
    };
  }
}
