export { PHASES, isValidFeatureName } from './engine.js';
export { allowedProjectRoots, isProjectRootAllowed, projectRootError } from './project-root.js';
export { VddContext, VddOutput, VddPhaseInput, VddMode, Constitution } from './types.js';
export { Coverage, CheckResult, ImpactedArtifact } from './types.js';
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
export type { VddPhaseFn } from './types.js';
export {
  PHASE_NAMES,
  PHASE_META,
  PARAM_RELATIONSHIP_NOTES,
  TOOL_REQUIREMENTS,
  TOOL_KEYS,
  RESEARCH_SUBAGENTS,
  DOMAIN_PRIMERS,
  detectEnvironment,
  domainPrimersForTargets,
} from './meta.js';
export type {
  PhaseName,
  PhaseMeta,
  ToolRequirements,
  ResearchSubagent,
  DomainPrimer,
  EnvironmentReport,
} from './meta.js';
