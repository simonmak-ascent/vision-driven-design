export { PHASES } from './engine.js';
export { normalizeDomain } from './normalize-domain.js';
export type { NormalizedUrl, NormalizeError } from './normalize-domain.js';
export { inferSchema } from './infer-schema.js';
export { generateBackend } from './generate-backend.js';
export { emitTools } from './emit-tools.js';
export { capture, staticCapture } from './capture.js';
export { recordEvidence } from './evidence.js';
export { crawlSite } from './crawl.js';
export { probeCms } from './probe-cms.js';
export { generateManifest } from './generate-manifest.js';
export { runClone } from './clone-pipeline.js';
export type {
  EvidenceBundle, EvidenceRecord, InferredModel, InferredEntity, InferredField,
  InferredRelationship, CaptureBundle, GeneratedBackend, Migration, RouteSpec, ToolManifest,
  CrawledPage, SiteDataset, PageFetcher, CrawlOptions,
  CmsDescriptor, CmsContentType, CmsTaxonomy, I18nLocale, CmsPlatform,
  PayloadCollection, PayloadField, CloneManifest, DesignSystem, LayoutRegion,
  PageMapEntry, DeployConfig, DonationConfig,
  FontFaceRef, RegionName, RegionCapture, LayoutMetrics,
} from './clone-types.js';
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
