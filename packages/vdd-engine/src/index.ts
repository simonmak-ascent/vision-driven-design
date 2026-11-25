export { PHASES, isValidFeatureName } from './engine.js';
export { allowedProjectRoots, isProjectRootAllowed, projectRootError } from './project-root.js';
export { VddContext, VddOutput, VddPhaseInput, VddMode, Constitution } from './types.js';
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
