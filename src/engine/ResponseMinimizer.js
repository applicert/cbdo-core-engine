/**
 * ResponseMinimizer
 *
 * Enforces data minimization on all outgoing responses.
 * This is the last gate before data leaves the Core Engine.
 *
 * Rules applied (per spec section 7.1):
 * 1. Field whitelist — only allowedResponseFields may be present
 * 2. Prohibited field removal — prohibitedFields are stripped even if present
 * 3. Raw value suppression — for boolean types, no field derivable from
 *    the underlying value may appear
 * 4. Metadata stripping — internal processing fields removed
 * 5. Field count enforcement — maxResponseFields limit applied
 */

export class ResponseMinimizer {
  /**
   * Minimize a raw result before it leaves the engine.
   *
   * @param {Object} rawResult - The internal result object
   * @param {Object} queryDef - The query definition from the profile
   * @param {Object} profile - The full profile
   * @returns {Object} The minimized response object
   */
  minimize(rawResult, queryDef, profile) {
    const allowedFields = new Set(queryDef.allowedResponseFields ?? []);
    const prohibitedFields = new Set(profile.dataMinimization?.prohibitedFields ?? []);
    const maxFields = profile.dataMinimization?.maxResponseFields ?? Infinity;

    // Start with an empty output object — never spread rawResult directly
    const output = {};

    // Walk allowed fields in order, adding them if present and not prohibited
    for (const field of allowedFields) {
      if (prohibitedFields.has(field)) continue; // double safety
      if (rawResult[field] !== undefined) {
        output[field] = rawResult[field];
      }
      if (Object.keys(output).length >= maxFields) break;
    }

    // Sanity check: verify no prohibited field leaked through
    for (const field of prohibitedFields) {
      if (field in output) {
        // This should never happen — if it does, something is seriously wrong
        delete output[field];
        console.error(
          `[ResponseMinimizer] CRITICAL: prohibited field '${field}' found in output and was removed. This is a bug.`
        );
      }
    }

    // For boolean response types, additionally verify the output
    // contains no value that could reveal the underlying credential data
    if (queryDef.responseType === 'boolean') {
      this._assertBooleanSafety(output, queryDef, prohibitedFields);
    }

    return output;
  }

  /**
   * Assert that a boolean response contains no credential-derived data.
   * The ONLY permissible information about the credential is the
   * boolean result itself.
   */
  _assertBooleanSafety(output, queryDef, prohibitedFields) {
    // The credential fields that were accessed internally
    const internalFields = new Set(queryDef.credentialFields ?? []);

    for (const [key, value] of Object.entries(output)) {
      // Check if a value is a string that looks like a date (YYYY-MM-DD)
      // No date value should ever appear in a boolean response
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        throw new MinimizationError(
          `ResponseMinimizer: date-like value detected in field '${key}' of boolean response. ` +
          `This suggests a credential field value leaked into the response. Aborting.`
        );
      }

      // Check if a numeric value could be an age or birth year
      if (typeof value === 'number' && key !== 'timestamp') {
        if (value >= 1900 && value <= 2100) {
          throw new MinimizationError(
            `ResponseMinimizer: year-like numeric value ${value} detected in field '${key}'. ` +
            `This may be a credential-derived value. Aborting.`
          );
        }
        if (value >= 0 && value <= 150 && !['threshold'].includes(key)) {
          throw new MinimizationError(
            `ResponseMinimizer: age-like numeric value ${value} detected in field '${key}'. ` +
            `This may be a credential-derived value. Aborting.`
          );
        }
      }
    }
  }
}

export class MinimizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MinimizationError';
  }
}
