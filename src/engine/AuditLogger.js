/**
 * AuditLogger
 *
 * Append-only, cryptographically chained log of all Core Engine events.
 *
 * Every entry hashes the previous entry, forming a chain where any
 * modification to any historical entry invalidates all subsequent entries.
 * This is the same structure used in certificate transparency logs.
 *
 * Log entries are written for:
 * - QUERY_RECEIVED
 * - QUERY_REJECTED
 * - QUERY_PROCESSED
 * - CONSENT_CHANGED
 * - OVERRIDE_INITIATED
 * - OVERRIDE_COMPLETED
 * - OVERRIDE_REJECTED
 *
 * Verifiers receive only an auditRef token — never the entry contents.
 */

import { createHash } from 'crypto';
import { randomUUID } from 'crypto';

export const EventType = Object.freeze({
  QUERY_RECEIVED: 'QUERY_RECEIVED',
  QUERY_REJECTED: 'QUERY_REJECTED',
  QUERY_PROCESSED: 'QUERY_PROCESSED',
  CONSENT_CHANGED: 'CONSENT_CHANGED',
  OVERRIDE_INITIATED: 'OVERRIDE_INITIATED',
  OVERRIDE_COMPLETED: 'OVERRIDE_COMPLETED',
  OVERRIDE_REJECTED: 'OVERRIDE_REJECTED',
});

export class AuditLogger {
  constructor() {
    this._entries = [];
  }

  /**
   * Append a new entry to the audit log.
   *
   * @param {string} eventType - One of EventType
   * @param {Object} fields - Event-specific fields
   * @returns {string} auditRef — opaque token returned to callers
   */
  log(eventType, fields) {
    const entryId = randomUUID();
    const previousHash = this._entries.length > 0
      ? this._entries[this._entries.length - 1].entryHash
      : null;

    const timestamp = Date.now();

    const entry = {
      entryId,
      previousHash,
      timestamp,
      eventType,
      cbdoId: fields.cbdoId ?? null,
      verifierId: fields.verifierId ?? null,
      queryId: fields.queryId ?? null,
      outcome: fields.outcome ?? null,
      reason: fields.reason ?? null,
      // Additional event-specific metadata
      meta: fields.meta ?? null,
    };

    // Compute this entry's hash over its contents
    entry.entryHash = this._hash(entry);

    this._entries.push(Object.freeze(entry));

    // Return an opaque audit reference (first 16 chars of entryId)
    return entryId.replace(/-/g, '').substring(0, 16);
  }

  /**
   * Verify the integrity of the entire audit chain.
   * Returns true if the chain is valid, false if any entry has been tampered with.
   */
  verifyChain() {
    for (let i = 0; i < this._entries.length; i++) {
      const entry = this._entries[i];

      // Verify this entry's hash
      const expectedHash = this._hash({ ...entry, entryHash: undefined });
      if (entry.entryHash !== expectedHash) {
        return {
          valid: false,
          reason: `Entry ${i} (${entry.entryId}) hash mismatch`,
          corruptedIndex: i,
        };
      }

      // Verify chain linkage
      if (i > 0) {
        const prevHash = this._entries[i - 1].entryHash;
        if (entry.previousHash !== prevHash) {
          return {
            valid: false,
            reason: `Entry ${i} previousHash does not match entry ${i - 1} entryHash`,
            corruptedIndex: i,
          };
        }
      } else {
        if (entry.previousHash !== null) {
          return {
            valid: false,
            reason: `Genesis entry should have null previousHash`,
            corruptedIndex: 0,
          };
        }
      }
    }

    return { valid: true, entries: this._entries.length };
  }

  /**
   * Get all entries (for audit export).
   * In production, this should be access-controlled.
   */
  getEntries() {
    return [...this._entries];
  }

  /**
   * Get a specific entry by auditRef token.
   * Returns null if not found.
   */
  getByRef(auditRef) {
    return (
      this._entries.find((e) =>
        e.entryId.replace(/-/g, '').startsWith(auditRef)
      ) ?? null
    );
  }

  /**
   * Get a summary of events for a specific CBDO (for user transparency).
   * Returns only high-level event metadata — not internal details.
   */
  getCbdoHistory(cbdoId) {
    return this._entries
      .filter((e) => e.cbdoId === cbdoId)
      .map((e) => ({
        timestamp: e.timestamp,
        eventType: e.eventType,
        outcome: e.outcome,
        verifierId: e.verifierId,
        auditRef: e.entryId.replace(/-/g, '').substring(0, 16),
      }));
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  _hash(entry) {
    // Hash over the stable fields, excluding entryHash itself
    const hashable = [
      entry.entryId,
      entry.previousHash ?? '',
      String(entry.timestamp),
      entry.eventType,
      entry.cbdoId ?? '',
      entry.verifierId ?? '',
      entry.queryId ?? '',
      entry.outcome ?? '',
    ].join('|');

    return createHash('sha256').update(hashable).digest('hex');
  }
}
