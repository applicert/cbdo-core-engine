# Applicert – VMD Core Engine

> 🚧 Reference implementation of a Verifiable Minimal Disclosure (VMD) system (spec v0.1) – not production-ready
>
> This project was previously developed under the working term "CBDO" (Consent-Based Data Objects).

**Consent-Based Data Object Core Engine** – the active execution layer that transforms W3C Verifiable Credentials into policy-enforced, query-responsive verification systems.

> *Verifiers ask questions. The engine answers them. Credential data never leaves.*

**Author:** William Brian Williams / Applicert  
**License:** Apache 2.0 (code) | CC0 (specification)  
**Status:** v0.1 – Reference Implementation (stub proof generator)  
**Spec:** [/spec/VMD-Core-Engine-Spec-v0.1.md](./spec/VMD-Core-Engine-Spec-v0.1.md)  
**Whitepaper:** [/docs/VMD-Whitepaper-v1.0.pdf](./docs/VMD-Whitepaper-v1.0.pdf)

---

## What This Is

The Core Engine is the middleware between a user's verifiable credential and any external party that wants to ask a question about it.

Instead of exposing a credential field (e.g. date of birth), a verifier submits a structured query (e.g. "is this person over 18?"). The engine evaluates it internally and returns only a minimized, cryptographically provable answer: `true` or `false` + a proof.

The date of birth never appears in any response. Ever.

---

## Why This Exists

Current verification systems require exposing raw data to prove simple claims – creating unnecessary privacy risk, storage liability, and regulatory burden.

The VMD Core Engine demonstrates an alternative model:

- Verifiers receive only the answer they need (e.g. `true/false`)
- Raw credential data never leaves the user's control
- Every interaction is enforced by policy, consent, and cryptographic proof

This repository provides a working reference implementation of that model.

---

## Quick Start

```bash
node demo/agepass-demo.js
```

No dependencies required for the demo – the stub proof generator uses Node's built-in `crypto` module.

---

## Architecture

```
CoreEngine (orchestrator)
├── ProfileLoader     – loads and validates profile schemas
├── QueryValidator    – validates queries before any data access  
├── ConsentEngine     – state machine: UNKNOWN→PENDING→GRANTED/DENIED
├── ResponseMinimizer – strips responses to permitted fields only
├── ProofGenerator    – ⚠ STUB: replace with BBS+/ZKP library
└── AuditLogger       – append-only cryptographically chained log
```

## Processing Pipeline

Every query follows this exact sequence (never skipped or reordered):

1. Receive query
2. Load profile
3. Validate query against profile schema
4. Evaluate consent state
5. Execute query against credential data **internally**
6. Minimize response to permitted fields only
7. Generate cryptographic proof
8. Log to audit trail
9. Return minimized response + proof

Credential data is accessed **only in step 5**. It never appears in output.

---

## Profiles

A profile defines what questions can be asked about a VMD and how answers must be returned. Currently included:

| Profile | File | Status |
|---------|------|--------|
| AgePass v1 | `src/profiles/agepass-v1.json` | ✓ Complete |
| CareerPass v1 | – | Planned |
| MedPass v1 | – | Planned |

---

## Production Readiness

This is a **reference implementation**. The following components require replacement before production deployment:

### ⚠ ProofGenerator (Critical)

`src/engine/ProofGenerator.js` contains a stub that produces non-cryptographic proofs. Replace with:

- **BBS+ selective disclosure**: `@mattrglobal/bbs-signatures` or W3C Data Integrity BBS cryptosuite
- **ZKP range proofs**: `noble-curves` (Bulletproofs) or `snarkjs` (Groth16)

The choice of ZKP scheme requires cryptographic expert review. Do not self-select.

### ⚠ QueryValidator Signature Verification

`src/engine/QueryValidator.js` stubs verifier signature verification. Production requires:
- DID resolution via `did-resolver`
- Verification method extraction from DID documents  
- Signature verification over canonical query body

### ⚠ Nonce Store

Current nonce store is in-memory. Production requires:
- Persistent backing store (Redis recommended)
- TTL-based expiry aligned with 24-hour window

---

## Specification

The full technical specification is at `/spec/VMD-Core-Engine-Spec-v0.1.md`.

It covers:
- Profile definition schema
- Query validation rules
- Consent state machine
- Response minimization rules
- Proof generation interface contract
- Audit log chain structure
- Controlled override protocol
- Security considerations
- Open questions for community review

The specification is released under **CC0 1.0** (public domain) as a prior art disclosure and contribution toward an open Internet Standard.

---

## Contributing

This project is open source. The specification and all concepts are published as prior art under CC0. The code is Apache 2.0.

Contributions especially welcome for:
- ZKP scheme selection and implementation
- DID resolver integration
- Additional profile definitions
- Test suite expansion

---

## Related Standards

- [W3C Verifiable Credentials Data Model v2.0](https://www.w3.org/TR/vc-data-model-2.0/)
- [W3C Data Integrity BBS Cryptosuite](https://www.w3.org/TR/vc-di-bbs/)
- [Decentralized Identifiers (DIDs) v1.0](https://www.w3.org/TR/did-core/)
- [W3C Credentials Community Group](https://www.w3.org/community/credentials/)

---

## License
This project is licensed under the Apache License 2.0.

*© 2026 William Brian Williams / Applicert.*

