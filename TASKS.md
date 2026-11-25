# TASKS — the execution list, not the issue queue

This file is the input to the estate's plan gate: `~/.config/opencode/plugins/_lib/gates/policies/plan.ts`
runs `plan-state.py --require-complete` over it before any shipping command. It records what a commit
delivers; it is **not** a backlog — a `ready` row is a refusal by design. The backlog lives in
`docs/plan.md`.

Legend — **done** · **applied** · **ready** (no blocker, no approval needed) · **blocked by** `<row>`
(names the row it waits on) · **awaiting you** · **yours** (needs the operator).

| # | task | gate that was run | status |
|---|---|---|---|
| 1.1 | The redesign plan and architecture are reviewed to `ship` | `reviewer` over `docs/plan.md` + `docs/architecture.md`, rounds 1–8 | **done — round 4.8 returned `REVIEW-VERDICT: ship`; classes (a)–(d) none** |
| 1.2 | `AGENTS.md` reconciled with the tree (test runner, counts, localhost-only rule, ship gate) | `read`/`grep` over `package.json`s, `vitest.config.ts`, `.github/workflows/`, `packages/*/test/` | **done — counts 18 files/137 tests; no stale `17 files`/`107 tests`** |
| 1.3 | A1: `feature` validated at the engine choke point and in the MCP schema | `pnpm --filter @simonmak-ascent/engine test feature-arg` · `-- @simonmak-ascent/mcp test feature-schema` | **done — 8 and 16 tests, plus 6 `specify` cases; the hosted twin (`api/_vdd-rpc.js`) validates `feature`/`id` too, and the parity test now compares per-field `pattern`s; `A-001` still writes** |
| 1.4 | A2: `projectRoot` confined on the MCP and CLI surfaces | `-- @simonmak-ascent/engine test project-root` · `-- @simonmak-ascent/mcp test http-transport` | **done — 10 tests; HTTP case refuses `/etc` when `VDD_ALLOWED_ROOTS` is set** |
| 1.5 | A3: clone SSRF gate plus manual redirect validation | `-- @simonmak-ascent/engine test assert-public-target` · `-- @simonmak-ascent/engine test crawl` | **done — 29 tests incl. hex-mapped IPv6; a 302 to `169.254.169.254` is not followed and is recorded in `refused`; `probe-cms` follows at most two gated hops (with its own test) and sitemap hops are gated; residuals (DNS rebinding/IP pinning, `capture` redirects + stylesheet fetch, `evidence` `page.goto`, browserless navigation, hosted `projectRoot`, A4 token) recorded in `docs/plan.md`** |
| 1.6 | Full suite over the change-set | `pnpm -r build && pnpm check && pnpm test` | **done — 19 files, 150 tests passed** |
