// The package's public surface: the coverage engine and the result types it
// returns. 2.0.0 has no generators, no phase functions and no project root.
export {
  CHECK_PHASES,
  CHAIN,
  PHASE_CONFIG,
  extractIds,
  extractChildren,
  buildMatrix,
  checkInvariants,
  checkCounts,
  checkCrossKeyActual,
  inferPhase,
  amendImpact,
  opensBlocks,
  runPhaseCheck,
  runChainCheck,
  runAmend,
} from './coverage.js';
export type {
  CheckPhase,
  CountKey,
  PhaseConfig,
  Matrix,
  Child,
  InvariantResult,
  ChainResult,
  ChainPhaseResult,
  AmendResult,
} from './coverage.js';
export { Coverage, CheckResult, ImpactedArtifact } from './types.js';
