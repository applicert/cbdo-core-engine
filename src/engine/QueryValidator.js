/**
 * QueryValidator
 *
 * Validates incoming queries against the loaded profile schema.
 * Performs all structural and policy checks before any credential
 * data is accessed. No credential data is read in this module.
 *
 * Validation steps (per spec section 5.2):
 * 1. Schema validation
 * 2. Profile existence
 * 3. Query type permitted
 * 4. Parameter validation
 * 5. Timestamp freshness
 * 6. Nonce uniqueness
 * 7. Verifier signature (stubbed — requires DID resolution)
 * 8. Verifier authorization
 */

const TIMESTAMP_TOLERANCE_SECONDS = 300;
const NONCE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export class QueryValidator {
  /**
   * @param {import('./ProfileLoader.js').ProfileLoader} profileLoader
   */
  constructor(profileLoader) {
    this._profileLoader = profileLoader;
    // Nonce store: Map<nonce, expiresAt>
    this._seenNonces = new Map();
  }

  /**
   * Validate a query object.
   * @param {Object} query - The incoming query
   * @param {string} profileId - The profile to validate against
   * @returns {{ valid: true, queryDef: Object } | { valid: false, reason: string }}
   */
  validate(query, profileId) {
    this._purgeExpiredNonces();

    // Step 1: Schema validation
    const schemaResult = this._validateSchema(query);
    if (!schemaResult.valid) return schemaResult;

    // Step 2: Profile existence
    const profile = this._profileLoader.get(profileId);
    if (!profile) {
      return this._reject('PROFILE_NOT_FOUND', `No profile loaded for '${profileId}'`);
    }

    // Step 3: Query type permitted
    if (!this._profileLoader.queryTypePermitted(profileId, query.queryType)) {
      return this._reject(
        'TYPE_NOT_PERMITTED',
        `Query type '${query.queryType}' is not permitted by profile '${profileId}'`
      );
    }

    const queryDef = this._profileLoader.getQueryDef(profileId, query.queryType);

    // Step 4: Parameter validation
    const paramResult = this._validateParameters(query.parameters, queryDef);
    if (!paramResult.valid) return paramResult;

    // Step 5: Timestamp freshness
    const now = Math.floor(Date.now() / 1000);
    const drift = Math.abs(now - query.timestamp);
    if (drift > TIMESTAMP_TOLERANCE_SECONDS) {
      return this._reject(
        'TIMESTAMP_STALE',
        `Query timestamp drift of ${drift}s exceeds tolerance of ${TIMESTAMP_TOLERANCE_SECONDS}s`
      );
    }

    // Step 6: Nonce uniqueness (replay prevention)
    if (this._seenNonces.has(query.nonce)) {
      return this._reject('NONCE_REPLAY', `Nonce '${query.nonce}' has already been used`);
    }

    // Step 7: Verifier signature
    // NOTE: Full DID resolution and signature verification requires
    // integration with a DID resolver. This is stubbed in v0.1.
    // In production, this MUST verify query.verifierSignature against
    // the verifier's DID document public key.
    const sigResult = this._verifySignatureStub(query);
    if (!sigResult.valid) return sigResult;

    // Step 8: Verifier authorization
    // In production, verifier authorization may be checked against
    // an allowlist in the profile or a registry of approved verifiers.
    // Stub: all verifiers with valid DIDs are permitted.

    // All checks passed — record nonce and return success
    this._seenNonces.set(query.nonce, Date.now() + NONCE_WINDOW_MS);

    return { valid: true, queryDef };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  _validateSchema(query) {
    const required = ['queryId', 'cbdoId', 'verifierId', 'queryType', 'timestamp', 'nonce'];
    for (const field of required) {
      if (query[field] === undefined || query[field] === null) {
        return this._reject('SCHEMA_INVALID', `Missing required field: '${field}'`);
      }
    }
    if (typeof query.queryId !== 'string') {
      return this._reject('SCHEMA_INVALID', 'queryId must be a string');
    }
    if (typeof query.timestamp !== 'number') {
      return this._reject('SCHEMA_INVALID', 'timestamp must be a number');
    }
    if (typeof query.nonce !== 'string' || query.nonce.length < 8) {
      return this._reject('SCHEMA_INVALID', 'nonce must be a string of at least 8 characters');
    }
    return { valid: true };
  }

  _validateParameters(params, queryDef) {
    if (!params || typeof params !== 'object') {
      return this._reject('PARAM_INVALID', 'parameters must be an object');
    }

    for (const paramDef of queryDef.parameters ?? []) {
      const value = params[paramDef.name];

      if (paramDef.required && (value === undefined || value === null)) {
        return this._reject('PARAM_INVALID', `Required parameter '${paramDef.name}' is missing`);
      }

      if (value !== undefined && paramDef.type === 'integer') {
        if (!Number.isInteger(value)) {
          return this._reject(
            'PARAM_INVALID',
            `Parameter '${paramDef.name}' must be an integer`
          );
        }
        const { minimum, maximum } = paramDef.constraints ?? {};
        if (minimum !== undefined && value < minimum) {
          return this._reject(
            'PARAM_INVALID',
            `Parameter '${paramDef.name}' must be >= ${minimum}`
          );
        }
        if (maximum !== undefined && value > maximum) {
          return this._reject(
            'PARAM_INVALID',
            `Parameter '${paramDef.name}' must be <= ${maximum}`
          );
        }
      }
    }

    return { valid: true };
  }

  _verifySignatureStub(query) {
    // STUB: In production, resolve query.verifierId as a DID,
    // fetch the verification method from the DID document,
    // and verify query.verifierSignature over the canonical
    // query body (queryId + cbdoId + verifierId + queryType +
    // parameters + timestamp + nonce).
    //
    // For v0.1 demo purposes, accept any query with a non-empty verifierId.
    if (!query.verifierId || typeof query.verifierId !== 'string') {
      return this._reject('SIGNATURE_INVALID', 'verifierId is required');
    }
    return { valid: true };
  }

  _reject(reason, detail) {
    return { valid: false, reason, detail };
  }

  _purgeExpiredNonces() {
    const now = Date.now();
    for (const [nonce, expiresAt] of this._seenNonces.entries()) {
      if (now > expiresAt) this._seenNonces.delete(nonce);
    }
  }
}
