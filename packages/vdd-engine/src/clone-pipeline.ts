// Clone pipeline orchestrator — normalizes a domain, then runs the full
// crawl → capture → evidence → schema → backend → manifest → tools chain.
// Crawl (fetch/browserless) and browser capture (Playwright → browserless →
// static) are best-effort; the pure stages always run. Emits a scaffold
// manifest the host agent consumes to produce a live site.

import { normalizeDomain } from './normalize-domain.js';
import { assertPublicTarget, type Lookup } from './assert-public-target.js';
import { crawlSite } from './crawl.js';
import { capture } from './capture.js';
import { recordEvidence } from './evidence.js';
import { inferSchema } from './infer-schema.js';
import { generateBackend } from './generate-backend.js';
import { generateManifest } from './generate-manifest.js';
import { emitTools } from './emit-tools.js';
import type {
  CaptureBundle,
  CloneManifest,
  EvidenceBundle,
  GeneratedBackend,
  InferredModel,
  SiteDataset,
  ToolManifest,
} from './clone-types.js';

export interface CloneResult {
  normalized: { scheme: string; host: string };
  dataset?: SiteDataset;
  capture?: CaptureBundle;
  evidence?: EvidenceBundle;
  model: InferredModel;
  backend: GeneratedBackend;
  manifest?: CloneManifest;
  tools: ToolManifest[];
  crawlSkipped: boolean;
  browserSkipped: boolean;
  /** URLs the SSRF gate refused during the crawl. */
  refused?: string[];
}

export interface ClonePipelineOptions {
  timeoutMs?: number;
  maxPages?: number;
  concurrency?: number;
  crawl?: boolean;
  browser?: boolean;
  /** Reuse a previously-crawled dataset instead of crawling (idempotency). */
  reuseDataset?: SiteDataset;
  /** Injected DNS resolver (tests keep the suite hermetic); defaults to the system resolver. */
  lookup?: Lookup;
}

export async function runClone(domain: string, options: ClonePipelineOptions = {}): Promise<CloneResult> {
  const normalized = normalizeDomain(domain);
  if ('code' in normalized) {
    throw new Error(normalized.code + ': ' + normalized.message);
  }
  const target = normalized.scheme + '://' + normalized.host;

  // SSRF gate: refuse the clone target if it is, or resolves to, a non-public address before a
  // socket is opened. This covers the initial target only: the crawl re-resolves at fetch time
  // (DNS rebinding), `capture` below follows redirects (`redirect: 'follow'`) and fetches
  // stylesheets, and `recordEvidence`/`capture` are exported and navigate without this gate.
  // Recorded residual (`docs/plan.md` A3) — not a property this call establishes.
  const check = await assertPublicTarget(normalized.host, options.lookup);
  if (!check.ok) throw new Error(check.reason ?? 'refused: non-public clone target');

  const result: CloneResult = {
    normalized: { scheme: normalized.scheme, host: normalized.host },
    model: { platform: 'unknown', locales: [], entities: [], relationships: [] },
    backend: { migrations: [], routes: [], payloadCollections: [] },
    tools: [],
    crawlSkipped: false,
    browserSkipped: true,
  };

  if (options.crawl !== false) {
    if (options.reuseDataset) {
      result.dataset = options.reuseDataset;
    } else {
      try {
        result.dataset = await crawlSite(target, {
          maxPages: options.maxPages,
          timeoutMs: options.timeoutMs,
          concurrency: options.concurrency,
          enforcePublicTarget: true,
          lookup: options.lookup,
        });
      } catch {
        result.crawlSkipped = true;
      }
    }
  }

  let evidence: EvidenceBundle = { records: [] };
  if (options.browser !== false) {
    try {
      result.capture = await capture(target, options);
      result.browserSkipped = false;
    } catch {
      result.browserSkipped = true;
    }
    try {
      evidence = await recordEvidence(target, options);
      result.evidence = evidence;
    } catch {
      /* evidence is best-effort (requires a headless browser) */
    }
  }

  if (result.dataset?.refused?.length) result.refused = result.dataset.refused;

  result.model = inferSchema(evidence, result.dataset?.cms);
  result.backend = generateBackend(result.model);
  if (result.dataset) {
    result.manifest = generateManifest(target, result.dataset, result.model, result.backend, result.capture);
  }
  result.tools = emitTools(result.model);
  return result;
}
