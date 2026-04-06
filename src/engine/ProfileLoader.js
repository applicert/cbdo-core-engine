/**
 * ProfileLoader
 *
 * Loads, validates, and caches CBDO profile definitions.
 * A profile defines the permitted queries, consent rules, response
 * constraints, and override policy for a specific CBDO type.
 */

export class ProfileLoader {
  constructor() {
    this._profiles = new Map();
  }

  /**
   * Load a profile from a plain object (parsed JSON).
   * Validates structure before accepting.
   * @param {Object} profileData
   * @returns {Object} the validated profile
   * @throws {ProfileValidationError}
   */
  load(profileData) {
    this._validate(profileData);

    if (this._profiles.has(profileData.id)) {
      throw new ProfileValidationError(
        `Profile '${profileData.id}' is already loaded. Use replace() to update.`
      );
    }

    const profile = Object.freeze(structuredClone(profileData));
    this._profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Replace an existing profile (e.g. on version update).
   */
  replace(profileData) {
    this._validate(profileData);
    const profile = Object.freeze(structuredClone(profileData));
    this._profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Retrieve a loaded profile by id.
   * @returns {Object|null}
   */
  get(profileId) {
    return this._profiles.get(profileId) ?? null;
  }

  /**
   * Check whether a query type is permitted by a profile.
   */
  queryTypePermitted(profileId, queryType) {
    const profile = this.get(profileId);
    if (!profile) return false;
    return profile.allowedQueries.some((q) => q.type === queryType);
  }

  /**
   * Get the query definition for a specific type within a profile.
   */
  getQueryDef(profileId, queryType) {
    const profile = this.get(profileId);
    if (!profile) return null;
    return profile.allowedQueries.find((q) => q.type === queryType) ?? null;
  }

  // ─── Private Validation ──────────────────────────────────────────────────

  _validate(profile) {
    const errors = [];

    if (!profile.id || typeof profile.id !== 'string') {
      errors.push('Profile must have a string id');
    }
    if (!profile.version || typeof profile.version !== 'string') {
      errors.push('Profile must have a version string');
    }
    if (!Array.isArray(profile.allowedQueries) || profile.allowedQueries.length === 0) {
      errors.push('Profile must have at least one allowedQuery');
    } else {
      for (const q of profile.allowedQueries) {
        if (!q.type) errors.push(`Query missing type`);
        if (!Array.isArray(q.allowedResponseFields)) {
          errors.push(`Query '${q.type}' missing allowedResponseFields`);
        }
        if (!Array.isArray(q.credentialFields)) {
          errors.push(`Query '${q.type}' missing credentialFields`);
        }

        // Prohibited fields must not overlap with allowed response fields
        const prohibited = profile.dataMinimization?.prohibitedFields ?? [];
        const allowed = q.allowedResponseFields ?? [];
        const overlap = prohibited.filter((f) => allowed.includes(f));
        if (overlap.length > 0) {
          errors.push(
            `Query '${q.type}': prohibitedFields overlap with allowedResponseFields: ${overlap.join(', ')}`
          );
        }
      }
    }

    if (!profile.consentRules) {
      errors.push('Profile must have consentRules');
    }

    if (!profile.dataMinimization) {
      errors.push('Profile must have dataMinimization rules');
    }

    if (profile.overridePolicy?.overridePermitted) {
      const op = profile.overridePolicy;
      if (op.threshold > op.totalParties) {
        errors.push('overridePolicy.threshold cannot exceed totalParties');
      }
      if (!Array.isArray(op.authorizedParties) || op.authorizedParties.length !== op.totalParties) {
        errors.push('authorizedParties.length must equal totalParties');
      }
    }

    if (errors.length > 0) {
      throw new ProfileValidationError(
        `Profile validation failed:\n  - ${errors.join('\n  - ')}`
      );
    }
  }
}

export class ProfileValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProfileValidationError';
  }
}
