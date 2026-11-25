// Shared types for the `-clone` pipeline (A-001 … A-009).

import type { Lookup } from './assert-public-target.js';

export interface NormalizedUrl {
  scheme: 'https' | 'http';
  host: string;
}

export interface NormalizeError {
  code: 'EMPTY_DOMAIN' | 'INVALID_HOST';
  message: string;
}

export interface EvidenceRecord {
  operation: string; // e.g. "GET /api/products"
  method: string;
  url: string;
  samples: unknown[]; // parsed JSON bodies
  sampleCount: number;
}

export interface EvidenceBundle {
  records: EvidenceRecord[];
}

export interface InferredField {
  name: string;
  type: string; // 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'unknown'
  required: boolean;
  confidence: 'high' | 'low';
}

export interface InferredEntity {
  name: string;
  fields: InferredField[];
}

export interface InferredRelationship {
  source: string;
  target: string;
  via: string;
  kind: 'belongsTo' | 'hasMany' | 'manyToMany';
}

export type CmsPlatform = 'wordpress' | 'unknown';

export interface InferredModel {
  platform: CmsPlatform;
  locales: I18nLocale[];
  entities: InferredEntity[];
  relationships: InferredRelationship[];
}

export interface FontFaceRef {
  family: string;
  src: string;
}

export type RegionName = 'nav' | 'header' | 'hero' | 'main' | 'footer';

export interface RegionCapture {
  name: RegionName;
  selector: string;
  html: string;
}

// Key layout dimensions measured from the live page, so the scaffold can pin
// JS-driven sizes (e.g. a logo whose height a page-builder sets at runtime).
export interface LayoutMetrics {
  headerHeight?: number;
  logoHeight?: number;
  headerPosition?: string;
}

export interface CaptureBundle {
  domain: string;
  html: string;
  // Serialized stylesheet rules (all accessible rules + inline <style> blocks),
  // with @media / @supports wrappers preserved — this is what makes the clone
  // actually look like the original, not just share a few CSS variables.
  css: string;
  cssTokens: Record<string, string>;
  fonts: string[];
  fontFaces: FontFaceRef[];
  breakpoints: number[];
  regions: RegionCapture[];
  metrics: LayoutMetrics;
}

export interface Migration {
  entity: string;
  up: string;
  down: string;
}

export interface RouteSpec {
  entity: string;
  method: string;
  path: string;
  summary: string;
}

// --- Backend → Payload CMS ---

export interface PayloadField {
  name: string;
  type:
    | 'text'
    | 'textarea'
    | 'richText'
    | 'number'
    | 'boolean'
    | 'date'
    | 'email'
    | 'select'
    | 'relationship'
    | 'upload'
    | 'array';
  required: boolean;
  localized: boolean;
  relationTo?: string;
  hasMany?: boolean;
  options?: string[];
}

export interface PayloadCollection {
  slug: string;
  label: string;
  localized: boolean;
  useAsTitle: string;
  fields: PayloadField[];
}

export interface GeneratedBackend {
  migrations: Migration[];
  routes: RouteSpec[];
  payloadCollections: PayloadCollection[];
}

export interface ToolManifest {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface CrawledPage {
  url: string;
  path: string;
  title: string;
  description: string;
  lang: string;
  headings: string[];
  paragraphs: string[];
  images: string[];
  links: string[];
}

// --- CMS descriptor (probed over HTTP) ---

export interface I18nLocale {
  code: string; // 'en' | 'tc' | 'sc'
  name: string; // 'EN' | '繁' | '简'
  locale: string; // 'en_US' | 'zh_HK' | 'zh_CN'
  w3c: string; // 'en-US' | 'zh-HK' | 'zh-CN'
  homeUrl: string;
  pageOnFront?: number;
  isDefault: boolean;
}

export interface CmsContentType {
  slug: string;
  name: string;
  restBase: string;
  hierarchical: boolean;
  hasArchive: boolean;
  taxonomies: string[];
}

export interface CmsTaxonomy {
  slug: string;
  name: string;
  restBase: string;
  types: string[];
}

export interface CmsDescriptor {
  platform: CmsPlatform;
  detectedAt: string;
  version?: string;
  name?: string;
  description?: string;
  restBase?: string;
  contentTypes: CmsContentType[];
  taxonomies: CmsTaxonomy[];
  languages: I18nLocale[];
}

export interface SiteDataset {
  root: string;
  crawledAt: string;
  maxPages: number;
  truncated: boolean;
  pages: CrawledPage[];
  cms?: CmsDescriptor;
  /** URLs refused by the SSRF gate (redirect target or sitemap entry), with the reason. */
  refused?: string[];
}

// --- Scaffold manifest (A-008) ---

export interface LayoutRegion {
  name: 'nav' | 'footer' | 'hero';
  selector: string;
  role: string;
}

export interface DesignSystem {
  colors: Record<string, string>;
  // All captured CSS custom properties (spacing, radius, shadow, color, …),
  // not just color tokens — the scaffold re-emits these into :root so the
  // captured CSS resolves var() references correctly.
  tokens: Record<string, string>;
  fonts: string[];
  fontFaces: FontFaceRef[];
  breakpoints: number[];
  layoutRegions: LayoutRegion[];
  css: string;
  regions: RegionCapture[];
  metrics: LayoutMetrics;
}

export interface PageMapEntry {
  path: string;
  title: string;
  lang?: string;
  collection: string;
}

export interface DeployConfig {
  target: 'docker-swaw' | 'vercel';
  database: 'postgres' | 'surreal' | 'none';
  composeService: string;
  port: number;
  env: Record<string, string>;
}

export interface DonationConfig {
  provider: 'stripe' | 'paypal';
  methods: string[];
}

export interface CloneManifest {
  schemaVersion: string;
  generatedAt: string;
  target: string;
  stack: {
    frontend: string;
    cms: 'payload' | 'custom';
    database: 'postgres' | 'surreal' | 'none';
    styling: string;
    runtime: 'node';
  };
  platform: CmsPlatform;
  locales: I18nLocale[];
  collections: PayloadCollection[];
  relationships: InferredRelationship[];
  designSystem: DesignSystem;
  pageMap: PageMapEntry[];
  dataset: { path: string; pageCount: number; truncated: boolean };
  deploy: DeployConfig;
  donation?: DonationConfig;
}

export type PageFetcher = (url: string) => Promise<string | null>;

export interface CrawlOptions {
  maxPages?: number;
  timeoutMs?: number;
  concurrency?: number;
  fetcher?: PageFetcher;
  /** Refuse a non-public origin and re-validate every redirect hop (set by runClone). */
  enforcePublicTarget?: boolean;
  /** Injected resolver (tests keep the suite hermetic). */
  lookup?: Lookup;
}
