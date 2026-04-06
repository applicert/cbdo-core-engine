# CBDO Core Engine Specification
## Version 0.1 — Draft for Public Review

**Author:** William Brian Williams, Applicert  
**Date:** April 2026  
**Status:** Draft — Seeking Cryptographic Peer Review  
**License:** CC0 1.0 Universal (Public Domain)

---

## Abstract

This document specifies the execution logic of the Consent-Based Data Object (CBDO) Core Engine — the active layer that transforms static verifiable credentials into policy-enforced, query-responsive verification systems. The Core Engine sits between a user's credential store and any external verifier, ensuring that no raw data is ever disclosed during standard verification interactions.

This specification is intended as a contribution toward an open Internet Standard. All concepts described herein are published as prior art under CC0. Reference implementation code is available at [repository URL].

---

## 1. Motivation and Scope

### 1.1 The Problem with Existing Credential Systems

W3C Verifiable Credentials (VCs) provide a robust mechanism for issuing and verifying signed claims. However, the standard VC interaction model involves presenting credential fields to a verifier — even with selective disclosure via BBS+, the verifier receives the disclosed field value directly.

This creates residual exposure: a verifier asking "is this person over 18?" receives, in a standard VC presentation, the actual date of birth field or a derived age value. The verifier now holds personal data, creating storage obligations, breach liability, and regulatory burden.

The Core Engine eliminates this by introducing a query-response layer: verifiers submit structured queries; the engine evaluates them internally and returns minimized, cryptographically provable answers. The verifier receives a boolean and a proof — never a field value.

### 1.2 Scope

This specification covers:
- Profile definition schema and validation
- Query validation logic
- Consent state machine
- Response minimization rules
- Proof generation interface
- Audit log structure and integrity mechanism
- Controlled override protocol

This specification does not cover:
- Specific cryptographic library implementations (see Section 8)
- Network transport protocols
- User interface requirements
- Trust Authority accreditation procedures (see CBDO Governance Charter)

---

## 2. Terminology

**CBDO** — Consent-Based Data Object. A user-owned, query-responsive data container built on W3C Verifiable Credentials.

**Profile** — A machine-readable schema defining the permitted queries, response types, consent rules, and override conditions for a specific CBDO type (e.g., AgePass, CareerPass).

**Query** — A structured request submitted by an external verifier asking a specific question about a CBDO's contents.

**Response** — The minimized, cryptographically provable answer returned by the Core Engine. Never contains raw field values in standard operation.

**Trust Authority (TA)** — An accredited institution authorized to issue signed CBDOs and define profile schemas.

**Verifier** — Any external system submitting queries to the Core Engine.

**Consent State** — The current authorization status of a specific verifier's access to a specific CBDO, as governed by the user's consent rules.

**Proof** — A cryptographic artifact demonstrating that a response was derived correctly from a signed credential, without revealing the underlying data.

**Override** — A lawful access event requiring multi-party threshold authorization. Distinct from standard query operations.

---

## 3. Architecture

### 3.1 Module Overview

The Core Engine comprises six modules with strict separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                   CORE ENGINE                       │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ ProfileLoader│    │     QueryValidator       │   │
│  │              │───▶│                          │   │
│  │ Loads &      │    │ Validates query type,    │   │
│  │ validates    │    │ parameters & permissions │   │
│  │ profile      │    └────────────┬─────────────┘   │
│  │ schemas      │                 │                 │
│  └──────────────┘    ┌────────────▼─────────────┐   │
│                      │      ConsentEngine       │   │
│                      │                          │   │
│                      │ State machine evaluating │   │
│                      │ user consent rules       │   │
│                      └────────────┬─────────────┘   │
│                                   │                 │
│                      ┌────────────▼─────────────┐   │
│                      │    ResponseMinimizer     │   │
│                      │                          │   │
│                      │ Strips response to       │   │
│                      │ minimum permissible data │   │
│                      └────────────┬─────────────┘   │
│                                   │                 │
│                      ┌────────────▼─────────────┐   │
│                      │     ProofGenerator       │   │
│                      │                          │   │
│                      │ Calls cryptographic      │   │
│                      │ library (BBS+/ZKP)       │   │
│                      └────────────┬─────────────┘   │
│                                   │                 │
│                      ┌────────────▼─────────────┐   │
│                      │      AuditLogger         │   │
│                      │                          │   │
│                      │ Append-only chained log  │   │
│                      │ of all engine events     │   │
│                      └──────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 3.2 Processing Pipeline

Every query follows this exact sequence. No step may be skipped or reordered.

```
1. RECEIVE query
2. LOAD profile for CBDO type
3. VALIDATE query against profile schema
   → REJECT if invalid (log rejection)
4. EVALUATE consent state for (verifier, query type)
   → REJECT if consent absent or expired (log rejection)
5. PROCESS query against credential data internally
6. MINIMIZE response to permitted fields only
7. GENERATE cryptographic proof for minimized response
8. LOG interaction to audit trail
9. RETURN minimized response + proof
```

Raw credential data is accessed only in step 5, internally, and never appears in the output of any subsequent step.

---

## 4. Profile Schema

### 4.1 Profile Definition Format

Profiles are JSON documents conforming to the following schema:

```json
{
  "id": "string — unique profile identifier (e.g. agepass-v1)",
  "version": "string — semver",
  "name": "string — human-readable name",
  "description": "string",
  "issuer": "string — DID of the Trust Authority that may issue this profile",
  "allowedQueries": [
    {
      "type": "string — query type identifier",
      "description": "string",
      "parameters": [
        {
          "name": "string",
          "type": "string — json schema type",
          "required": "boolean",
          "constraints": "object — json schema constraints"
        }
      ],
      "responseType": "string — boolean | integer | string | object",
      "allowedResponseFields": ["array of permitted field names"],
      "credentialFields": ["array of internal credential fields accessed"]
    }
  ],
  "consentRules": {
    "requireExplicitConsent": "boolean",
    "defaultConsent": "boolean — false for sensitive profiles",
    "consentExpiry": "integer — seconds, 0 = no expiry",
    "renewalPolicy": "string — none | prompt | automatic",
    "scopeGranularity": "string — profile | queryType | instance"
  },
  "dataMinimization": {
    "maxResponseFields": "integer",
    "prohibitedFields": ["fields that may never appear in any response"],
    "proofRequired": "boolean"
  },
  "overridePolicy": {
    "overridePermitted": "boolean",
    "threshold": "integer — minimum parties required (t)",
    "totalParties": "integer — total key share holders (n)",
    "authorizedParties": [
      {
        "role": "string",
        "did": "string — DID of authorized party"
      }
    ],
    "auditRequirements": "object"
  }
}
```

### 4.2 Profile Validation Rules

A profile document MUST be rejected if:
- `id` is not unique within the engine's loaded profiles
- `allowedQueries` is empty
- Any query type references a `credentialField` not present in the associated credential schema
- `overridePolicy.threshold` > `overridePolicy.totalParties`
- `overridePolicy.authorizedParties` length != `overridePolicy.totalParties`
- `dataMinimization.prohibitedFields` intersects with any `allowedResponseFields`

---

## 5. Query Validation

### 5.1 Query Object Format

```json
{
  "queryId": "string — unique identifier for this query instance",
  "cbdoId": "string — identifier of the target CBDO",
  "verifierId": "string — DID of the requesting verifier",
  "queryType": "string — must match an allowedQueries.type in the profile",
  "parameters": "object — query-specific parameters",
  "timestamp": "integer — unix timestamp",
  "nonce": "string — unique per-query value to prevent replay",
  "verifierSignature": "string — signature over query body by verifier DID"
}
```

### 5.2 Validation Steps

The QueryValidator MUST perform all of the following checks in order, halting and returning a rejection on first failure:

1. **Schema validation** — query object conforms to format above
2. **Profile existence** — a loaded profile exists for the CBDO type
3. **Query type permitted** — `queryType` exists in `profile.allowedQueries`
4. **Parameter validation** — all `parameters` conform to the query type's parameter schema
5. **Timestamp freshness** — `timestamp` is within ±300 seconds of current time
6. **Nonce uniqueness** — `nonce` has not been seen before (replay prevention)
7. **Verifier signature** — `verifierSignature` is valid for the verifier's DID
8. **Verifier authorization** — verifier is permitted to query this CBDO type per profile rules

### 5.3 Rejection Response Format

```json
{
  "status": "REJECTED",
  "queryId": "string",
  "reason": "string — SCHEMA_INVALID | TYPE_NOT_PERMITTED | PARAM_INVALID | TIMESTAMP_STALE | NONCE_REPLAY | SIGNATURE_INVALID | VERIFIER_NOT_AUTHORIZED",
  "timestamp": "integer"
}
```

Rejection responses MUST NOT include any credential data or internal state.

---

## 6. Consent State Machine

### 6.1 Consent States

Each (CBDO, verifier, queryType) triple exists in exactly one of the following states:

```
UNKNOWN     → No consent record exists
PENDING     → Consent requested, awaiting user action  
GRANTED     → Consent active and within expiry window
DENIED      → User has explicitly denied consent
EXPIRED     → Previously granted consent has passed expiry
REVOKED     → User has explicitly revoked previously granted consent
```

### 6.2 State Transitions

```
UNKNOWN   → PENDING   : verifier submits query (if requireExplicitConsent = true)
UNKNOWN   → GRANTED   : auto-grant (if defaultConsent = true)
PENDING   → GRANTED   : user approves consent request
PENDING   → DENIED    : user denies consent request
GRANTED   → EXPIRED   : consentExpiry duration elapsed
GRANTED   → REVOKED   : user revokes consent
EXPIRED   → PENDING   : verifier resubmits query (if renewalPolicy = prompt)
EXPIRED   → GRANTED   : auto-renew (if renewalPolicy = automatic)
DENIED    → PENDING   : verifier submits new request after cooling-off period
REVOKED   → PENDING   : verifier submits new request (explicit user re-consent required)
```

### 6.3 Consent Evaluation

The ConsentEngine MUST evaluate consent before any credential data is accessed. A query MUST be rejected if consent state is any value other than `GRANTED`.

### 6.4 Consent Record Format

```json
{
  "cbdoId": "string",
  "verifierId": "string",
  "queryType": "string",
  "state": "string — see 6.1",
  "grantedAt": "integer — unix timestamp, null if not yet granted",
  "expiresAt": "integer — unix timestamp, null if no expiry",
  "grantedBy": "string — user DID",
  "history": [
    {
      "transition": "string — FROM_STATE→TO_STATE",
      "timestamp": "integer",
      "actor": "string — user | system",
      "reason": "string — optional"
    }
  ]
}
```

---

## 7. Response Minimization

### 7.1 Minimization Rules

The ResponseMinimizer MUST apply all of the following transformations to every response before it leaves the engine:

1. **Field whitelist** — only fields listed in `allowedResponseFields` for the query type may be present
2. **Prohibited field removal** — any field in `dataMinimization.prohibitedFields` MUST be removed even if it somehow appears
3. **Raw value suppression** — for boolean response types, the underlying field value MUST NOT appear in any form, including derived forms (e.g. an age value must not appear even if the query was a threshold check)
4. **Metadata stripping** — internal processing metadata must not appear in the response
5. **Field count enforcement** — response object MUST contain no more than `maxResponseFields` fields

### 7.2 Standard Response Format

```json
{
  "status": "OK",
  "queryId": "string",
  "cbdoId": "string",  
  "result": "value — type per profile (boolean for AgePass)",
  "proof": "string — cryptographic proof object (see Section 8)",
  "issuerId": "string — DID of issuing Trust Authority",
  "profileId": "string",
  "timestamp": "integer",
  "auditRef": "string — reference to audit log entry"
}
```

Note: `result` for a boolean query type is ONLY `true` or `false`. No other value, field, or metadata that could reveal the underlying data may be present.

---

## 8. Proof Generation Interface

### 8.1 Design Principle

The ProofGenerator is defined as an interface with a stable API. The cryptographic implementation behind the interface is intentionally external — it MUST be provided by an audited, peer-reviewed library. This document specifies the interface contract, not the implementation.

### 8.2 Interface Contract

```typescript
interface ProofGenerator {
  /**
   * Generate a proof that a boolean result was correctly derived
   * from a signed credential without revealing the underlying field value.
   *
   * @param credential - The signed W3C Verifiable Credential
   * @param queryType - The type of query being proven
   * @param parameters - The query parameters (e.g. threshold value)
   * @param result - The boolean result to prove
   * @param holderDID - The DID of the credential holder
   * @returns A serialized proof object
   */
  generateProof(
    credential: VerifiableCredential,
    queryType: string,
    parameters: Record<string, unknown>,
    result: boolean,
    holderDID: string
  ): Promise<string>;

  /**
   * Verify a proof independently, without access to the original credential.
   * This is the function called by verifiers.
   */
  verifyProof(
    proof: string,
    queryType: string,
    parameters: Record<string, unknown>,
    result: boolean,
    issuerDID: string
  ): Promise<boolean>;
}
```

### 8.3 Required Cryptographic Properties

Any implementation of the ProofGenerator interface MUST satisfy:

- **Soundness** — it is computationally infeasible to generate a valid proof for an incorrect result
- **Zero-knowledge** — the proof reveals no information about the underlying credential field beyond what is encoded in the result itself
- **Unlinkability** — two proofs derived from the same credential MUST be unlinkable to each other (prevents correlation)
- **Issuer non-involvement** — proof generation and verification MUST NOT require interaction with the issuing Trust Authority

### 8.4 Recommended Implementation Libraries

- BBS+ selective disclosure: `@mattrglobal/bbs-signatures` or W3C Data Integrity BBS cryptosuite
- ZKP range proofs: `noble-curves` with Bulletproofs, or `snarkjs` for Groth16 circuits
- DID resolution: `did-resolver` with appropriate method drivers

**Note:** The choice of specific ZKP scheme for range proofs (e.g. "is date of birth before 2008-04-03?") requires cryptographic expert review before production use. The stub implementation in the reference code uses a placeholder that MUST be replaced before any production deployment.

---

## 9. Audit Logger

### 9.1 Design Requirements

The audit log MUST be:
- **Append-only** — entries cannot be modified or deleted
- **Tamper-evident** — any modification to any entry must be detectable
- **Complete** — every engine event (queries, rejections, consent changes, overrides) must be logged
- **Opaque to verifiers** — verifiers receive only an `auditRef` token, not the log entry contents

### 9.2 Log Entry Format

```json
{
  "entryId": "string — UUID",
  "previousHash": "string — SHA-256 of previous entry, null for genesis",
  "timestamp": "integer — unix timestamp milliseconds",
  "eventType": "string — QUERY_RECEIVED | QUERY_REJECTED | QUERY_PROCESSED | CONSENT_CHANGED | OVERRIDE_INITIATED | OVERRIDE_COMPLETED | OVERRIDE_REJECTED",
  "cbdoId": "string",
  "verifierId": "string — null for system events",
  "queryId": "string — null for non-query events",
  "outcome": "string — SUCCESS | REJECTED | ERROR",
  "reason": "string — populated for rejections",
  "entryHash": "string — SHA-256 of this entry excluding entryHash field"
}
```

### 9.3 Chain Integrity

Each entry's `entryHash` is computed as:

```
SHA-256(entryId + previousHash + timestamp + eventType + cbdoId + outcome)
```

The log is valid if and only if for every entry N, `entry[N].previousHash === entry[N-1].entryHash`.

### 9.4 Override Events

Override events are logged with additional fields and MUST include the identity of all parties who contributed key shares. Override log entries are immutable and MAY be exported to external audit authorities per the profile's `overridePolicy.auditRequirements`.

---

## 10. Controlled Override Protocol

### 10.1 Overview

Raw CBDO contents may be accessed under lawful authority through a threshold cryptography scheme. This section specifies the protocol. It does NOT specify the threshold key generation ceremony, which is a Trust Authority operational procedure.

### 10.2 Override Request Format

```json
{
  "overrideId": "string — UUID",
  "cbdoId": "string",
  "requestingAuthority": "string — DID of requesting authority (e.g. court)",
  "legalBasis": "string — jurisdiction-specific legal reference",
  "authorizedBy": "string — reference to warrant or legal order",
  "requestTimestamp": "integer",
  "requestSignature": "string — signed by requestingAuthority DID",
  "expiresAt": "integer — override authorization window"
}
```

### 10.3 Override Processing

1. Override request received and signature verified
2. Override logged as `OVERRIDE_INITIATED`
3. Each key share holder independently verifies the override request and legal basis
4. Key share holders submit their shares within the authorization window
5. When `threshold` shares received, decryption proceeds
6. Raw contents provided ONLY to the requesting authority
7. Override logged as `OVERRIDE_COMPLETED` with all participating party DIDs
8. User notified of override event (unless notification is legally prohibited and a court order specifies otherwise)

### 10.4 Override Rejection

An override MUST be rejected if:
- Requesting authority DID is not in `overridePolicy.authorizedParties`
- Legal basis cannot be verified
- Fewer than `threshold` shares submitted before expiry
- Override authorization window has elapsed

---

## 11. AgePass Profile — v1.0

The AgePass profile is the reference implementation of the CBDO profile format.

```json
{
  "id": "agepass-v1",
  "version": "1.0.0",
  "name": "AgePass",
  "description": "Privacy-preserving age verification. Returns a boolean answer to age threshold queries without disclosing date of birth or any other personal data.",
  "allowedQueries": [
    {
      "type": "AGE_THRESHOLD",
      "description": "Is the credential holder above a specified age threshold?",
      "parameters": [
        {
          "name": "threshold",
          "type": "integer",
          "required": true,
          "constraints": {
            "minimum": 13,
            "maximum": 25
          }
        }
      ],
      "responseType": "boolean",
      "allowedResponseFields": ["result", "proof", "issuerId", "profileId", "timestamp", "auditRef"],
      "credentialFields": ["dateOfBirth"]
    }
  ],
  "consentRules": {
    "requireExplicitConsent": true,
    "defaultConsent": false,
    "consentExpiry": 86400,
    "renewalPolicy": "prompt",
    "scopeGranularity": "queryType"
  },
  "dataMinimization": {
    "maxResponseFields": 6,
    "prohibitedFields": ["dateOfBirth", "age", "birthYear", "birthMonth", "birthDay"],
    "proofRequired": true
  },
  "overridePolicy": {
    "overridePermitted": true,
    "threshold": 2,
    "totalParties": 3,
    "authorizedParties": [
      { "role": "KEY_CUSTODIAN", "did": "did:example:key-custodian" },
      { "role": "ISSUING_TA", "did": "did:example:issuing-ta" },
      { "role": "LEGAL_COMPLIANCE", "did": "did:example:legal-compliance" }
    ]
  }
}
```

---

## 12. Security Considerations

### 12.1 Replay Attack Prevention

The `nonce` field in every query MUST be stored and checked for uniqueness within a rolling window of at least 24 hours. Queries with duplicate nonces MUST be rejected.

### 12.2 Timing Attacks

Response times for REJECTED queries MUST be indistinguishable from response times for valid queries. Implementations MUST pad rejection responses to a consistent time to prevent timing-based inference about rejection reasons.

### 12.3 Proof Malleability

Implementations MUST verify that proofs are not malleable — that an attacker cannot transform a valid proof for `result: true` into a valid proof for `result: false` or vice versa.

### 12.4 Audit Log Integrity

The audit log MUST be stored separately from the credential store and the engine state. Compromise of the credential store MUST NOT compromise audit log integrity.

### 12.5 Known Limitations of This Specification

- The ZKP scheme for range proofs is not yet specified at the circuit level. This is intentional — it requires cryptographic expert selection and peer review before specification.
- The threshold key generation ceremony is not specified here and requires a separate operational security document.
- Multi-device synchronization of consent state is not addressed in v0.1.

---

## 13. Open Questions for Community Review

The following items are explicitly flagged for community input:

1. **ZKP scheme selection** — Bulletproofs vs. Groth16 vs. PLONK for range proofs. Tradeoffs between proof size, generation time, and trusted setup requirements.
2. **Nonce storage** — Appropriate backing store for nonce uniqueness enforcement at scale.
3. **Consent synchronization** — Protocol for syncing consent state across a user's multiple devices.
4. **TA discovery** — Mechanism for verifiers to discover and resolve Trust Authority DIDs.
5. **Profile versioning** — Migration protocol when a profile version is superseded.

---

## Appendix A: Relationship to W3C Verifiable Credentials

CBDOs are built on and fully compatible with the W3C Verifiable Credentials Data Model v2.0 (May 2025 Recommendation). A CBDO credential is a valid W3C VC. The Core Engine adds an active execution layer on top of the VC model — it does not replace or modify the underlying credential format.

## Appendix B: Relationship to Solid/Inrupt

The Solid project addresses data storage sovereignty — users own their data pods. CBDOs address disclosure minimization — verifiers never receive raw data. These are complementary layers. A CBDO may be stored within a Solid pod. The Core Engine's query-response model provides capabilities that Solid's access-control model does not address.

## Appendix C: Prior Art Disclosure

This specification and all concepts herein are published as prior art under CC0 1.0. The original conceptual white paper "A Privacy-First Architecture for Verifiable Digital Truth" by William Brian Williams (Applicert, 2026) is the originating document. Publication timestamp: April 2026.

---

*© 2026 William Brian Williams / Applicert. Released under CC0 1.0 Universal.*  
*This document may be freely copied, modified, and used without restriction.*
