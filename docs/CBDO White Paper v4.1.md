# **Consent-Based Data Objects (CBDOs)**

*A Privacy-First Architecture for Verifiable Digital Truth*

# **Abstract**

Modern digital systems are built on a flawed assumption: that trust requires exposing raw data. This has produced systemic failures – data breaches, over-collection, regulatory burden, and user distrust.

Consent-Based Data Objects (CBDOs) offer a different model. Built on emerging standards such as W3C Verifiable Credentials, CBDOs extend them into a complete interaction and governance model. Rather than sharing data, CBDOs allow systems to ask questions of data and receive verifiable answers – without exposing the underlying information. This enables privacy-preserving verification, user ownership, and controlled disclosure, while satisfying real-world requirements such as legal access and fraud detection.

In 2026, with age-verification mandates accelerating globally (including Australia’s enforcement starting March 9 for porn, R-rated games, AI chatbots and more), the need for such an architecture has become urgent. **AgePass** – the first specialized CBDO profile – directly addresses this regulatory pressure while preserving adult privacy.

*CBDOs represent a foundational shift: from data exchange to truth verification.*

---

# **1\. Introduction**

## **1.1 The Problem**

Today's digital ecosystem routinely over-shares. Simple verification tasks require full data disclosure. Trust is anchored in documents, not proofs. Sensitive information is stored centrally and replicated widely.

The consequences are concrete:

* Age verification requires sharing a full date of birth

* Hiring decisions rely on unverifiable, self-reported resumes

* Medical systems demand broad data access to answer narrow questions

The result: excessive exposure, larger attack surfaces, inefficient verification, and compounding regulatory complexity. In March 2026, these issues are particularly acute as platforms scramble to comply with new age-assurance rules that risk creating fresh data honeypots and privacy backlash.

## **1.2 The Opportunity**

What if systems could verify claims without seeing raw data – asking only what they need, and trusting the answer without requiring full disclosure?

*CBDOs enable exactly that.*

---

# **2\. Definition of CBDO**

A Consent-Based Data Object (CBDO) is a:

*Secure, user-owned, query-responsive data container that provides verifiable answers about its contents without exposing the underlying data.*

Key characteristics:

* Data remains private and encrypted

* External systems interact via queries, not direct access

* Responses are minimized and cryptographically provable

* Access is governed by defined rules and user consent

---

# **3\. Conceptual Model**

## **3.1 The Safety Deposit Box Analogy**

A CBDO can be understood as a digital safety deposit box: the user holds the key, the contents may include sensitive or regulated data, and external parties cannot open the box directly – they may only ask specific questions and receive constrained, verified answers. Under defined conditions (e.g., a legal warrant), authorized entities may access the contents.

*CBDOs are private by default, inspectable by exception.*

---

# **4\. Architecture**

A CBDO consists of three primary layers that enforce strict separation between data storage, policy definition, and execution logic.

*Figure 1 – CBDO Internal Architecture*
*![CBDO_Internal_Architecture](./images/CBDO_Internal_Architecture.png)*

## **4.1 Data Layer (Encrypted Payload)**

Stores raw user data – fully encrypted at rest and in transit. Never directly exposed during standard operations.

*Examples: date of birth, medical records, employment history.*

## **4.2 Profile Layer (Schema / Contract)**

Defines the rules governing each CBDO: allowed queries, permissible responses, disclosure limits, and proof requirements. Each profile specifies what can be queried, what can be answered, and under what conditions.

## **4.3 Core Engine (Execution Layer)**

Handles all interactions: query validation, consent enforcement, rule application, data minimization, proof generation, and audit logging. This layer transforms CBDOs from static containers into active verification systems.

---

# **5\. Operational Flow**

*Figure 2 – CBDO Query Processing Flow*
*![CBDO_Query_Processing_Flow](./images/CBDO_Query_Processing_Flow.png)*

This flow represents the standard interaction pattern for all CBDO queries, regardless of profile type:

1. External system submits a query (e.g., "Is this user over 21?")

2. CBDO validates the request against its profile

3. Consent rules are evaluated

4. Data is processed internally

5. A minimal, verifiable response is returned – no raw data disclosed

---

# **6\. Core Principles**

## **6.1 Data Minimization**

Only the necessary answer is shared – never the full dataset.  

## **6.2 Query-Based Interaction**

Systems do not access data directly; they query it. This keeps the data layer isolated from external parties at all times.

## **6.3 User Ownership**

Users control access permissions, consent policies, and disclosure rules. No query proceeds without passing user-defined consent checks.

## **6.4 Schema Enforcement**

Profiles prevent arbitrary data requests, scope creep, and information leakage. The profile is a binding contract, not a suggestion.

## **6.5 Verifiability**

All responses are cryptographically provable and auditable. Trust does not depend on the honesty of any single party.

## **6.6 Controlled Override**

CBDOs support lawful and emergency access – legal warrants, medical emergencies, fraud investigations – under strict, auditable conditions. This ensures real-world regulatory alignment without weakening everyday privacy guarantees.

---

# **7\. Standardized CBDO Profiles**

Profiles define domain-specific implementations of the CBDO model. 

*Figure 3 – CBDO Profile Interaction Model*
*![CBDO_Profile_Interaction_Model](./images/CBDO_Profile_Interaction_Model.png)*

## **7.1 AgePass**

Purpose: Age verification without revealing date of birth– directly addressing 2026 mandates in Australia (effective March 9 for adult content, R-rated games, AI systems, etc.), the UK Online Safety Act, EU DSA guidelines, and multiple US state laws.

*Queries: “Over 18?” / “Over 21?” → Output: Boolean \+ verifiable proof.*   
*No date of birth or other personal data disclosed*

AgePass demonstrates how CBDOs can help platforms comply with child-safety regulations while avoiding the privacy pitfalls of repeated ID uploads, facial scans, or centralized data collection.

## **7.2 MedPass**

Purpose: Controlled medical data disclosure with pre-consented sharing and emergency override capability.

*Example queries: "Known allergies?" / "Current medications?"*

## **7.3 VotePass**

Purpose: Secure voting verification – eligibility confirmation, duplicate vote prevention, and privacy-preserving participation tracking. Override available for fraud investigation under audit conditions.

*Example queries: "Eligible to vote?" / “Registered?” / "Resident of which Precinct?"*

## **7.4 CareerPass**

Purpose: Professional credential verification. Enables query-based verification for hiring systems. 

*Example queries: "Was this role held?" / "Is this certification valid?"*

## **7.5 Competitive Landscape and Differentiation**

Numerous reusable age-assurance pilots and commercial offerings have emerged by early 2026, including Yoti Keys (passkey-based anonymous tokens), AgeAware from the euCONSENT consortium (interoperable cryptographic tokens), Ondato OnAge, OpenAge AgeKeys, and various biometric or estimation-based solutions. Many leverage wallet concepts or selective disclosure and are actively trialed in Australia, the UK, and EU contexts to address the same regulatory wave.

CBDOs do not duplicate these efforts. Instead, they provide a cohesive, enforceable architecture built directly on W3C Verifiable Credentials 2.0 and BBS+ as the cryptographic backbone. What sets CBDOs apart is an active Core Engine that transforms static credentials into policy-enforced, query-responsive systems: every interaction is validated against a strict profile, user consent is programmatically enforced, responses are strictly minimized, and every action is auditable by design.

Most importantly, CBDOs incorporate a governed threshold-cryptography override for lawful and emergency access that is cryptographically prevented from unilateral abuse – a critical real-world requirement that many token-based pilots address only through policy or third-party trust. By adding these governance, consent, and exception layers on top of existing standards and pilots, CBDOs (starting with AgePass) deliver stronger privacy guarantees, better regulatory alignment, and true user ownership at scale, rather than simply moving the trust boundary to a new intermediary network.

---

# **8\. Paradigm Shift**

CBDOs reorient every layer of the data interaction model:

| Old Model | CBDO Model |
| :---- | :---- |
| Share data | **Answer questions** |
| Trust documents | **Verify proofs** |
| Over-disclosure | **Minimal disclosure** |
| Centralized storage | **User-owned objects** |

---

# **9\. Trust Authorities and Governance Model**

CBDOs introduce a new institutional responsibility: the ability to attest to truth, enforce its usage, and authorize its disclosure – without ever exposing raw data. This responsibility is fulfilled by Trust Authorities (TAs).

## **9.1 Definition**

A Trust Authority is an organization or system responsible for verifying real-world data, attesting to its accuracy, issuing signed CBDOs, and enforcing policy constraints on their usage. Trust Authorities function as the root of trust within the CBDO ecosystem.

## **9.2 Role: From Data Holders to Truth Attestors**

Rather than storing and sharing raw data, Trust Authorities verify data once, issue cryptographically signed CBDOs, and enable controlled, query-based verification thereafter. The institutional model shifts from custodianship to attestation.

## **9.3 Core Functions**

**Attestation (Issuance Layer)**

Trust Authorities validate real-world claims and bind them to a CBDO – performing identity verification, credential validation, and data authenticity checks. Output: a signed CBDO with cryptographic proof of origin.

Examples: a bank issues an AgePass CBDO; a hospital issues a MedPass CBDO; Applicert issues a professional credential CBDO.

**Policy Governance (Rules Layer)**

Trust Authorities define profile schemas, specify allowable queries, enforce data minimization constraints, and define override conditions. These rules are encoded into CBDO profiles and enforced automatically by the Core Engine.

**Authorization (Exception Layer)**

Under exceptional conditions – courts issuing digitally signed warrants, emergency systems authorizing medical access, regulators initiating audits – Trust Authorities manage controlled access.

*Humans authorize access. Systems execute it. All overrides are logged, verifiable, and restricted by policy.*

## **9.4 Separation of Roles**

The CBDO model distinguishes between two classes of authority to prevent abuse and ensure scalability:

**Issuers (High Trust Authorities)**

Entities that create and sign CBDOs – banks, hospitals, professional verification platforms, government registries. These entities establish truth and anchor trust.

**Authorizers (Conditional Authorities)**

Entities that enable access under defined conditions – courts, emergency responders, regulatory bodies. These entities do not create or directly access raw data; they authorize constrained access only.

## **9.5 Trust Chain**

*Issuer → CBDO → Query Response → Verifier*

The issuer signs and attests to data. The CBDO enforces rules and generates responses. The verifier validates proofs and signatures – without ever needing to trust the user directly or access raw data.

## **9.6 Institutional Mapping**

Trust Authorities map naturally to existing institutions, enabling CBDO integration rather than wholesale replacement.

| Banking | Identity attestation |
| :---- | :---- |
| **Healthcare** | Medical data authority |
| **Legal System** | Warrant issuance and audit authorization |
| **Employment** | Credential and experience verification |

## **9.7 Accountability**

Trust Authorities are accountable for the accuracy of issued CBDOs, the integrity of their signing keys, and the enforcement of policy rules. All actions are logged, auditable, and cryptographically verifiable.

*Trust is measurable, not assumed.*

Over time, Trust Authorities are expected to evolve into a federated ecosystem of interoperable attestors – a distributed trust network rather than any single centralized authority.

---

# **10\. Applicert: A Practical Implementation Path**

## **10.1 Current State of Professional Verification**

Hiring today relies on self-reported resumes, weak verification signals, and time-intensive manual validation. The result is fraud, inefficiency, and misplaced trust in credentials that cannot be confirmed quickly or reliably.

## **10.2 CBDO Integration**

Applicert represents a practical initial implementation of a Trust Authority within the CBDO ecosystem, and CareerPass (defined in Section 7.4) is its first CBDO profile. As a professional verification platform, Applicert:

* Attests to employment and credential claims

* Issues signed CBDO-based professional profiles (CareerPass)

* Enables query-based verification for hiring systems

In this role, Applicert functions simultaneously as a CBDO issuer, a verification authority, and a profile standard creator – with CareerPass as the reference implementation of that model.

CareerPass in practice – an employer queries:

* "Was this role held?"  →  Verified. No raw employment record disclosed.

* "Is this certification valid?"  →  Verified. No transcript or credential file disclosed.

## **10.3 Outcomes**

* Faster, more confident hiring decisions

* Significant reduction in credential fraud

* Improved fairness – verification based on proof, not presentation

* A trusted, scalable signal in the hiring market

## **10.4 Standards Alignment and Foundations**

CBDOs are deliberately designed to build upon mature, open standards rather than replace them. In particular, they leverage the **W3C Verifiable Credentials Data Model v2.0** (Recommendation, May 2025\) as the foundational backbone for the Data Layer, Profile/Schema Layer, and core Verifiability mechanisms.

Combined with the W3C Data Integrity BBS+ cryptosuite for selective disclosure, CBDOs inherit strong interoperability, existing wallet support, and proven cryptographic tooling. The CBDO **Core Engine** then adds the missing active layers: strict query-based interaction, enforceable consent rules, data-minimization guarantees, comprehensive audit logging, and a governed threshold-cryptography override for lawful access.

This approach positions CBDOs as a natural evolution of ongoing pilots (including reusable age tokens and EU “mini-wallet” efforts) while addressing real-world gaps in consent governance and controlled exceptions. Decentralized Identifiers (DIDs) are expected to serve as the recommended mechanism for user-controlled key management and wallet interoperability; further architectural details in this area will incorporate expert review.

---

# **11\. Cryptographic Foundations**

CBDOs are built on well-established cryptographic techniques used in modern security infrastructure – including secure web browsing (TLS), digital identity frameworks, and government-grade authentication systems. This section explains how these techniques work together in the CBDO model.

*Figure 4 – CBDO Cryptographic Verification Flow*
*![CBDO_Cryptographic_Verification_Flow](./images/CBDO_Cryptographic_Verification_Flow.png)*
*This diagram illustrates how CBDOs combine selective disclosure (BBS+), zero-knowledge proofs, and threshold cryptography to enable verifiable answers without exposing underlying data.*

## **11.1 The Core Problem CBDOs Solve Cryptographically**

Traditional data systems prove a claim by showing the underlying data. A bar shows your full ID to confirm you are over 21\. A hospital shares your entire record to confirm a single allergy.

CBDOs separate the claim from the data that supports it. Cryptography is what makes this separation trustworthy – so that a verified YES carries the same legal and practical weight as seeing the raw data directly.

## **11.2 Selective Disclosure via BBS+ Signatures**

CBDOs use a cryptographic scheme called BBS+ signatures – a standard developed and maintained by the World Wide Web Consortium (W3C) and already in use in decentralized digital identity systems globally.

BBS+ allows an issuer (a Trust Authority) to sign a full data record – a credential containing name, date of birth, address, and employment history – in such a way that the holder can later prove individual fields from that record without revealing the rest. Crucially, the verifier can confirm the proof is valid without seeing the hidden fields and without contacting the original issuer.

*This is what enables queries like "Is this person over 21?" to return*   
*a cryptographically verifiable YES – with no date of birth disclosed.*

## **11.3 Zero-Knowledge Proofs for Query Responses**

For query responses that go beyond simple field disclosure – proving that a value falls within a range, or that two credentials are held by the same person – CBDOs are designed to support zero-knowledge proofs (ZKPs).

A zero-knowledge proof allows one party to prove that a statement is true without revealing why it is true or what data supports it. The mathematics underlying ZKPs are well-established and peer-reviewed; they are used today in financial privacy systems, government identity programs, and blockchain networks.

In the CBDO model, ZKPs allow the Core Engine to answer queries like "Is this person's credit score above 700?" with a verifiable YES – without exposing the actual score, the underlying financial data, or any other information.

ZKP integration is built into the CBDO architecture from the outset, ensuring that as implementations mature, stronger privacy guarantees can be adopted without redesigning the system.

## **11.4 The Chain of Trust**

Every CBDO carries a chain of cryptographic signatures:

* The Trust Authority signs the original data at issuance, attesting to its accuracy

* The CBDO holds that signature as proof of legitimacy

* When a query is answered, the response carries a proof that it was derived from that signed data

A verifier – an employer, a healthcare provider, a government system – does not need to trust the user directly. They trust the mathematics and the issuing authority. Forging or altering any link in this chain is computationally infeasible under current cryptographic standards.

## **11.5 Key Management and User Ownership**

Each CBDO is associated with a cryptographic key pair – a private key controlled by the user, and a public key used by verifiers. The private key is required to authorize queries and consent to disclosure.

Key management is one of the genuine practical challenges of user-controlled cryptography, and CBDOs address this honestly: recovery mechanisms exist, but they involve defined, auditable processes rather than silent third-party access. Implementations may support recovery through trusted contacts, institutional key custodians, or hardware security devices – each with explicit tradeoffs between user sovereignty and recoverability that are disclosed at onboarding.

## **11.6 Controlled Override: How Privacy and Legal Access Coexist**

CBDOs are private by default, but they are not designed to be beyond the reach of legitimate legal authority. These two goals are made compatible through threshold cryptography.

Under this model, no single party – not the user, not Applicert, not any Trust Authority – holds a complete decryption key. Access to raw CBDO contents under a legal warrant requires the cooperation of multiple independent authorized parties (for example, the user's key custodian, the issuing Trust Authority, and a designated legal compliance authority). Each cooperation event is cryptographically logged and independently verifiable.

This design ensures:

* Unauthorized unilateral access is cryptographically prevented – not merely prohibited by policy, but cryptographically prevented

* Lawful access is possible but requires documented, auditable multi-party cooperation

* The existence of an override mechanism does not weaken everyday privacy guarantees

## **11.7 Audit Integrity**

Every CBDO interaction generates an audit record stored in a cryptographically append-only log – meaning entries can be added but not altered or deleted without detection. This is the same structure used in certificate transparency systems that underpin secure web browsing.

This allows regulators, users, and auditors to verify the complete history of a CBDO's usage – including any override events – without relying on any single party's honesty.

---

# **12\. Future Implications**

The CBDO model extends well beyond its initial applications. As Trust Authority networks mature and cryptographic tooling (built on W3C VCs and related standards) becomes more accessible, CBDOs provide the underlying infrastructure for identity systems, healthcare interoperability, financial verification, governance, and more.

*CBDOs form the basis for a universal trust layer for digital interactions.*

---

# **13\. Conclusion**

CBDOs redefine how data functions in digital systems. The shift is not incremental – it is architectural. Data stops being a thing that moves between parties and becomes something that answers questions in place.

In doing so, CBDOs enable privacy, security, efficiency, and verifiable trust to coexist at scale – across industries, jurisdictions, and use cases.

---

# **14\. Final Statement**

*CBDOs are not files. They are interactive, rule-bound truth systems.*

As such, they represent not just a product innovation, but a protocol-level evolution of digital trust infrastructure – one built to meet the demands of a world that can no longer afford to equate access with trust.

This whitepaper is accompanied by a reference implementation: [https://github.com/applicert/cbdo-core-engine](https://github.com/applicert/cbdo-core-engine) 

---

# **Attribution and Licensing**

This work is released under CC0 1.0 Universal (Public Domain Dedication).

To the extent possible under law, the author has waived all copyright and related or neighboring rights to this work.

Attribution is not required, but is appreciated. If you reference or build upon this work, please consider citing:

"Consent-Based Data Objects (CBDOs), William Brian Williams / Applicert, 2026"

© 2026 William Brian Williams / Applicert
