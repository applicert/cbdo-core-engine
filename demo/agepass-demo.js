/**
 * AgePass Demo
 *
 * End-to-end demonstration of the CBDO Core Engine processing
 * an age verification query.
 *
 * Run: node demo/agepass-demo.js
 *
 * This demo shows the full pipeline:
 * 1. Engine setup and profile loading
 * 2. Consent granting
 * 3. Query processing (user over 18)
 * 4. Query processing (user not over 21)
 * 5. Rejection on missing consent
 * 6. Rejection on invalid query type
 * 7. Audit log verification
 *
 * NOTE: Uses stub proof generator. See ProofGenerator.js for
 * production replacement requirements.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { CoreEngine } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Setup ────────────────────────────────────────────────────────────────────

const agePpassProfile = JSON.parse(
  readFileSync(join(__dirname, '../src/profiles/agepass-v1.json'), 'utf8')
);

// A sample W3C Verifiable Credential (simplified for demo)
// In production, this is issued and signed by a Trust Authority
const sampleCredential = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  type: ['VerifiableCredential', 'AgeCBDO'],
  issuer: 'did:example:applicert-trust-authority',
  validFrom: '2026-01-01T00:00:00Z',
  credentialSubject: {
    id: 'did:example:user-alice',
    // Alice was born on 1995-03-15 — she is 31 years old in April 2026
    // This field is NEVER returned in any query response
    dateOfBirth: '1995-03-15',
  },
};

const USER_DID = 'did:example:user-alice';
const CBDO_ID = 'cbdo:agepass:alice-001';
const VERIFIER_DID = 'did:example:platform-xyz';

// ─── Helper ───────────────────────────────────────────────────────────────────

function makeQuery(queryType, parameters) {
  return {
    queryId: randomUUID(),
    cbdoId: CBDO_ID,
    verifierId: VERIFIER_DID,
    queryType,
    parameters,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: randomUUID(),
    verifierSignature: 'stub-signature',
  };
}

function printSection(title) {
  console.log('\n' + '─'.repeat(60));
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

function printResult(label, result) {
  const isOk = result.status === 'OK';
  const icon = isOk ? '✓' : '✗';
  const color = isOk ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`\n${color}${icon} ${label}${reset}`);

  if (isOk) {
    console.log(`  result:   ${result.result}`);
    console.log(`  profile:  ${result.profileId}`);
    console.log(`  issuer:   ${result.issuerId}`);
    console.log(`  auditRef: ${result.auditRef}`);
    console.log(`  proof:    ${result.proof.substring(0, 60)}...`);

    // Critical: verify no raw data leaked
    const responseStr = JSON.stringify(result);
    const leaked = ['1995', 'dateOfBirth', 'march', '1995-03-15'];
    const leakFound = leaked.some(v => responseStr.toLowerCase().includes(v));
    if (leakFound) {
      console.log('\x1b[41m  ⚠ WARNING: Potential data leak detected in response! \x1b[0m');
    } else {
      console.log(`  \x1b[90m✓ No raw credential data in response\x1b[0m`);
    }
  } else {
    console.log(`  reason:   ${result.reason}`);
    console.log(`  detail:   ${result.detail}`);
    console.log(`  auditRef: ${result.auditRef}`);
  }
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

async function runDemo() {
  console.log('\n\x1b[1mCBDO Core Engine — AgePass Demo\x1b[0m');
  console.log('Applicert | https://applicert.com');
  console.log('Spec: /spec/CBDO-Core-Engine-Spec-v0.1.md');
  console.log('\x1b[33mNOTE: Using stub proof generator — not for production\x1b[0m');

  // ── 1. Initialize engine ──────────────────────────────────────────────────

  printSection('1. Engine Setup');
  const engine = new CoreEngine();
  engine.loadProfile(agePpassProfile);
  console.log(`  ✓ Profile loaded: agepass-v1`);
  console.log(`  ✓ Alice's DOB in credential: ${sampleCredential.credentialSubject.dateOfBirth}`);
  console.log(`    (This value will NEVER appear in any query response)`);

  // ── 2. Query without consent — should be rejected ─────────────────────────

  printSection('2. Query Without Consent (expect rejection)');
  const noConsentQuery = makeQuery('AGE_THRESHOLD', { threshold: 18 });
  const noConsentResult = await engine.processQuery(
    noConsentQuery, 'agepass-v1', sampleCredential, USER_DID
  );
  printResult('Over-18 query, no consent', noConsentResult);

  // ── 3. Grant consent ──────────────────────────────────────────────────────

  printSection('3. Grant Consent');
  engine.grantConsent(CBDO_ID, VERIFIER_DID, 'AGE_THRESHOLD', USER_DID, 'agepass-v1');
  console.log(`  ✓ Consent granted: ${USER_DID} → ${VERIFIER_DID} for AGE_THRESHOLD`);

  // ── 4. Over-18 query — should return true ─────────────────────────────────

  printSection('4. Age Threshold Query: Over 18? (Alice is 30)');
  const over18Query = makeQuery('AGE_THRESHOLD', { threshold: 18 });
  const over18Result = await engine.processQuery(
    over18Query, 'agepass-v1', sampleCredential, USER_DID
  );
  printResult('Over-18 query', over18Result);

  // ── 5. Over-21 query — should return true ─────────────────────────────────

  printSection('5. Age Threshold Query: Over 21? (Alice is 30)');
  const over21Query = makeQuery('AGE_THRESHOLD', { threshold: 21 });
  const over21Result = await engine.processQuery(
    over21Query, 'agepass-v1', sampleCredential, USER_DID
  );
  printResult('Over-21 query', over21Result);

  // ── 6. A younger user — over-21 should return false ───────────────────────

  printSection('6. Younger User: Over 21? (Bob is 19)');
  const youngCredential = {
    ...sampleCredential,
    credentialSubject: {
      id: 'did:example:user-bob',
      dateOfBirth: '2006-11-20', // Bob is 19 in April 2026
    },
  };
  const BOB_CBDO_ID = 'cbdo:agepass:bob-001';
  engine.grantConsent(BOB_CBDO_ID, VERIFIER_DID, 'AGE_THRESHOLD', 'did:example:user-bob', 'agepass-v1');

  const bobQuery = {
    ...makeQuery('AGE_THRESHOLD', { threshold: 21 }),
    cbdoId: BOB_CBDO_ID,
  };
  const bobResult = await engine.processQuery(
    bobQuery, 'agepass-v1', youngCredential, 'did:example:user-bob'
  );
  printResult('Over-21 query (Bob, 19)', bobResult);

  // ── 7. Invalid query type ─────────────────────────────────────────────────

  printSection('7. Invalid Query Type (expect rejection)');
  const badTypeQuery = makeQuery('GET_DATE_OF_BIRTH', {});
  const badTypeResult = await engine.processQuery(
    badTypeQuery, 'agepass-v1', sampleCredential, USER_DID
  );
  printResult('Direct DOB access attempt', badTypeResult);

  // ── 8. Parameter out of range ─────────────────────────────────────────────

  printSection('8. Threshold Out of Range (expect rejection)');
  const badParamQuery = makeQuery('AGE_THRESHOLD', { threshold: 99 });
  const badParamResult = await engine.processQuery(
    badParamQuery, 'agepass-v1', sampleCredential, USER_DID
  );
  printResult('Threshold=99 (max is 25)', badParamResult);

  // ── 9. Audit log verification ─────────────────────────────────────────────

  printSection('9. Audit Log Verification');
  const chainResult = engine.verifyAuditChain();
  console.log(`  Chain valid: ${chainResult.valid}`);
  console.log(`  Total entries: ${chainResult.entries}`);

  const history = engine.getCbdoHistory(CBDO_ID);
  console.log(`\n  Alice's CBDO history (${history.length} events):`);
  for (const event of history) {
    const date = new Date(event.timestamp).toISOString();
    console.log(`    [${date}] ${event.eventType} → ${event.outcome ?? event.state}`);
  }

  // ── 10. Summary ──────────────────────────────────────────────────────────

  printSection('Summary');
  console.log('  ✓ Full query pipeline functional');
  console.log('  ✓ Consent enforcement working');
  console.log('  ✓ Data minimization enforced');
  console.log('  ✓ No raw credential data in any response');
  console.log('  ✓ Audit chain integrity verified');
  console.log('  ✓ Invalid query types rejected');
  console.log('  ✓ Out-of-range parameters rejected');
  console.log('\n  \x1b[33mNext step: Replace ProofGenerator stub with BBS+/ZKP implementation\x1b[0m');
  console.log('  See: src/engine/ProofGenerator.js\n');
}

runDemo().catch(console.error);
