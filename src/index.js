/**
 * @applicert/cbdo-core-engine
 *
 * CBDO Core Engine — query-responsive verifiable credential execution layer
 *
 * The Core Engine is the active enforcement layer that transforms static
 * W3C Verifiable Credentials into policy-enforced, query-responsive
 * verification systems. Verifiers submit structured questions; the engine
 * evaluates them internally and returns minimized, cryptographically
 * provable answers. Credential data never leaves the engine.
 *
 * Quick start:
 *
 *   import { CoreEngine } from '@applicert/cbdo-core-engine';
 *   import agePpassProfile from './profiles/agepass-v1.json' assert { type: 'json' };
 *
 *   const engine = new CoreEngine();
 *   engine.loadProfile(agePassProfile);
 *
 *   // Grant consent, then process a query
 *   engine.grantConsent(cbdoId, verifierId, 'AGE_THRESHOLD', userDID, 'agepass-v1');
 *   const response = await engine.processQuery(query, 'agepass-v1', credential, userDID);
 *
 * See /demo/agepass-demo.js for a complete working example.
 * See /spec/CBDO-Core-Engine-Spec-v0.1.md for the full specification.
 */

export { CoreEngine } from './engine/CoreEngine.js';
export { ProfileLoader, ProfileValidationError } from './engine/ProfileLoader.js';
export { QueryValidator } from './engine/QueryValidator.js';
export { ConsentEngine, ConsentState, ConsentError } from './engine/ConsentEngine.js';
export { ResponseMinimizer, MinimizationError } from './engine/ResponseMinimizer.js';
export { ProofGenerator } from './engine/ProofGenerator.js';
export { AuditLogger, EventType } from './engine/AuditLogger.js';
