# Changelog

## [Unreleased]

## [1.7.1] — 2026-09-27

### Fixed (graceful degradation for missing selector arguments)
- **Selector-based tools no longer hard-fail when an argument is omitted.** `vdd_clarify`, `vdd_plan`, `vdd_tasks`, `vdd_get_next_task`, and `vdd_analyze` now **auto-select the only spec directory** when `feature` is omitted, and otherwise return an actionable `success: true` payload (`output.needsInput` + `availableFeatures` + a next step) instead of `{ success: false, error: "feature is required" }`. `vdd_implement` (`taskId`), `vdd_amend` (`description`), `vdd_vision` (`statement`), and `vdd_specify` (`actionItemId`/`description`) return the same guidance shape.
- This removes a dead-end for agents that call a bare tool (e.g. a project-less `vdd_analyze`), and fixes the **Agent Status reliability index dropping to "Degraded"** — its probe calls read-only tools with no arguments, and 5 of our 7 read-only tools previously returned an error, scoring as functional failures (`soft_error_in_body:error=feature is required`). Applied in both the engine (`packages/vdd-engine`) and the hosted Vercel handler (`api/_vdd-rpc.js`), with regression tests.
- Backward compatible: tools still accept and prefer an explicit `feature`/`taskId`/etc.

## [1.7.0] — 2026-09-27

### Removed (SSE transport retired)
- **The legacy SSE endpoint is gone.** `api/sse.js` became the non-routed `api/_vdd-rpc.js` (Vercel does not create a function for underscore-prefixed files), so `/api/sse` now returns an **HTTP 308 redirect** to `/api/mcp` and `server.json` advertises only the `streamable-http` remote. This eliminates the recurring `Vercel Runtime Timeout Error: Task timed out after 30 seconds` on `/api/sse` (64 occurrences, 30 users since Aug 10) — a long-lived SSE stream cannot outlive a serverless function's `maxDuration`.
- README, SKILL, AGENTS, the GitHub Pages landing page, and the in-repo API reference no longer mention SSE; `/api/mcp` is the single canonical transport.

### Added (hosted-surface tests + CI)
- **Regression tests for the hosted tool surface** (`packages/vdd-mcp/test/api-surface.test.ts`, `server-surface.test.ts`): asserts 16 tools, titles, destructive/read-only classification, `openWorldHint` accuracy, and — most importantly — `PHASE_META` description parity between `api/_vdd-rpc.js` and the engine, guarding the duplication that produced the earlier annotation bug.
- **CI now runs the code.** `.github/workflows/vdd-quality-gates.yml` gains a `build-test` job (`pnpm -r build` → `pnpm check` → `pnpm test` → `node --check` on the Vercel handlers). Previously CI only inspected `vdd/` artifacts and never type-checked or tested.
- **Browser docs page at `GET /api/mcp`** — the accessible HTML page (WCAG-AAA palette) moves from the retired `/api/sse` route to the canonical endpoint.

### Fixed (deploy + annotation precision)
- Removed the ignored `memory` setting from `vercel.json` (ignored under Active CPU billing) — silences the build warning.
- Local-only tools now declare `openWorldHint: false`; only `strategize` and `clone` are open-world.

### Added (MCP distribution & Glama registry)
- **Streamable HTTP transport** (`packages/vdd-mcp/src/http.ts` + `http-entry.ts`): the VDD tools now serve over the MCP Streamable HTTP transport (port 3000) alongside the stdio entrypoint, making the server hostable/deployable.
- **`glama.json`** registry file (repo root): `maintainers` only — the sole field Glama's [server schema](https://glama.ai/mcp/schemas/server.json) consumes. Glama generates its own container build from the stdio entrypoint (`packages/vdd-mcp/dist/stdio.js`) wrapped with `mcp-proxy`; the root **`Dockerfile`** is for self-hosting the Streamable HTTP server, not for Glama.
- **Tool titles + MCP annotation hints** (`readOnlyHint`/`destructiveHint`/`idempotentHint`/`openWorldHint`) on every MCP tool.
- **Per-tool input schemas** — each tool advertises only the parameters it actually reads (e.g. `vdd_init` → `projectRoot` only; clone-only params on `vdd_clone`).
- **Documented output schema** (`outputSchema` + `structuredContent`) shared by every tool.

### Fixed (MCP annotation accuracy + surface parity)
- **Destructive annotations now describe each tool's own filesystem effect.** `vdd_clarify`, `vdd_implement`, and `vdd_amend` write nothing — they return questions/instructions to the host agent — so they are now `readOnlyHint: true, idempotentHint: true` (were `destructiveHint: true`). `vdd_validate` writes only a new `vdd/impact-report.generated.md` and never clobbers a hand-authored report, so it is now `destructiveHint: false, idempotentHint: true`. The genuine overwriters (`init`, `vision`, `strategize`, `tactics`, `specify`, `plan`, `tasks`, `clone`) stay `destructiveHint: true`. This clears the false "Destructive" badges Glama renders for the three non-writers.
- **Descriptions no longer overstate writes.** The `clarify`, `implement`, and `amend` descriptions in `packages/vdd-engine/src/meta.ts` said "Mutates …"/"commits to git"; they now state the tool is read-only and the host agent applies the edits.
- **Deployed HTTP surface parity.** `api/sse.js` (SSE + the shared JSON-RPC handler used by `api/mcp.js`) now emits the same `title` + `annotations` per tool as the stdio server, and its duplicated `PHASE_META` is synced to the engine. Previously only the npm stdio build carried hints, so Glama and the hosted endpoint disagreed.

### Changed (MCP tool surface)
- `vdd_next_task` → **`vdd_get_next_task`** (consistent `verb_noun` naming) across the engine, MCP server, CLI, SSE endpoint, and docs.
- **`e2e` is no longer an MCP/SSE tool** — it duplicates the phase sequence. It remains the CLI `vdd e2e` shortcut (and `vdd e2e -clone`) and an engine phase. **MCP tool surface: 17 → 16.**
- Tool descriptions rewritten for the Glama Tool Definition Quality Score: explicit usage boundaries with named alternatives, defined domain jargon (AC, per-phase), overwrite/no-op behaviour, and non-obvious parameter meaning.

### Fixed (validate — feature discovery, and the report it writes)
- **`validate` discovers the feature directories under `vdd/specs/`** instead of assuming a single `feature-1`. A project with several features (SP-002…SP-00n) no longer false-flags every other feature as uncovered, and the traceability table lists each feature. An explicit `feature` still narrows the run to one.
- **`validate` no longer overwrites a hand-authored `vdd/impact-report.md`**; it writes `vdd/impact-report.generated.md` alongside it.

## [1.6.0] — 2026-09-04

### Fixed (clone pipeline correctness — fixes over-segmentation, junk data, dead hosts, and the MCP timeout)
- **Crawler skips bare relative links** (`en/foo` — no leading slash) that resolve to nested junk paths like `/en/homepage/en/…`; only root-relative and absolute same-origin links are followed (`crawl.ts`).
- **Headings/paragraphs scoped to the content region** (`<main>`/`<article>`) with a boilerplate blocklist, and `<script>/<style>/<noscript>` stripped before extraction — no more footer-nav headings or JS-template leakage (`' + content + "`).
- **Image extraction reads `srcset` + `data-src`/`data-lazy-src`/`data-original`** (largest `srcset` candidate), and filters boilerplate assets (`/wp-includes/`, `/wp-content/plugins/`, `s.w.org` emoji, favicons, `.gif` placeholders).
- **Image host normalization**: staging `*.youdomain.hk` → page origin, `www.` → apex, `http` → `https`.
- **Page dedupe**: canonical path from `<link rel="canonical">`/`og:url` + percent-encoding/trailing-slash normalization (`%E5…` ≡ `%e5…`).
- **Bounded-concurrency BFS crawl** (default 8 workers) — a 200-page crawl no longer blocks the MCP request to a timeout.
- **Schema pruning**: internal Divi/Elementor/Gutenberg/ACF post types and taxonomies no longer emit Payload collections (was 35 collections for a marketing site).
- **Design-system capture no longer requires Playwright**: a static capture path (browserless `/content` HTML + fetched `<link rel=stylesheet>` CSS) parses CSS vars / `@font-face` / breakpoints / regions, so `browserSkipped` no longer leaves an empty `designSystem`.

### Added
- `runClone` options: `crawl`, `browser`, `reuseDataset`, `maxPages`, `timeoutMs`, `concurrency`.
- `clone` phase idempotency: reuses a fresh (< 24h) `vdd/clone-dataset.json` unless `refresh: true`.
- Manifest stack/deploy detection from the target repo (SurrealDB/Vercel vs Payload/Postgres) — `detectTargetStack` + `generateManifest` `stack`/`deploy` override.
- `vdd_clone` MCP input: `maxPages`, `timeoutMs`, `concurrency`, `crawl`, `browser`, `refresh`.

## [1.5.9] — 2026-09-04

### Added
- **`vdd:clone` produces a live, operational site** — the pipeline now emits a scaffold manifest for a real Next.js + Payload + Postgres stack (was a static single-page app), ready to be scaffolded/deployed by a host-side `vdd-clone` skill.
  - **`probe-cms.ts` (A-002b)** detects WordPress over HTTP (`/wp-json/`, `/wp-json/wp/v2/types`, `/wp-json/wp/v2/taxonomies`, `/wp-json/pll/v1/languages`) and returns a typed `CmsDescriptor`: content types, taxonomies, and Polylang locales — no browser required.
  - **`infer-schema.ts` (A-004)** is now **WordPress-aware**: reconstructs the real editorial model (Page, Post, Project, Media, NavMenuItem, custom post types, taxonomies, locales) instead of guessing from JSON. Derives custom post types (Divi Machine et al.) from taxonomy `types` even when hidden from `/types`.
  - **`generate-backend.ts` (A-005)** now emits **Payload CMS collections** (`payloadCollections`: slug, localized, useAsTitle, typed fields, relationship fields) in addition to SQL migrations and CRUD route specs.
  - **`generate-manifest.ts` (A-008)** bundles dataset + model + collections + design system + page map + deploy config into a machine-readable `vdd/clone-manifest.json` for a host `vdd-clone` skill.
  - **`clone_scaffold_site`** AI tool emitted (6 tools total).
  - **`scripts/vdd-clone-scaffold.mjs`** — host-side scaffold generator: emits a buildable Next.js (App Router) + Payload 3.69 + self-hosted Postgres project (collections, localization, admin/REST routes, token-faithful frontend, `docker-compose.yml`, seed script) from `vdd/clone-manifest.json`.
  - **`references/clone-playbook.md`** — end-to-end runbook (scaffold → build on SWAS → self-hosted deploy → seed → fidelity audit). A standalone `vdd-clone` skill wraps it for the host agent.
  - **Faithful UI capture** (`capture.ts`) — captures the full rendered UI instead of CSS variables only: serialized stylesheet rules (media queries preserved), `@font-face` sources, rendered region HTML (header/nav/hero/main/footer), real `@media` breakpoints, and JS-driven layout metrics (header/logo height, header position).
  - **Token-faithful scaffold** — `vdd-clone-scaffold.mjs` re-emits the captured CSS (webpack-safe `public/captured.css`, `url()` hotlink-rewritten), renders captured region HTML, seeds real crawled content (`src/seed-data.json`), and injects layout normalization for page-builder sizes.
  - **Inline SVG favicon** on the landing page + MCP HTML page (eliminates the `/favicon.ico` 404).

### Changed
- **`clone` phase** writes `vdd/clone-manifest.json` + `vdd/clone-dataset.json` + `vdd/clone-schema.json` + `vdd/clone-capture.json` + `clone.md`; `clone.md` gains Locales / Payload Collections / Routes / Migrations sections; `output` now reports `platform`, `locales`, `collections`, `manifest`, `schema`, and a `docker compose` deploy hint (project root `.` is the site root).
- **`generate-site.ts`** replaced by **`generate-manifest.ts`** (static SPA removed).
- **`runClone`** returns `manifest`; `inferSchema` takes a `cms` descriptor; `SiteDataset` carries `cms`.
- **Workspace linking fixed**: `vdd-cli` and `vdd-mcp` now depend on `@simonmak-ascent/engine` via `workspace:*` (was `^1.5.6`, which resolved to the published package and predated the clone pipeline).

### Fixed
- **`singularize`** no longer mangles words ending in a vowel + `s` (e.g. `experiences` → `Experience`, not `Experienc`).
- **`@simonmak-ascent/mcp` bin shebang** — `dist/stdio.js` lacked `#!/usr/bin/env node`, so `npx @simonmak-ascent/mcp` was executed as a shell script (`import: command not found`). Added the shebang so the npm-published bin runs under Node (local opencode worked only because it invoked `node` explicitly).

## [1.5.6] — 2026-09-03

### Added
- **`vdd:detect-environment` command** (16th tool): reports per-phase tool/MCP requirements and — given the host agent's `availableTools` — which capabilities are present vs. missing, plus resulting research limitations. Mirrors `references/ai-agent-patterns.md` "AI Tool Selection Per Phase".
- **`meta.ts`** in `@simonmak-ascent/engine`: canonical source of truth for phase names, phase metadata, per-phase tool requirements, the 5 research subagent dispatch specs, and the 7 domain primers (shared by engine, MCP server, CLI, and mirrored into `api/sse.js`).

### Changed
- **Phase 2 (`strategize`) is now an orchestration spec**: returns the 5 research subagent dispatch specs (Market/Competitive/Technology/Impact/Domain with tools, inputs, outputs, timeouts), the resolved domain primers, environment report, and research limitations; accepts `researchFindings` to synthesize `strategy.md` (previously a bare template).
- **Substantive gates**: removed hardcoded `true` checks (F3.1, F3.5, A7.4); a freshly generated placeholder template no longer passes `vdd:validate`/`vdd:e2e` — gates now report placeholders, drift, orphans, and uncovered artifacts. Self-heal no longer auto-greens.
- **`validate` computes real drift/orphan/uncovered** from `artifactFiles` (serverless) or the filesystem (stdio/CLI) instead of returning a static all-green report.
- **`tactics` performs a real repo audit** (package.json stack, config files, top-level dirs, suggested domains) in the stdio/CLI engine.
- **Reconciled the 4 surfaces**: removed the uncompiled `packages/vdd-mcp/api/sse.ts` stub (not in tsconfig `include`); `server.ts` now imports `PHASE_META`/`PHASE_NAMES` from `@simonmak-ascent/engine`.
- **16 tools** (was 15): `vdd_detect_environment` added across engine, MCP, SSE, and CLI.
- **npm scope renamed + published**: packages published as `@simonmak-ascent/engine`, `@simonmak-ascent/mcp`, `@simonmak-ascent/cli` (was `@vdd/*`; the `@vdd` org was unavailable).
- **Version**: all surfaces aligned to `1.5.6`.

### Fixed
- **Stale CI gate-count check**: `.github/workflows/vdd-quality-gates.yml` now checks for `108` (was `113`).

## [1.5.5] — 2026-08-12

### Added
- **`vdd:e2e` command**: End-to-end full-chain execution — runs init→vision→strategize→tactics→specify→clarify→plan→tasks→next-task→validate in one call, writes all 10+ template files with proper impact-chain headers. Accepts optional `--actionItemId`/`--feature` to customize feature name (default: "feature-1"). Available across all 4 surfaces: engine, MCP server, SSE endpoint, CLI.
- **`VddOutput.output` field**: Structured metadata output (file lists, analysis results, instructions) for all phases.

### Fixed
- **Engine file I/O**: All 14 phase functions now use `fs/promises` to actually write template files to disk with full structured content based on `artifact-templates.md`. Previously returned artifact paths as strings without writing any files or generating content.
- **`clarify` phase**: Now reads existing spec.md, scans for `[NEEDS CLARIFICATION]` markers and `[e.g.]` placeholders, returns real counts.
- **`nextTask` phase**: Now reads tasks.md and returns the first uncompleted `TASK-*` line instead of a hardcoded string.
- **`analyze` phase**: Now reads spec.md and reports AC count, unresolved clarifications, placeholder density, and plan/tasks readiness.
- **MCP tool descriptions**: All 15 tools now have full phase context descriptions + AI agent instructions (previously just `"VDD Phase: <name>"`).
- **SSE endpoint**: `api/sse.js` now returns template content alongside artifact paths for all phase tools, and supports the full e2e chain.
- **Gate check count**: Corrected the canonical total from 113 to **108** (42 forward + 38 backward + 28 S&T) across all docs, code, and badges — the previous "47 forward" never matched the actual checklist tables.

### Changed
- **15 tools** (was 14): `vdd_e2e` added across engine, MCP, SSE, and CLI.
- **Version**: All surfaces aligned to `1.5.5` — `vdd-engine`, `vdd-mcp`, `vdd-cli` packages, MCP server info, and API server info (previously `0.1.0`/`0.2.0`).

## [1.5.4] — 2026-08-11

### Fixed
- **MCP SSE transport**: `api/sse.js` now returns proper `text/event-stream` with `endpoint` event for MCP clients (was `application/json`)
- **JSON-RPC 2.0**: POST handler supports full MCP lifecycle — `initialize`, `tools/list`, `tools/call`, notifications
- **HTML landing page**: updated with agent-specific config examples (OpenCode, Claude Desktop, Cursor)
- **index.html**: fixed broken CSS `var(--green)` → `var(--teal)`, updated MCP callout with config snippets
- **README.md**: MCP section rewritten with JSON-RPC examples, agent configuration, and curl example
- **SKILL.md**: added per-agent MCP connection instructions
- **AGENTS.md**: corrected api/sse.js transport description
- Removed dead `isMcpClient()` function from api/sse.js

## [1.5.3] — 2026-08-10

### Added
- **MCP Server**: 14 tools deployed at `vdd.simonmak.com/api/sse` — public, no-auth, Vercel serverless
- **TypeScript Packages**: `packages/vdd-engine` (14 phase fns), `packages/vdd-mcp` (14 tools), `packages/vdd-cli` (14 subcommands)
- **domain-primers/safety-critical.md**: FMEA/FTA primer with safety gate checklist (DO-178C/IEC 62304)
- **references/compliance-evidence.md**: Evidence maps for DO-178C, IEC 62304, CMMI REQM, ISO 29148
- **index.html**: GitHub Pages landing page with full methodology overview
- **GitHub Wiki**: Navigation hub with 7 primers, MCP API section, compliance links
- **VDD universal access spec/plan/tasks**: Full SDD chain for MCP + CLI feature

### Fixed
- **README.md**: Anti-patterns (23→24), domain primers (4→7), repo structure (added packages/, api/, safety-critical, compliance-evidence)
- **SKILL.md**: Domain Primers table (6→7 rows), added MCP & Packages section
- **AGENTS.md**: Directory map (added api/, packages/, index.html, safety-critical)
- **references/INDEX.md**: Gate checks (110→108), anti-patterns (16→24), added all missing primers + compliance-evidence
- **references/quick-reference.md**: Domain Primers table (4→7 rows), added MCP API section
- **vdd/docs/tutorial.md**: Version v1.5.0→v1.5.3
- **vdd/strategy.md + tactics.md**: Primer counts (4→6), pillar counts (5→12), action item counts (23→38)
- **constitution.md**: Updated for packages + API layer, MCP security constraints

### Verified
- **Benchmark**: 47/47 criteria (100%), 11 exceeded, **0 gaps** (v1.5.0 had 2)
- **Consistency**: 108 gates, 24 anti-patterns, 7 primers confirmed across all 9 public-facing files

## [1.5.0] — 2026-08-10

Initial release.
