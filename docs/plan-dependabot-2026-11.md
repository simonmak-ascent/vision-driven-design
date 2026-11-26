# Plan — close six Dependabot alerts: zod 4.6.6 and vitest 4.1.11 (v3)

> Depth: **medium** — the dependency, test and release surfaces of one repository.
> Basis: the parent's alert table plus the files cited below; no plan-context file exists
> (`**/plan-context.md` → none), so the brief and `AGENTS.md` are the authority.
> v3 applies two review rounds; §8 lists each round's findings and where each landed.

## Decision

Upgrade **directly in the manifests, with no `pnpm.overrides`**: raise `packages/vdd-engine/package.json:43` to `zod ^4.6.6`, raise `packages/vdd-mcp/package.json:54` from `^4.0.0` to `^4.6.6` so the fixed floor is explicit, **remove** the unused `zod` declaration at `packages/vdd-cli/package.json:45`, and raise `vitest` to `^4.1.11` at `packages/vdd-engine/package.json:48` and `packages/vdd-mcp/package.json:59` in **one atomic commit** (the mcp tests are executed by the engine's vitest runner through the root config, so the two versions must not diverge). Ship it as **1.10.1**, not 1.11.0: `1.11.0` is already claimed by the separate vision-removal plan (`docs/plan-vision-skill-only.md:465`, `:516`), and this is a security fix that should not wait for or be coupled to a feature removal. The break is **not only type-level**: zod 4 replaces the runtime error object (`ZodError.errors` is removed in favour of `.issues`, `format`/`flatten` are deprecated, and `instanceof` against a consumer's zod-3 `ZodError` no longer matches), so the CHANGELOG must state three consumer actions (Q6). `1.10.1` is defensible only while those three statements are acceptable in a patch release note; **if they are not, the version must be `2.0.0`**. The release is additionally gated on the vision removal not yet being on `main` (Task 4). Land the CI `paths` widening first — **conditionally**, since it is the same hunk as the vision plan's T1 (Task 1) — then zod, then vitest, then the release; verify closure against the Dependabot alerts API with assertions that can fail, never against manifest text.

## Open questions

**Q1 — direct bumps or `pnpm.overrides`?**
Direct bumps. `pnpm.overrides` is a root-manifest field (the root `package.json` is 39 lines and declares no `pnpm` key), it is not published, and the alerts are registered against the **package manifests** (`packages/vdd-engine/package.json`, `packages/vdd-cli/package.json`). An override would fix the local tree while the published `@simonmak-ascent/engine@1.10.1` still declared `zod ^3.23.0`, so consumers would keep resolving the vulnerable major and the alert would not describe the shipped contract. Direct bumps also avoid a second mechanism fighting the workspace's existing `zod ^4.0.0` in `vdd-mcp`.

**Q2 — which zod 3 → 4 APIs in `packages/vdd-engine/src/types.ts` change behaviour, and what is the edit?**
None change behaviour for the constructs used; **no source edit is expected**. The mapping table is in the File-by-file section. Both fixed versions exist on npm (`registry.npmjs.org/zod/4.6.6` and `registry.npmjs.org/vitest/4.1.11` returned their published manifests). Two facts make this credible rather than optimistic: (a) `vdd-mcp` already compiles and runs the same construct set on zod 4 (`packages/vdd-mcp/src/server.ts:3`, resolved to `zod@4.6.7` at `pnpm-lock.yaml:604`), and (b) the only zod-3 constructs here are `z.enum`, `z.object`, `z.string`, `.optional()`, `.default()`, `.describe()`, `z.record(key, value)`, `z.array`, `z.unknown`, `z.boolean`, `z.number`, `z.infer` (`types.ts:3-69`). The error **text** changes in zod 4 (for example, `"Invalid input: expected string, received undefined"` instead of zod 3's `"Required"`), but no test or source file asserts a zod message: `grep` over `packages/**/*.test.ts` for `ZodError|\.issues|invalid_type|toThrow` returns only filesystem `toThrow` assertions (`packages/vdd-engine/test/feature-arg.test.ts:71-72`) and the `safeParse(...).success` assertion at `packages/vdd-mcp/test/feature-schema.test.ts:33`. Those tests therefore stay green while the runtime error **object** changes shape for consumers (Q6) — the reason the CHANGELOG, not a test, carries that contract.

**Q3 — does `vdd-cli` use zod, or is the declaration vestigial?**
Vestigial; remove it. A repo-wide grep for `from 'zod'` returns exactly two files, `packages/vdd-engine/src/types.ts:1` and `packages/vdd-mcp/src/server.ts:3`; nothing under `packages/vdd-cli/src` imports it. The CLI still loads zod at runtime **transitively** through `@simonmak-ascent/engine` (`packages/vdd-engine/src/index.ts:3` re-exports `types.js`, which imports zod), and the engine's own manifest declares the dependency, so removing the CLI's copy changes no runtime resolution.

**Q4 — is the workspace's dual zod major already a live hazard?**
No, and it is not luck. `packages/vdd-mcp/src/server.ts:4` imports `VddContext` and `VddPhaseInput` with `type`, so no zod-3 schema instance crosses into the zod-4 code; `PHASE_INPUT_SCHEMAS` (`server.ts:29`) is built entirely from local zod-4 schemas (`server.ts:9-27`) and handed to `registerTool` (`server.ts:117`). The hazard was **latent** — a future `z.object({ context: VddContext })` in `vdd-mcp` would mix instance classes — and unifying on zod 4 removes it.

**Q5 — does the published engine's type shape change?**
The inferred aliases do **not**: `VddContext`, `VddOutput`, `VddPhaseInput`, `VddMode`, `Constitution`, `Delegation` are `z.infer` aliases (`types.ts:4,12,19,26,41,53,69`) over the same primitives, and zod 4 infers the same object/union/record types for each construct used. What **does** change is the declared class of the exported **values**: `index.ts:3` re-exports the schema constants, and their `.d.ts` type is `zod@4`'s `ZodObject`/`ZodEnum` rather than zod 3's. A consumer that only imports the types or calls `.parse()` and inspects the result is unaffected; a consumer that composes the exported schemas with its own zod 3 (`z.object({ ctx: VddContext })`) gets a type error and must move to zod `^4.6.6`. That is the conditional type-level break in Q6.

**Q6 — which release version, and what must a consumer do?**
`1.10.1` (patch) for all three packages. `1.11.0` is already claimed by the separate vision-removal plan (`docs/plan-vision-skill-only.md:465` "`1.11.0` — the vision removal"; `:516` T9 releases 1.11.0), and this security fix must ship before it. The break is **not only type-level**:

1. **Composition.** The exported schema values are zod-4 instances, so composing them with the consumer's zod 3 is a type error; that path needs `zod@^4.6.6`.
2. **Runtime errors.** Errors thrown from `.parse()` on these schemas are zod-4 `ZodError`s: `.errors` is removed (read `.issues`), `z.treeifyError()` is the supported formatter, and `format`/`flatten` are deprecated.
3. **Identity.** `err instanceof ZodError` against the consumer's own zod-3 import no longer matches, so a hand-rolled `instanceof` error handler silently stops catching.

Therefore the CHANGELOG states three consumer actions (Task 4): (a) compose or serve these schemas only with `zod@^4.6.6`; (b) read `.issues` and `z.treeifyError()`, not `.errors`/`format`/`flatten`; (c) do not rely on `instanceof` against a zod-3 `ZodError`. **If those three statements are unacceptable in a release note, the version must be `2.0.0`** — a major for a dependency-major security patch, chosen deliberately rather than by leaking schema classes under a patch number.

**Q7 — do the six alerts actually close, and how is that proven?**
The repository has **no committed lockfile**: `pnpm-lock.yaml` is absent from `main`'s root tree (GitHub contents listing) and `AGENTS.md` says not to commit it; CI installs with `--no-frozen-lockfile` (`.github/workflows/vdd-quality-gates.yml:84`). Dependabot therefore resolves each manifest range, so `^3.23.0` → vulnerable and `^4.6.6` → fixed; `^2.1.0` → vulnerable and `^4.1.11` → fixed. The local tree is a different question: a stale local `pnpm-lock.yaml` can keep the old version in `node_modules` after a manifest edit, which is why every task runs `pnpm install --no-frozen-lockfile` before its version check. The authority is `gh api repos/simonmak-ascent/vision-driven-design/dependabot/alerts`, not the manifest text, and the plan proves it with an **assertion pair that can fail** (Verification, Task 5): one that requires the open count to be `0`, and one that rejects **every** non-`fixed` state — so a `dismissed` alert fails the check rather than satisfying it. Alert numbers are repository-scoped and were never verified here (the plan agent made no authenticated `gh` call), which is why nothing in this plan iterates alert ids `1..6`; the ids are derived from the API and printed on failure. The pair is run **before** the change (expecting a non-zero open count and non-empty output) and after (expecting `0` and empty), so the check is observed failing.

**Q8 — will the CI widening gate its own PR?**
Not relied on. The vision-removal plan records that a `pull_request` run uses the base branch's workflow (`docs/plan-vision-skill-only.md:509`), so the widening gates *future* `packages/**` PRs and is observed post-merge. This plan's proof is the first `packages/**`-only PR after the widening is on `main` — Task 2's PR, unless Task 1 was a no-op because the vision plan's T1 landed first — showing `build-test` **green** in `gh pr checks`. Whether GitHub actually evaluates the head or base workflow for the filter is **unverified** and does not change any task.

**Q9 — does anything need a lockfile commit?**
No. `pnpm-lock.yaml` exists only as a local, untracked artefact (`pnpm-lock.yaml:571` `vitest@2.1.9`, `:601` `zod@3.25.76`, `:604` `zod@4.6.7`), and `AGENTS.md` records that no lockfile is committed. It is **not** in `.gitignore` today (`.gitignore:1-29` contains no `pnpm-lock.yaml`), so "do not stage it" was only a convention; Task 1 adds the ignore rule as a control and every commit in this plan uses explicit pathspecs. The local tree is still evidence of what is installed today, which is why the version checks are `pnpm --filter … exec node -e` floor assertions (they exit non-zero below the floor) rather than manifest text or a bare version print.

**Q10 — what does the vitest 4 upgrade mean for the suite?**
The root config's keys (`root`, `test.include`, `environment: 'node'`, `vitest.config.ts:1-13`) remain valid in vitest 4, and the tests use only `describe`, `it`, `it.each`, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`, `expect` and `fetch`; there is no `vi.*`, snapshot, fake-timer, coverage or `test.workspace` usage anywhere in `packages/*/test`. The suite therefore does not exercise the APIs vitest 4 changed, which is the point of the count control in the Test plan. Vitest 4.1.11's engines (`^20 || ^22 || >=24`, npm registry metadata) match `package.json:36` (`node >=22`) and CI's `node-version: 22` (`.github/workflows/vdd-quality-gates.yml:79-81`). **Unverified**: an actual run under vitest 4 in this checkout; Task 3 observes it, and a drop from 85 to 37 means config discovery broke (Test plan).

## File-by-file change list

| Path | Change | Task |
|---|---|---|
| `.github/workflows/vdd-quality-gates.yml:5-7` | **Append** `packages/**`, `api/**`, `scripts/**`, `docs/**`, `package.json`, `server.json`, `vitest.config.ts` to the existing `pull_request.paths` list, **keeping** `vdd/**` and `references/**` (final set = those two + the seven A00 entries, `docs/plan.md:105`) — **only if not already present**; that hunk is shared with the vision plan's T1, and the first to merge owns it | 1 |
| `.gitignore` | Add `pnpm-lock.yaml` (control, not convention; if `git ls-files --error-unmatch pnpm-lock.yaml` exits 0 it is tracked — `git rm --cached pnpm-lock.yaml` in the same commit) | 1 |
| `docs/plan-dependabot-2026-11.md` | This plan, committed with Task 1's PR (it touches `docs/**`, which the widened filter now gates) | 1 |
| `packages/vdd-engine/package.json:43` | `"zod": "^3.23.0"` → `"^4.6.6"` | 2 |
| `packages/vdd-mcp/package.json:54` | `"zod": "^4.0.0"` → `"^4.6.6"` (fixed floor; not alert-driven, prevents a fresh resolve below the fix) | 2 |
| `packages/vdd-cli/package.json:45` | Delete the `"zod"` line (unused; Q3) | 2 |
| `packages/vdd-engine/test/types-schema.test.ts` | **New** — 6-case contract test for the exported schemas; imports **only** from `../src/index.js` (Test plan). Case 6 exercises the delegation envelope through the exported `VddOutput`, because `Delegation` is **not** re-exported (`src/index.ts:3`) | 2 |
| `packages/vdd-engine/package.json:48` | `"vitest": "^2.1.0"` → `"^4.1.11"` | 3 |
| `packages/vdd-mcp/package.json:59` | `"vitest": "^2.1.0"` → `"^4.1.11"` (same commit as the engine bump) | 3 |
| `packages/vdd-engine/src/types.ts` | **Expected: no edit.** The zod-4 mapping is below; if `tsc` names a construct, apply only the mapped edit here | 2 |
| `CHANGELOG.md:3` | Insert `## [1.10.1] - <date>` above `## [1.10.0]`; if a vision-plan `[Unreleased]` section exists, insert 1.10.1 **below** it and above 1.10.0. State the three consumer actions (Q6) and that a reader who rejects them requires `2.0.0` | 4 |
| `packages/vdd-engine/package.json:3`, `packages/vdd-cli/package.json:3`, `packages/vdd-mcp/package.json:3` | Version → `1.10.1` | 4 |
| `server.json:6` and `:32` | `.version` and `.packages[0].version` → `1.10.1` | 4 |
| `api/_vdd-rpc.js:880` | `const SERVER_VERSION = "1.10.1";` | 4 |
| `packages/vdd-mcp/src/server.ts:106` | `version: '1.10.1'` (bare literal no test compares) | 4 |
| `packages/vdd-cli/src/cli.ts:6` | `.version('1.10.1')` | 4 |
| `README.md:12` | Badge `version-1.10.1-blue` | 4 |
| `scripts/gen-landing.py:22` | `VERSION = "1.10.1"`, then regenerate | 4 |
| `index.html`, `zh/index.html`, `hk/index.html` | Regenerated by `python3 scripts/gen-landing.py` — never hand-edited | 4 |
| `TASKS.md` | Append one row per commit, `done — <command and output>`; ids `3.1`–`3.5`; never a `ready` row and never a `blocked by` a completed row | all |

Zod 3 → 4 mapping for `packages/vdd-engine/src/types.ts` (expected edit: **none**):

| Construct (line) | zod 3 | zod 4 | Edit |
|---|---|---|---|
| `z.enum([...])` (3, 25, 34, 61) | union of literals | same | none |
| `z.object({...})` (6, 14, 31, 43, 46, 55) | strips unknown keys | same | none |
| `z.string()` (7, 15, 32-33, 35, 39, 45, 48) | string | same | none |
| `.describe(...)` (15, 32-33, 35-36, 38-39, 50) | description metadata | same | none |
| `z.record(z.string(), z.string())` (9-10, 66) | two-arg form | two-arg form **required**; already used | none |
| `z.record(z.string(), z.unknown())` (37, 47) | two-arg form | same | none |
| `z.array(z.string())` (36, 38, 63-64) | string[] | same | none |
| `z.unknown()` (37, 47) | unknown | unknown | none |
| `z.boolean()` / `z.number()` (44-46) | boolean / number | same | none |
| `.default('auto')` / `.default(false)` (8, 17, 62) | default applied on `undefined` | same; zod 4 does not parse a default, and both defaults are literals | none |
| `.optional()` (throughout) | unions with `undefined` | same | none |
| `z.infer` (4, 12, 19, 26, 41, 53, 69) | alias | same inferred shape | none |
| Error object / `ZodError` | `.errors`, `format`, `flatten` | `.issues`, `z.treeifyError()`, `format`/`flatten` deprecated, cross-major `instanceof` fails | no code asserts it (Q2); the consumer contract is the CHANGELOG's (Q6) |

Alert → change map (alert numbers are the parent's, unverified in this session; Q7):

| Alert | Package | Manifest | Closed by |
|---|---|---|---|
| 6 (high) | zod `<4.6.6` | `packages/vdd-cli/package.json` | Task 2 — declaration removed |
| 5 (high) | zod `<4.6.6` | `packages/vdd-engine/package.json` | Task 2 — `^4.6.6` |
| 4, 2 (medium) | vitest `>=2.1.0,<4.1.11` | `packages/vdd-mcp`, `packages/vdd-engine` | Task 3 — `^4.1.11` |
| 3, 1 (critical) | vitest `<3.2.6` | `packages/vdd-mcp`, `packages/vdd-engine` | Task 3 — `^4.1.11` |

## Test plan

Baseline at 1.10.0: **8 files / 79 test cases**, recorded at `TASKS.md:12` and `:15` and corroborated by counting declarations: engine 37 (`project-root` 10, `feature-arg` 15, `graceful-input` 10, `validate` 2) + mcp 42 (`http-transport` 3, `server-surface` 4, `api-surface` 18, `feature-schema` 17).

Task 2 adds `packages/vdd-engine/test/types-schema.test.ts` with **6** cases. It imports **only** from `../src/index.js` — the path `main`/`types` resolve to (`packages/vdd-engine/package.json:7-8`) and the file whose `index.ts:3` re-export of the schema constants is under test. This is a deliberate divergence from every existing engine test, which imports `../src/engine.js` or `../src/types.js` directly (`test/project-root.test.ts:3`, `test/feature-arg.test.ts:6-7`, `test/graceful-input.test.ts:6-7`, `test/validate.test.ts:6-7`): a direct `types.js` import would test the module and prove nothing about the published entry point, which is the surface a consumer actually gets.

1. `VddContext.parse({ projectRoot: '/tmp/p' })` returns exactly `{ projectRoot: '/tmp/p', mode: 'auto' }` (default applied).
2. `VddPhaseInput.parse({})` returns `{ json: false }`.
3. `Constitution.parse({ stack: { lang: 'ts' } }).stack` preserves the record.
4. `VddMode.safeParse('gated').success === true` and `VddMode.safeParse('nope').success === false` (known-bad fixture).
5. `VddContext.safeParse({}).success === false` and `VddOutput.safeParse({ success: 'yes' }).success === false`.
6. `VddOutput.parse({ success: true, extra: 1 })` equals `{ success: true }` (unknown keys stripped), and the delegation envelope round-trips **through the exported container**: `VddOutput.parse({ success: true, persisted: false, delegation: { id: 'd1', goal: 'g', kind: 'read', promptTemplate: 'p', requiredTools: [], expectedReturn: {}, nextTool: 'vdd_inspect' } }).delegation?.kind === 'read'`. `Delegation` is declared at `src/types.ts:31` but is **not** re-exported by `src/index.ts:3`, and adding it there would be a public-API change under a patch; the case therefore uses `VddOutput`'s `delegation: Delegation.optional()` (`src/types.ts:51`). The case must not parse the delegation schema directly and must not import it — it is not reachable from the entry point.

Expected final state: **9 files / 85 test cases** — **with this plan's Tasks 2–3 merged before the vision plan's T2/T3**, which is the pinned ordering (N6): `docs/plan-vision-skill-only.md:510-511` adds `packages/vdd-engine/test/vision-retired.test.ts` and `packages/vdd-mcp/test/retired-surface.test.ts` behind `it.skip` (`:334-335`), which would take the file count to 10 (11 once this plan's own test lands) and change the passed count when T5 un-skips them. Tasks 2 and 3 assert the ordering with `test ! -e` on both fixture paths. If a fixture is already present the ordering was violated: record the observed counts in the task row and stop — do not edit the expected 85 to match, because the vision plan's T5 changes it again.

This test passes on zod 3 as well as zod 4 — it is an invariant pin, not a red-first migration probe; it exists so the upgrade cannot silently change defaults, record handling, enum rejection or key stripping. Its known-bad fixture (cases 4/5) proves the test can fail.

What "the suite still passes" would **not** prove:

- **Discovery.** Only `vdd-engine` declares a `test` script (`packages/vdd-engine/package.json:40`), and the root config's `include` (`vitest.config.ts:10`) is what pulls in the 42 mcp cases. If vitest 4 stops resolving the root config from `packages/vdd-engine`, the command still exits 0 after running 37 engine tests. The 85 count is the control; **37 means discovery broke** and must be fixed (add `--config ../../vitest.config.ts` to the engine script or a package-local config), not accepted.
- **`it.each` expansion.** The count would fall if the 16-sample, 9-case, 2-case and 6-case tables collapsed.
- **Zod error-object behaviour.** The suite asserts `.success` and parsed values only; nothing asserts `.issues`, `treeifyError` or `instanceof`. Those are consumer-facing (Q6) and are documented, not tested — stated rather than assumed.
- **vitest internals.** Mock reset semantics, fake timers, snapshot format and coverage are not exercised by this suite at all, so the upgrade cannot regress them here — and cannot detect a regression in them elsewhere. That is acceptable because the suite uses none of them, and it is stated rather than assumed.

## Verification commands

Run in the checkout; `pnpm -r build` must precede `check`/`test` (AGENTS.md). Box-side execution is out of scope (localhost only).

Baseline, before any edit:

```bash
pnpm install --no-frozen-lockfile
pnpm -r build && pnpm check && pnpm test 2>&1 | grep -Eq 'Tests +85 passed'   # FAILS today (79)
pnpm --filter @simonmak-ascent/engine exec node -e "const [a,b,c]=require('zod/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>6||(b===6&&c>=6)))?0:1)"      # zod >= 4.6.6 — FAILS today (3.25.76)
pnpm --filter @simonmak-ascent/mcp exec node -e "const [a,b,c]=require('zod/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>6||(b===6&&c>=6)))?0:1)"         # post-condition only — PASSES today (4.6.7)
pnpm --filter @simonmak-ascent/engine exec node -e "const [a,b,c]=require('vitest/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>1||(b===1&&c>=11)))?0:1)"   # vitest >= 4.1.11 — FAILS today (2.1.9)
```

Today that block records **8 files / 79 test cases**, `zod@3.25.76` in the engine, `zod@4.6.7` in `vdd-mcp` and `vitest@2.1.9`. Three of the four checks fail before any edit, which is what makes them controls. The `vdd-mcp` zod line is a **post-condition**: that package already resolves `zod@4.6.7` (`pnpm-lock.yaml:604`), so it cannot fail pre-change and proves only that the floor holds after Task 2. `pnpm … exec vitest --version` prints `vitest/2.1.9` and exits 0, so a bare version print is not a control — the floor assertion is the line that fails.

Baseline for the closure control — run **before** the first edit and record the output; both controls are
expected to fail here, which is what makes them controls rather than decoration:

```bash
test "$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=open&per_page=100' --jq 'length')" = 0
# expected: exit 1 with no output — the open count (6, per the parent) is not 0
raw=$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=all&per_page=100' --jq '.[] | select(.state != "fixed") | "\(.number):\(.state)"') || { echo 'alerts API failed'; exit 1; }
test -z "$raw" || { echo "not fixed: $raw"; exit 1; }
# expected: exit 1 and lines like "5:open"; ids are derived from the API, never assumed
```

Post-merge and post-publish (Task 5), the same pair in its passing direction plus the release proofs:

```bash
test "$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=open&per_page=100' --jq 'length')" = 0
raw=$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=all&per_page=100' --jq '.[] | select(.state != "fixed") | "\(.number):\(.state)"') || { echo 'alerts API failed'; exit 1; }
test -z "$raw" || { echo "not fixed: $raw"; exit 1; }
test "$(npm view @simonmak-ascent/engine@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/cli@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/mcp@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/engine@1.10.1 dependencies.zod)" = '^4.6.6'
test -z "$(npm view @simonmak-ascent/cli@1.10.1 dependencies --json | grep '"zod"' || true)"   # cli declares no zod
curl -sS https://vdd.simonmak.com/api/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}' \
  | grep -Eq '"version": ?"1\.10\.1"'
```

The `test -z "$raw"` line fails on **any** state other than `fixed` — `open`, `dismissed` or `auto_dismissed` — so the alert can only be closed by shipping the fix, never by dismissing it. It is fail-closed: the payload is captured only if `gh` exits 0 (`|| { echo 'alerts API failed'; exit 1; }`), and the test runs on the captured value, so an auth or network error can no longer read as a clean result (N7). If an alert still reads `open` 30 minutes after the manifest merge, poll again and inspect `gh api repos/simonmak-ascent/vision-driven-design/dependency-graph/sbom`; do **not** dismiss it manually. A `dismissed` state is a finding to report, not a pass.

## Risks and rollback

- **zod 4 leaks through the published engine's schema values and its error objects.** Data shapes are unchanged; consumers that compose the schemas with zod 3 break at compile time, and consumers that read `.errors`, use `format`/`flatten`, or rely on `instanceof ZodError` break at runtime (Q6). Mitigation: the three-action CHANGELOG and, if those actions are unacceptable in a patch note, `2.0.0` instead of `1.10.1`. If a consumer reports a break after a `1.10.1` publish, cut 1.10.2 with a compatibility note; do not restore zod 3 (it reopens a high advisory).
- **Removing the CLI's zod declaration** could break a hidden dynamic import. None exists by grep, and `pnpm --filter @simonmak-ascent/cli build`/`check` plus the CLI's transitive engine dependency fail loudly if one is added later. Revert is a one-line manifest restore.
- **vitest 4 silently drops the 42 mcp tests** if config discovery changes. The 85-count assertion is the control; a 37 result blocks the task.
- **Publishing the vision removal as a patch.** The vision plan lands 13-tool **code** on `main` at T5, sweeps the counts only at T8 and releases at T9. A single `14 tools` marker therefore has a **blind window**: after T5 (the `vision: { title: 'Expand Vision', … }` row at `packages/vdd-mcp/src/server.ts:67` is deleted) and before T8 (the `14 tools` string at `packages/vdd-mcp/package.json:4` is swept), the count check still passes while the code is already 13 tools. Task 4 requires **both** markers — `grep -q 'Expand Vision' packages/vdd-mcp/src/server.ts` (present today, gone at T5) and `grep -q '14 tools' packages/vdd-mcp/package.json` (present today, gone at T8) — so a published `1.10.1` can only sit before T5. On failure, stop and report rather than sequencing around it.
- **A partial publish.** `pnpm -r publish` refuses an already-published version, so if one package publishes and a later one fails, do not move or re-push `v1.10.1`: bump only the unpublished packages to `1.10.2`, tag `v1.10.2`, and publish. Before the workflow runs, a failed tag can be deleted with `git tag -d v1.10.1 && git push origin :refs/tags/v1.10.1`.
- **A bad 1.10.1 after publish.** `npm deprecate '@simonmak-ascent/engine@1.10.1' '<reason>'` (same for cli/mcp), then restore **all three** `latest` tags, not just `mcp` — otherwise engine and cli keep serving the zod-4 surface while `npx` resolves the old mcp: `npm dist-tag add '@simonmak-ascent/mcp@1.10.0' latest`, `npm dist-tag add '@simonmak-ascent/engine@1.10.0' latest`, `npm dist-tag add '@simonmak-ascent/cli@1.10.0' latest`. Then fix forward as 1.10.2. Do not `npm unpublish` after the 72-hour window, and never re-publish a version.
- **Rolling the hosted endpoint back** means reverting `server.json:6,:32` and `api/_vdd-rpc.js:880` to `1.10.0` and letting the `main` deploy run; the endpoint's tool surface is unchanged by this plan.
- **Branch hygiene.** Delete each merged branch locally and remotely after merge (estate rule); a merged branch left behind is drift.
- **Per-task revert.** Task 1 is one YAML hunk plus one `.gitignore` line; Task 2 is three manifest lines plus one new test file (the test is version-agnostic and can stay); Task 3 is two manifest lines. Tasks 2 and 3 revert independently; Task 4 depends on both.

## Numbered tasks

Every task's commit appends its own `TASKS.md` row as `done — <command and output>`; no row is pre-written. The plan file itself is committed with Task 1's PR (it touches `docs/**`); its reviewer verdict precedes the first edit. Only the files named in this plan, `TASKS.md` and this plan file change — `docs/plan.md` and `docs/plan-vision-skill-only.md` are certified and must not be edited. Every commit uses the explicit pathspec named in its task, and `pnpm-lock.yaml` is gitignored from Task 1 onward (Q9). Each PR needs `reviewer` `ship` over unchanged bytes and `gh pr checks <PR>` exit 0 with `build-test` green before merge.

### Task 1 — Widen the CI pull-request paths (conditional) and pin the lockfile ignore

**Owner of this hunk: whichever plan merges first.** The vision plan's T1 is the same edit, also recorded as A00 at `docs/plan.md:105`. Decide, do not assume:

```bash
grep -q "packages/\*\*" .github/workflows/vdd-quality-gates.yml
```

- **Exit 0 (already widened by vision T1):** make **no edit** to `.github/workflows/vdd-quality-gates.yml`; record row `3.1` as `done — already widened by vision T1; <the grep command and its output>`. Continue with the `.gitignore` line below.
- **Exit 1 (today's state: paths are `vdd/**` and `references/**` only, `.github/workflows/vdd-quality-gates.yml:5-7`):** **append** the seven A00 entries — `packages/**`, `api/**`, `scripts/**`, `docs/**`, `package.json`, `server.json`, `vitest.config.ts` — to the existing list and **keep `vdd/**` and `references/**`**. The instruction is additive, not a replacement: `references/**` is the mechanism by which a docs-only PR over the 12 authoritative reference docs reaches `build-test`, and `vdd/**` does the same for methodology-artifact PRs, so replacing the list would narrow the workflow while looking like a widening.

Both branches: add `pnpm-lock.yaml` to `.gitignore`; if `git ls-files --error-unmatch pnpm-lock.yaml` exits 0, also `git rm --cached pnpm-lock.yaml` in the same commit (AGENTS.md records that no lockfile is committed).

Commit with an explicit pathspec, open the PR, append TASKS row `3.1`, merge after review and green checks. This plan file is **new/untracked**, and `git commit -- <pathspec>` does not stage an untracked file, so it is added explicitly first; the tracked workflow, `.gitignore` and `TASKS.md` take their working-tree content from the pathspec form, which stays so nothing else can slip into the commit:

```bash
git add docs/plan-dependabot-2026-11.md
git commit -- .github/workflows/vdd-quality-gates.yml .gitignore docs/plan-dependabot-2026-11.md TASKS.md
```

`verify:` (asserts the **final state**, so it passes in both branches and fails today; the required set is the seven A00 entries **plus** the two pre-existing ones, so a dropped `vdd/**` or `references/**` fails too):
```bash
python3 -c 'import yaml;d=yaml.safe_load(open(".github/workflows/vdd-quality-gates.yml"));p=d[True]["pull_request"]["paths"];need={"packages/**","api/**","scripts/**","docs/**","package.json","server.json","vitest.config.ts","vdd/**","references/**"};missing=need-set(p);assert not missing, missing'
grep -qx 'pnpm-lock.yaml' .gitignore
```
If PyYAML is unavailable, the single-point equivalent of the first line is `grep -q "packages/\*\*" .github/workflows/vdd-quality-gates.yml && grep -q "references/\*\*" .github/workflows/vdd-quality-gates.yml`. After merge, observe `gh run list --workflow=vdd-quality-gates.yml --branch=main --limit=1 --json conclusion --jq '.[0].conclusion'` → `success`; the PR-level proof is the first `packages/**`-only PR's checks.

### Task 2 — zod 4.6.6, remove the CLI's zod, add the schema contract test

1. `packages/vdd-engine/package.json:43` → `"zod": "^4.6.6"`.
2. `packages/vdd-mcp/package.json:54` → `"zod": "^4.6.6"`.
3. Delete `packages/vdd-cli/package.json:45`.
4. Add `packages/vdd-engine/test/types-schema.test.ts` with the 6 cases in the Test plan, importing **only** from `../src/index.js` (not `../src/types.js`).
5. `pnpm install --no-frozen-lockfile`.
6. Do **not** edit `types.ts`. The mapping table says no edit is expected; if `tsc` nevertheless fails, stop and record the exact diagnostic in the task row rather than guessing an edit.

Append TASKS row `3.2`; the test file is new, so stage it first, then commit with the pathspec form, open the PR, merge after review and green checks:

```bash
git add packages/vdd-engine/test/types-schema.test.ts
git commit -- packages/vdd-engine/package.json packages/vdd-mcp/package.json packages/vdd-cli/package.json packages/vdd-engine/test/types-schema.test.ts TASKS.md
```

`verify:`
```bash
test ! -e packages/vdd-engine/test/vision-retired.test.ts && test ! -e packages/vdd-mcp/test/retired-surface.test.ts   # ordering pin (N6)
pnpm --filter @simonmak-ascent/engine exec node -e "const [a,b,c]=require('zod/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>6||(b===6&&c>=6)))?0:1)"   # zod >= 4.6.6 — FAILS pre-change (3.25.76)
pnpm --filter @simonmak-ascent/mcp exec node -e "const [a,b,c]=require('zod/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>6||(b===6&&c>=6)))?0:1)"      # post-condition only — already 4.6.7 today
node -e "const p=require('./packages/vdd-cli/package.json'); if(p.dependencies.zod) process.exit(1)"          # declaration gone
pnpm -r build && pnpm check && pnpm test 2>&1 | grep -Eq 'Tests +85 passed'                                  # FAILS today (79)
gh pr checks <PR> --json name,state --jq '.[] | select(.name=="build-test") | .state' | grep -qx SUCCESS   # present AND green
```
Pre-change, the failing lines are the engine zod floor (`3.25.76`), the CLI declaration check, the test-count assertion (79, not 85) and the `build-test` check (none exists until the widening is on `main`). The **`vdd-mcp` zod line is not a control** — that package already resolves `zod@4.6.7`, so the line can only fail if the edit itself breaks it. The build/check/test line is the migration evidence for the whole task.

### Task 3 — vitest 4.1.11 in engine and mcp, one commit

1. `packages/vdd-engine/package.json:48` → `"vitest": "^4.1.11"`.
2. `packages/vdd-mcp/package.json:59` → `"vitest": "^4.1.11"`.
3. `pnpm install --no-frozen-lockfile`.

Both lines land in the same commit: the root config runs the mcp tests through the engine's runner, so a mixed 2/4 state can fail to collect them. Append TASKS row `3.3`, commit with `git commit -- packages/vdd-engine/package.json packages/vdd-mcp/package.json TASKS.md`, open the PR, merge after review and green checks.

`verify:`
```bash
test ! -e packages/vdd-engine/test/vision-retired.test.ts && test ! -e packages/vdd-mcp/test/retired-surface.test.ts   # ordering pin (N6)
pnpm --filter @simonmak-ascent/engine exec node -e "const [a,b,c]=require('vitest/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>1||(b===1&&c>=11)))?0:1)"   # vitest >= 4.1.11 — FAILS pre-change (2.1.9)
pnpm --filter @simonmak-ascent/mcp exec node -e "const [a,b,c]=require('vitest/package.json').version.split('.').map(Number);process.exit(a>4||(a===4&&(b>1||(b===1&&c>=11)))?0:1)"      # same floor — FAILS pre-change (2.1.9)
pnpm -r build && pnpm check && pnpm test 2>&1 | grep -Eq 'Tests +85 passed'   # FAILS today (79)
```
Pre-change, the lines that fail are the **floor assertions** and the count, not a version print: `pnpm … exec vitest --version` prints `vitest/2.1.9` and exits **0**, so it asserts nothing — which is why it was replaced. Both packages resolve 2.1.9 today, so both floor lines fail before the change and pass after. A 37-passed result is a failure of this task, not a pass (Test plan).

### Task 4 — Release 1.10.1

Precondition, before any bump — the release must not publish the vision plan's 13-tool code. That plan lands the removal on `main` at T5 and only bumps at T9, so a patch published in that window would ship a breaking removal under `1.10.1`:

```bash
grep -q 'Expand Vision' packages/vdd-mcp/src/server.ts || { echo 'vision code already on main (T5 landed) — 1.10.1 would be a breaking patch'; exit 1; }
grep -q '14 tools' packages/vdd-mcp/package.json || { echo 'vision count sweep already on main (T8 landed) — 1.10.1 would be a breaking patch'; exit 1; }
```

Both strings are present today — `packages/vdd-mcp/src/server.ts:67` and `packages/vdd-mcp/package.json:4` — and they flip at different tasks, so one marker alone leaves the T5→T8 window open. If either fails, stop and report — the release must be sequenced with the vision plan's release, not around it.

1. Bump the eight version surfaces: three `package.json:3`, `server.json:6` and `:32`, `api/_vdd-rpc.js:880`, `packages/vdd-mcp/src/server.ts:106`, `packages/vdd-cli/src/cli.ts:6`.
2. Insert the CHANGELOG section per the File-by-file row, with the three Q6 consumer actions verbatim: (a) compose or serve these schemas only with `zod@^4.6.6`; (b) errors from `.parse()` are zod-4 errors — read `.issues` and `z.treeifyError()`, not `.errors`/`format`/`flatten`; (c) `instanceof` against a zod-3 `ZodError` no longer matches. Add the sentence that a reader who cannot accept those three in a patch note requires `2.0.0`.
3. `README.md:12` badge; `scripts/gen-landing.py:22`; run `python3 scripts/gen-landing.py`.
4. Append TASKS row `3.4`, commit with `git commit -- packages/vdd-engine/package.json packages/vdd-cli/package.json packages/vdd-mcp/package.json server.json api/_vdd-rpc.js packages/vdd-mcp/src/server.ts packages/vdd-cli/src/cli.ts README.md scripts/gen-landing.py index.html zh/index.html hk/index.html CHANGELOG.md TASKS.md`, open the PR, merge after review and green checks.
5. On `main`, tag and push: `git tag -a v1.10.1 -m "v1.10.1 — zod 4.6.6, vitest 4.1.11" && git push origin v1.10.1`; watch `gh run list --workflow=publish-npm.yml --limit=1 --json conclusion,headSha`.

`verify:` (before merge; the first two lines are the precondition, re-run here)
```bash
grep -q 'Expand Vision' packages/vdd-mcp/src/server.ts || { echo 'vision code already on main (T5 landed) — 1.10.1 would be a breaking patch'; exit 1; }
grep -q '14 tools' packages/vdd-mcp/package.json || { echo 'vision count sweep already on main (T8 landed) — 1.10.1 would be a breaking patch'; exit 1; }
node -p '["packages/vdd-engine/package.json","packages/vdd-cli/package.json","packages/vdd-mcp/package.json"].map(f=>require("./"+f).version).join(",")' | grep -qx '1.10.1,1.10.1,1.10.1'
test "$(grep -c '"version": "1.10.1"' server.json)" = 2
grep -q 'const SERVER_VERSION = "1.10.1";' api/_vdd-rpc.js
grep -q "version: '1.10.1'" packages/vdd-mcp/src/server.ts
grep -q ".version('1.10.1')" packages/vdd-cli/src/cli.ts
grep -q 'version-1.10.1-blue' README.md
grep -q 'VERSION = "1.10.1"' scripts/gen-landing.py
grep -q 'v1.10.1' index.html && grep -q 'v1.10.1' zh/index.html && grep -q 'v1.10.1' hk/index.html
test "$(grep -n '^## \[1.10.1\]' CHANGELOG.md | cut -d: -f1)" -lt "$(grep -n '^## \[1.10.0\]' CHANGELOG.md | cut -d: -f1)"
grep -q 'zod@^4.6.6' CHANGELOG.md && grep -q '2.0.0' CHANGELOG.md          # the consumer contract is present
pnpm -r build && pnpm check && pnpm test 2>&1 | grep -Eq 'Tests +85 passed'   # same-bytes suite gate, now an assertion
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete   # exit 0
```
The version/date assertions fail before the bump; the suite and plan-gate lines are the same-bytes gate. Rollback before publish: revert the commit; delete the tag if it was pushed and the workflow did not publish (see Risks).

### Task 5 — Prove the alerts closed and the release is live

`verify:` — every line asserts and must be observed, not inferred:
```bash
test "$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=open&per_page=100' --jq 'length')" = 0
raw=$(gh api 'repos/simonmak-ascent/vision-driven-design/dependabot/alerts?state=all&per_page=100' --jq '.[] | select(.state != "fixed") | "\(.number):\(.state)"') || { echo 'alerts API failed'; exit 1; }
test -z "$raw" || { echo "not fixed: $raw"; exit 1; }
test "$(npm view @simonmak-ascent/engine@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/cli@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/mcp@1.10.1 version)" = 1.10.1
test "$(npm view @simonmak-ascent/engine@1.10.1 dependencies.zod)" = '^4.6.6'
test -z "$(npm view @simonmak-ascent/cli@1.10.1 dependencies --json | grep '"zod"' || true)"
node scripts/verify-publish.mjs
curl -sS https://vdd.simonmak.com/api/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}' | grep -Eq '"version": ?"1\.10\.1"'
rsync -a --delete packages/vdd-mcp/dist/ ~/.npm-global/lib/node_modules/@simonmak-ascent/mcp/dist/
chmod +x ~/.npm-global/lib/node_modules/@simonmak-ascent/mcp/dist/stdio.js
grep -q '1.10.1' ~/.npm-global/lib/node_modules/@simonmak-ascent/mcp/dist/server.js
```

Append TASKS row `3.5` in a docs-only commit (`git commit -- TASKS.md`) recording the observed outputs (this row cannot be in the release commit — no commit observes its own publish); that commit is the one exception to "the row ships with the work", and it names the alert count, the three npm versions and the endpoint version.

## 8. Review response

1. **Alert closure printed instead of asserting.** Replaced both blocks with an assertion pair (open count `= 0`; every state `!= fixed` fails, so `dismissed` also fails); ids are derived and printed on failure, never iterated as `1..6`; the pair is run before the change and expected to fail (Q7, Verification, Task 5).
2. **Task 1 duplicated the vision plan's T1.** Task 1 is now conditional on `grep -q "packages/\*\*"`, names the shared hunk's owner as "whichever plan merges first", and records `3.1` as `done — already widened by vision T1` when the edit is a no-op; the verify still asserts the final state.
3. **Release boundary pinned to the wrong event.** Task 4 gained the `grep -q '14 tools' packages/vdd-mcp/package.json` precondition, repeated as its first verify line, so `1.10.1` cannot publish the vision removal. (Round 2 N2 extends this: one marker left the T5→T8 window open.)
4. **Presence-only `build-test` check.** Task 2 now requires `state == SUCCESS` via `--json name,state`.
5. **Version rationale understated the zod-4 break.** Decision, Q6, Risks and Task 4's CHANGELOG now carry the three runtime/type consumer actions and state that rejecting them means `2.0.0`.
6. **Test import path unspecified.** Pinned to `../src/index.js` (the `main`/`types` entry, `packages/vdd-engine/package.json:7-8`), with the divergence from the other engine tests stated.
7. **Task 5 had no `verify:` and no assertions.** Labelled, and every line is now a `test`/`grep -q`/`grep -qx` assertion.
8. **No-lockfile premise had no control.** `.gitignore` gains `pnpm-lock.yaml` in Task 1 (with the tracked-file conditional), and every commit names explicit pathspecs.
9. **Rollback restored only `mcp`.** Risks now restores `latest` for `@simonmak-ascent/engine` and `@simonmak-ascent/cli` as well.
10. **This section.** Each finding is listed with its resolution in one line.

### Round 2 (reviewer) response

- **N1 (blocker) — the new test could not compile as specified.** Case 6 no longer parses the delegation schema directly: `Delegation` is declared at `src/types.ts:31` but is **not** re-exported by `src/index.ts:3`, so the case exercises the envelope through the exported container (`VddOutput.parse({ success: true, delegation: { …, kind: 'read' } })`, `src/types.ts:51`), using only the exported schema. Adding the re-export was rejected as a public-API change under a patch. Test plan case 6, the import paragraph and the file-by-file row state this.
- **N5 (blocker) — Task 2/3 verifies could not fail, and two stated pre-change failures were false.** Both tasks and the baseline block now use `node -e` floor assertions that exit non-zero below the floor (zod `>= 4.6.6`, vitest `>= 4.1.11`). The `vdd-mcp` zod line is labelled a **post-condition only** (that package already resolves `4.6.7`, `pnpm-lock.yaml:604`) rather than a second `3.25.76`. The false "fails on the versions (`2.1.9`)" claim is corrected: `vitest --version` exits 0, so the floor assertion is the line that fails. The test count is now asserted — `pnpm -r build && pnpm check && pnpm test 2>&1 | grep -Eq 'Tests +85 passed'` — and both tasks say it fails today at 79.
- **N3 (medium) — `git commit -- <path>` does not add untracked files.** Task 1 runs `git add docs/plan-dependabot-2026-11.md` and Task 2 runs `git add packages/vdd-engine/test/types-schema.test.ts` before their commits; both keep the pathspec form, which still supplies the tracked modifications.
- **N4 (medium) — Task 1's wording could silently drop `references/**`.** The edit is now **additive** (append the seven A00 entries, keep `vdd/**` and `references/**`), with the reason stated: `references/**` is how a docs-only PR over the authoritative reference docs reaches `build-test`. The verify's required set is the nine-entry superset, so dropping either pre-existing entry fails it.
- **N2 (medium) — the release guard had a blind window.** Task 4's precondition and first verify line now require **both** markers: `grep -q 'Expand Vision' packages/vdd-mcp/src/server.ts` (present at `:67`, removed at the vision plan's T5) and `grep -q '14 tools' packages/vdd-mcp/package.json` (present at `:4`, removed at T8). The Risks bullet names the T5→T8 window that a single marker left open.
- **N6 (low) — the 85 count was absolute.** The ordering is **pinned**: this plan's Tasks 2–3 merge before the vision plan's T2/T3, which would add `packages/vdd-engine/test/vision-retired.test.ts` and `packages/vdd-mcp/test/retired-surface.test.ts` (`docs/plan-vision-skill-only.md:510-511`, `it.skip` at `:334-335`). Both tasks assert it with `test ! -e` on those two paths, and the Test plan says an already-present fixture is a violated ordering to record and stop on, never a reason to edit the expected 85.
- **N7 (low) — the closure pair's second line was fail-open.** The payload is captured with `raw=$(gh api …) || { echo 'alerts API failed'; exit 1; }` and then tested, so an auth or network error aborts instead of reading as clean. Applied in the baseline block, the post-merge block and Task 5.
