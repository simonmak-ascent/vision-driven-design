# Implementation plan — VDD 2.0.0: three tools, nine skills, stateless (v3)

Repository: `/home/simonmak/git/vision-driven-design`.
Spec: `docs/restructure_plan-20261126.md` ("v5.0").
Depth: **thorough** — cross-cutting (protocol facts, engine, both MCP surfaces, CI, deploy); v3 re-verified every
locator the §17 findings cite, including the round-3 ones.
Current state: 1.10.1, 14 tools / 20 prompts / 108 declared checks / 10 test files (`packages/*/test/*.test.ts`, globbed at plan time), published and deployed. v3 applies the review findings listed in §17; it is a patch to v1, not a redesign.

This plan is written to be executed by an agent that has not read the spec conversation. Where the spec and a
verified fact disagree, the fact wins and §2 says so. Every locator below was read at plan time; §14 tasks re-derive
theirs at execution.

---

## 1. Decision

Replace the 14-tool, 20-prompt, filesystem-writing VDD MCP server with **three pure tools over text**
(`vdd_check`, `vdd_chain_validate`, `vdd_amend`), ship the nine phase procedures as Agent-Skills documents served
from the server (`skills/list`, `skills/get`, `skill://`), make both surfaces stateless and advertise protocol
revision `2026-07-28` via a real `server/discover`, and delete the engine's write phases, its eight gates and its
`e2e` — releasing as **2.0.0** with a migration document and no alias window. Three things make this safe to order:
the coverage engine is new code tested before anything calls it (4.1); the surface swap is one atomic commit because
`api-surface.test.ts` compares stdio against the hosted twin (4.4); and the deletion of the engine (4.5) happens
after the surface stops importing it, so every commit leaves `pnpm -r build && pnpm check && pnpm test` green.

---

## 2. Verified corrections to the spec — the facts that win

| # | Spec says | Verified fact | Consequence |
|---|---|---|---|
| 1 | `@modelcontextprotocol/sdk` **v1.7.0+** with `Stateless: true` (`restructure_plan-20261126.md:203`, `:425`) | The repo already depends on **`@modelcontextprotocol/server` `^2.0.0`** (`packages/vdd-mcp/package.json:53`), the v2 line. The v1 SDK is the maintenance line and stops at 2025-11-25; there is no `Stateless` option in any version | Phase 1 of the spec's checklist is **replaced**: stateless is expressed as `sessionIdGenerator: undefined` on the transport, which the v2.4.0 docs state directly: "the 2026-07-28 revision is per-request and has no `Mcp-Session-Id` … leaving it `undefined` is stateless mode" (`https://github.com/modelcontextprotocol/typescript-sdk/blob/v2.4.0/docs/serving/sessions-state-scaling.md`) |
| 2 | Aliases for old tool names for one release (`:52`, `:445`, criterion 10 at `:489`) | Criterion 2 (`:482`) requires `tools/list` to return **exactly 3** tools. More importantly the old names' input contracts do not map: `vdd_vision` takes `{statement, projectRoot}` (`packages/vdd-mcp/src/server.ts:31`), while `vdd_check` takes `{phase, content, declaredCounts}` | **Aliases dropped**, with reasons, in §6. The two criteria contradict each other and the mapping is meaningless for 13 of 14 names |
| 3 | Delete `api/sse.js` (`:471`) | There is no `api/sse.js`. `api/` holds only `_vdd-rpc.js` and `mcp.js`; `vercel.json:7-13` already 308s `/api/sse` to `/api/mcp` | Nothing to delete; SSE is already retired |
| 4 | `vdd_clone` is a removed tool (`:471`) | Removed in PR #18; the token survives only in `CHANGELOG.md` and the spec itself (`TASKS.md:12-13`) | Not a target |
| 5 | `serves_(goal\|pillar\|action\|spec\|component):` fields, regex at `:212` | **These fields do not exist anywhere in the repo's artifacts.** `grep -rn 'serves_'` matches only `docs/restructure_plan-20261126.md` (13 hits). `references/artifact-templates.md` links phases by a free-text `> Impact Chain: V-001 → S-002 → T-003` header (`:91`, `:191`, `:287`) and a **Pillar column** in the tactics table (`:333-336`) | The coverage engine would have no input on real artifacts. **4.2 introduces `serves_*` into the five phase templates** as the machine-readable link, and the `Impact Chain` header becomes a derived human summary |
| 6 | Vision goals are `V-001…V-00N`, N≥3, each with a numeric metric, plus non-goals (`:326-334`) | The vision template has **no IDs at all** — `## Vision Statement`, `## Impact Model`, `## Success Metrics` (`references/artifact-templates.md:97,104,132`). The certified-direction framework v16 has `OBJ-###` objectives with `metric` and `baseline → target` (`docs/vision-framework-v16.md:113`) and **no** `V-` ids | This is the fork in §5, not a detail |
| 7 | `declaredCounts` requires all six keys on every phase (`:92`), and states cross-key inequalities between *declared* numbers (`declaredCounts.actions >= declaredCounts.pillars` at `:358`, `components >= specs` at `:393`, `tasks >= components` at `:405`); but its §8 fixture calls `vdd_check({phase:"tactics", content})` with **no `declaredCounts`** and expects `"action_count=1 < pillar_count=3"` (`:504`, `:508`) — a comparison of two counts **derived from the text** | A `constitution` or `vision` call has no pillars, actions, specs, components or tasks, so requiring all six keys is unworkable; and two *declared* numbers are not a property of the artifact text | Three rules, stated separately in 4.1. (a) Keys are optional; a phase checks only the keys it consumes. (b) `checkCounts(declared, actual, phase)` keeps the per-key **`declared == actual`** check, unchanged. (c) A separate cross-key rule, `checkCrossKeyActual(matrix)`, compares the **actual** counts derived from the text — for `tactics`, the actions found in `content` against the pillars found in `priorArtifacts.strategy` — and emits the literal `action_count=<n> < pillar_count=<m>` when actions < pillars. Only the spec's *declared-vs-declared* inequalities are dropped, and for the reason that survives: they compare two numbers the caller typed, which no artifact text can fail. Rule (c) is implied by invariant C (a dedicated child per parent forces children ≥ parents) yet is still printed, because the §8 fixture makes the string part of the output contract. No reason string beyond the one the spec prints is invented, so `strategy`, `plan` and `tasks` add no cross-key reason |
| 8 | Every result carries `resultType` (`:295`) | True of the protocol, **unverified for the SDK**: whether `McpServer.registerTool` emits it is not documented in the v2.4.0 pages read. The hand-written hosted handler certainly does not (`api/_vdd-rpc.js:1230-1239` returns bare `{result}`) | An acceptance test asserts presence on **both** surfaces (§11.4 criterion 9); if the SDK omits it, the stdio result is wrapped in 4.4 |

Protocol baseline this plan builds on (researched, not the document's claims): revision **2026-07-28** is the current
released spec; `server/discover` is mandatory and its result carries `supportedVersions`, `capabilities` and
`_meta['io.modelcontextprotocol/serverInfo']`; statelessness is mandatory and a stray `Mcp-Session-Id` must be
ignored, not minted; `UnsupportedProtocolVersionError` is code `-32022` with `data: {supported, requested}`; request
metadata is flat slash-keys in `params._meta` with `MCP-Protocol-Version` mirrored on HTTP (mismatch ⇒ 400); SEP-2640
"Skills Extension" is **Final but Beta in host support**.

---

## 3. Open questions

1. **Which `@modelcontextprotocol/server` is actually installed, and does it emit `resultType` / answer
   `server/discover` itself — and does `initialize` survive at all?** `node_modules/` is absent in this checkout
   (`glob node_modules/@modelcontextprotocol/*` → no files), so the API was confirmed from the v2.4.0 documentation,
   not from the installed package. Statelessness removes the handshake, so a 2025-era client's first call may be
   either answered as a sessionless no-op or refused; the plan asserts nothing about it that the probe cannot prove.
   *Settles it:* 4.4 step 0 — `pnpm install --no-frozen-lockfile`, then read
   `node_modules/@modelcontextprotocol/server/package.json` (version) and `grep -r 'resultType\|server/discover'
   node_modules/@modelcontextprotocol/server/dist` — and record both in row 4.4. If the SDK answers neither, 4.4 adds
   a thin wrapper; that is a smaller change than the alternative of hand-writing the stdio surface.
2. **Does Vercel's file tracing follow a CJS `require`'d module's `import('../packages/…/dist/x.js')`?** Unknown from
   here. *Settles it:* 4.4's hosted-transport test (Node, not Vercel) proves the code path; 4.9's production probe
   proves the deployment. Fallback if the deploy 500s: `vercel.json` gains
   `"functions": {"api/mcp.js": {"includeFiles": "packages/vdd-engine/dist/**"}}` — a one-line change, stated here so
   it is not discovered under pressure.
3. **Exact per-test counts today.** The file count is **10** (`packages/*/test/*.test.ts`, globbed at plan time); the
   `9 files / 85 tests` in `TASKS.md:18-19` predates the tenth. The
   count of tests that die with their subject in 4.5 must be measured, not asserted; row 4.5 records
   `pnpm --filter @simonmak-ascent/engine test --reporter=verbose` before and after.
4. **Does `api/mcp.js` have to stay CommonJS?** Its two neighbours are CJS and `AGENTS.md` names it "plain
   CommonJS"; the root `package.json` has no `"type": "module"`. This plan assumes CJS and reaches ESM `dist` by
   dynamic `import()` with a literal specifier. Not verified beyond that.
5. **Nothing else is open, including the count rule.** The vision fork (§5) is presented as a fork because the
   operator owns it; the plan recommends and proceeds on the recommendation so that no task depends on a decision.
   The count rule is settled too and is no longer framed as a deviation from the spec: per-key `declared == actual`
   in `checkCounts`, plus the actual-vs-actual `action_count=<n> < pillar_count=<m>` reason the spec's §8 fixture
   prints (§2 row 7, §11.1 items 1 and 4). What the spec's table states between two *declared* numbers stays
   dropped, for the reason that applies to it.

---

## 4. What this supersedes

**`docs/plan-vision-skill-only.md` — abandoned from T3 onward.** That plan is certified and mid-execution: T0a,
T0b, T1 and T2 landed as `TASKS.md` rows 2.1–2.4; **T3–T10 are abandoned** because the surface they edit (13 tools,
19 prompts, 6 gates, 91 checks) is itself being replaced. Specifically:

| Its task | Fate |
|---|---|
| T3 (`retired-surface.test.ts`) | Abandoned; never written (`packages/vdd-mcp/test/` has 4 files, no `retired-surface`) |
| T5 (atomic vision removal) | **Superseded** by 4.4+4.5, which remove 11 tools where it removed one |
| T6 (`docs-vision-parity.test.ts` + four skill documents) | **Partly survives, and the rest is rehomed rather than subsumed.** Its authority, `docs/vision-framework-v16.md`, is the source for 4.2/4.3. Its three document-side assertions move into 4.6's count-parity test: `G1–G7` absence (`README.md:149` and `references/compliance-evidence.md:65` both still read `G1–G7` today) and the seven `§0`–`§6` artifact headings of `docs/vision-framework-v16.md:94-132` inside the vision template |
| T7–T9 (references, count sweep to 13/19/91, release 1.11.0) | Superseded by 4.6 and 4.7 (3 tools / 0 prompts / 9 skills / 2.0.0) |
| T10 (merge, deploy, probe) | Superseded by 4.8–4.9 |
| T2 (`vision-retired.test.ts`, committed with `it.skip` on five cases, `TASKS.md:23`) | **Retained until 4.5, then deleted with its subject.** Those five cases assert that the vision phase, `gate1` and the `108` total behave one way; under 2.0.0 the phase and the gate are gone, so greening them is pointless. They must not be left skipped: 4.5 deletes the file and row 4.5 says so. Leaving five `it.skip` cases in a tree whose subject they lose is the failure this row prevents |

**`docs/plan.md` "Release 2.0.0" block (`:145-167`, C1–C18) — superseded in content, kept in number.** Its 2.0.0 is a
5-tool registry with generated `server.ts`/`cli.ts` and a build-time skill manifest. C1/C2/C5 (5-tool registry,
generated surfaces), C8/C10 (runtime manifest + `vercel.json includeFiles`), C15/C15a (15-tool copy sweep) and C16's
`references/` tarball assertion are **not** done here: the surface is 3 tools, not 5; the skill manifest is compiled
into `dist` (so no `includeFiles` and no `files` change); and the copy sweep is a 3-tool sweep. What **is** kept:
2.0.0 as the version (C16's number), C4's `prompts/list → []`, C9's "delete `_vdd-rpc.js`", C13/C14's contract-check
*intent* (realized here as 4.6's count fixture, not as a new `scripts/check-contract.mjs`), and C18's post-publish
`npm deprecate`.

`docs/plan.md` and `docs/plan-vision-skill-only.md` are **records and are not edited**. Their staleness is recorded
in `CHANGELOG.md` under 2.0.0 (4.7) — the only place a reader of a released version looks.

**`TASKS.md` rows 2.1–2.4 stay `done` and unchanged.** They are true: those commits landed. The abandoned rows
2.5–2.10 are **never written**: a row records a commit that delivered something (`TASKS.md:1-5`), so abandoned work
gets no row at all. New work continues at **4.1** — no `ready` row, no `blocked by <completed row>` row, because the
first exits 1 and the second exits 2 at `~/.config/opencode/bin/plan-state.py`.

---

## 5. The vision fork (operator decision, presented not taken silently)

Two documents claim Phase 1. `docs/vision-framework-v16.md` (status "proposal", `:3`) defines §0–§6: claim ledger,
1–5 observations with locator/quote/triangulation, a coverage grid `problems × material actors × approaches`,
`OBJ-###` objectives with `metric` and `baseline → target`, and **no scores, ranks or buckets** (`:39`, `:127`) with a
candidate count "derived from a coverage grid, never a target" (`:38`). The spec's §4.2 requires `V-001…V-00N` with
N ≥ 3, a numeric metric per goal, and a non-empty non-goals section (`:326-334`). The repo's own vision template
matches **neither** — it has prose headings and no ids (`references/artifact-templates.md:97-169`).

**Branch A — v16 governs, with one recorded projection (recommended).**
`skills/vdd-vision/SKILL.md` is the v16 procedure verbatim; the artifact is the seven `§0`–`§6` headings of
`docs/vision-framework-v16.md:94-132`; and a new closing section `## Chain projection` lists `V-###` — one per goal
the decision selected, each mapped to its `OBJ-###` — with non-goals taken from §0's `out_of_scope` ledger entries.
**`OBJ-###` stays the authoritative identity** (`docs/vision-framework-v16.md:113`); `V-###` is a *projection key*
that exists so the downstream phases have a `V-` parent. The projection line is `V-001 → OBJ-003` and **must not
restate the objective's `metric` or `baseline → target`** — a second copy of a metric is exactly the drift this
avoids — and the test asserts that every `V-###` resolves to a **distinct, existing** `OBJ-###` (one objective may
not back two goals). `vdd_check{phase:'vision'}` then asserts: the seven headings exist, ≥1 `V-###` exists, every
`V-###` resolves to a distinct existing `OBJ-###`, the metric is referenced rather than restated, `out_of_scope` is
non-empty, and `declaredCounts.goals == actual`.

On the count floor: v16 §2.5 (`:38`) forbids a **candidate**-count target ("derived from a coverage grid, never a
target"); it says nothing about objectives. The objective bound is **preset-relative** in v16 §8 (`:199-201`):
Product 3–5, Feature 2–3, Lean 1, with the preset recorded in §0 of the artifact (`:96`). So the plan does **not**
assert `N ≥ 3`; it asserts `declaredCounts.goals` equals the actual `V-###` count **and** falls inside the §8 bound
for the declared preset (the v1 reason — "a count floor is the target §2.5 forbids" — misread §2.5 and is replaced).
It does not require a section named "Non-goals".
*Cost:* one amendment document (`docs/vision-framework-v17.md`, a 30-line delta — 4.2) and a parser that reads two
grammars (v16 body + projection). *Benefit:* the evidence discipline survives, the in-flight framework is the source
rather than the casualty, and the chain still gets `V-` parents.

**Branch B — the spec's §4.2 governs.**
Vision becomes a cheap template: N ≥ 3 goals, a metric each, non-goals. *Cost:* `docs/vision-framework-v16.md` becomes
dead weight, the vision skill is rewritten a second time, and the evidence ledger, triangulation and coverage grid —
the parts that make a vision auditable — are dropped from Phase 1 while remaining in the other eight skills. *Benefit:*
the gate is four regexes, and `declaredCounts.goals == N` is directly checkable.

**Recommendation: Branch A.** The rest of this plan assumes it; a switch to B changes 4.2's template, the vision
`SKILL.md` in 4.3 and the vision assertions in 4.1's test — nothing in 4.4–4.10 moves — so the fork is cheap to take
either way. It is stated here because the operator owns the framework, and a silent choice would be the plan editing a
document it did not write.

---

## 6. Tool surface, aliases, prompts

**Surface after 2.0.0: 3 tools, 0 prompts, 9 skills.**

| Tool | Input | Returns |
|---|---|---|
| `vdd_check` | `{phase, content, declaredCounts?, priorArtifacts?}` | `{resultType, status, reasons, declared_counts, actual_counts, coverage{forward_covered, backward_sound, dedicated, matrix}}` |
| `vdd_chain_validate` | `{artifacts, declaredCounts?}` | the same, plus a per-phase breakdown and the V→TK path check |
| `vdd_amend` | `{content, declaredCounts?, priorArtifacts, changeDescription}` | the same, plus `impactedArtifacts: [{phase, reason}]` |

All three are pure: no `projectRoot`, no fs, no network, no `writeTargets`, no `delegation` envelope. Both surfaces
call one implementation, so the hosted/local split that the 1,569-line twin exists to model disappears.

**Aliases: dropped, and here is why.** (a) The spec contradicts itself — criterion 10 wants aliases working while
criterion 2 wants `tools/list` to return exactly 3 (`:482`, `:489`); aliases hidden from `tools/list` would be
undocumented call-time magic. (b) The mapping is undefined for 13 of the 14 names: `vdd_vision` is handed a
`statement` and *generates* a file; `vdd_check` is handed `content` and *judges* it. Aliasing would either fabricate
content (a PASS or FAIL over nothing) or silently no-op. (c) `vdd_amend` is the one name that survives — but its
argument schema changes from `{description, projectRoot}` to `{content, priorArtifacts, changeDescription}`, so it is a
breaking change, not an alias. The replacement for discoverability is: an unknown tool name returns JSON-RPC
`-32602` whose message names `docs/migration-2.0.md` and that name's successor from the tables below — or the literal
words `no successor` where the table says so (three tools have none); plus `npm deprecate` on 1.x.

**Every removed name and its successor.** Fourteen tools and twenty prompts are removed. The replacement is the nine
skills plus the three tools. The tables are exhaustive; `docs/migration-2.0.md` (4.4) must reproduce them verbatim, so
a user can find every name — including the three tools and four prompts that have no successor.

| Removed tool | Successor |
|---|---|
| `vdd_init` | skill `vdd-constitution`; judged by `vdd_check{phase:'constitution'}` |
| `vdd_vision` | skill `vdd-vision`; judged by `vdd_check{phase:'vision'}` |
| `vdd_strategize` | skill `vdd-strategy`; judged by `vdd_check{phase:'strategy'}` |
| `vdd_tactics` | skill `vdd-tactics`; judged by `vdd_check{phase:'tactics'}` |
| `vdd_specify` | skill `vdd-specs`; judged by `vdd_check{phase:'specs'}` |
| `vdd_clarify` | **no successor** — a spec is authored and judged in one pass; the clarification loop is gone |
| `vdd_plan` | skill `vdd-plan`; judged by `vdd_check{phase:'plan'}` |
| `vdd_tasks` | skill `vdd-tasks`; judged by `vdd_check{phase:'tasks'}` |
| `vdd_get_next_task` | **no successor** — task order is prose in the tasks artifact the agent already holds |
| `vdd_implement` | skill `vdd-implement` |
| `vdd_validate` | skill `vdd-validate`; judged by `vdd_chain_validate` |
| `vdd_inspect` | `vdd_chain_validate` (the matrix half); there is no project scan — the tool is pure |
| `vdd_amend` | `vdd_amend` — same name, changed input `{content, priorArtifacts, changeDescription}` |
| `vdd_detect_environment` | **no successor** — the connected host's tool list is the agent's own context |

| Removed prompt | Successor |
|---|---|
| `start_vdd_project` | skill `vdd-constitution`, opening section |
| `implement_next_task` | skill `vdd-implement`, opening section |
| `change_requirement` | `vdd_amend` + the skill of the phase the change lands in |
| `init` | skill `vdd-constitution` |
| `vision` | skill `vdd-vision` |
| `strategize` | skill `vdd-strategy` |
| `tactics` | skill `vdd-tactics` |
| `specify` | skill `vdd-specs` |
| `clarify` | **no successor** |
| `plan` | skill `vdd-plan` |
| `tasks` | skill `vdd-tasks` |
| `get-next-task` | **no successor** |
| `implement` | skill `vdd-implement` |
| `validate` | skill `vdd-validate` |
| `inspect` | `vdd_chain_validate` (no prompt) |
| `trace` | `vdd_chain_validate`'s V→TK path check |
| `analyze` | `vdd_chain_validate`'s per-phase breakdown |
| `amend` | `vdd_amend` (no prompt) |
| `detect-environment` | **no successor** |
| `e2e` | **no successor** — it was CLI-only, and the sequence it duplicated no longer exists |

`prompts/list` returns `[]` — the decision `docs/plan.md` C4 already took.

---

## 7. Skills bundling

**Location:** `skills/<name>/SKILL.md` at the repository root, names `vdd-constitution`, `vdd-vision`, `vdd-strategy`,
`vdd-tactics`, `vdd-specs`, `vdd-plan`, `vdd-tasks`, `vdd-implement`, `vdd-validate`. No `skills/` directory exists
today.

**How they reach the wire:** a build-time generator, `scripts/gen-skill-manifest.mjs`, writes
`packages/vdd-mcp/src/generated/skills.ts` — an exported array of `{name, description, body, sha256, size, uri}` read
from `skills/*/SKILL.md`. It is committed (like `index.html`) and re-generated only deliberately, with an idempotency
assertion (`gen && git diff --exit-code`). Consequences, each load-bearing:
- no runtime `fs` on either surface, so the hosted function needs no `includeFiles`;
- `packages/vdd-mcp/package.json` `files` stays `["dist"]` (`:12-14`) — the manifest is compiled in;
- one source of truth: `skills/` on disk, the manifest a projection, and a test that recomputes every digest from
  disk and fails on drift.

**Frontmatter, per the Agent Skills specification:** `name` 1–64 chars, `[a-z0-9-]`, matching the parent directory,
no leading/trailing hyphen and no consecutive hyphens; `description` 1–1024 chars. Those five are asserted, because
each is a rule a hand-written file can break. The "<5000-token body" tier is *measured and reported* in row 4.3, not
asserted: counting tokens needs a tokenizer this repo does not depend on, and a character-count proxy would be an
invented rule. Progressive disclosure is the design; the assertion is on the frontmatter and on body non-emptiness.

**Relationship to the root `SKILL.md`.** The root file is the installed methodology skill — `scripts/install.sh`
copies this repo into `~/.config/opencode/skills/vision-driven-design`, and that directory is scanned **one level
deep** (estate `AGENTS.md` §4), so `skills/vdd-vision/` nested inside it is *not* discoverable by the host. Decision:
the root `SKILL.md` remains the entry point and gains a pointer to `skills/`; the nine nested skills are
**MCP-served only** in this release. Making them host-discoverable means teaching `install.sh` to symlink each into
`~/.config/opencode/skills/` — a separate, reversible change, named here and deliberately out of scope.

**A client that does not implement SEP-2640** (which is where the extension is today: Final, Beta in hosts) sees:
`tools/list` with 3 tools, and `server/discover` capabilities **without** an `extensions.skills` key it can use.
`skills/list` and `skills/get` **always answer** — they are plain JSON-RPC methods on both surfaces, and no client
negotiation is involved. (v1 of this plan said a non-SEP-2640 client would see `-32601`; that was wrong and is
deleted, because 4.9's probe POSTs `skills/list` with no protocol negotiation and requires 9, and criterion 6 does
the same.) SEP-2640 governs whether a host *advertises* and *dispatches* the extension, not whether the methods
exist. Each tool description therefore names the skill directory and the repo URL, and `docs/migration-2.0.md` says
where to read the skills from disk. Nothing may assume a host implements the extension.

---

## 8. Deletion: what remains of the engine

`packages/vdd-engine/src/engine.ts` is **1,593 lines**. After 2.0.0:

| Goes (locators, plan time) | Lines |
|---|---|
| `writeArtifact:24`, `init:97`, `vision:147`, `readTargetDomains:192`, `strategize:216`, `auditRepo:294`, `tactics:330`, `specify:397`, `clarify:440`, `plan:482`, `tasks:555`, `nextTask:576`, `implement:604`, `validate:630` | ~630 |
| `trace:775`, `analyze:809`, `inspect:847`, `amend:854`, `detectEnvironmentPhase:873` | ~110 |
| `gate0–gate7:1049-1350`, `makeGateFail:1352`, `tallyGate:1357`, `gateSummary:1369`, `e2e:1386-1569` | ~520 |
| `RAW_PHASES`/`PHASES`/`WRITE_PHASE_NAMES:1571-1593` | 23 |
| `feature-arg` choke point `isValidFeatureName:53` (no `feature` input survives), `withFeature:80`, `listFeatureDirs:66` | ~30 |

**Remains:** the small content helpers worth lifting rather than re-writing — `hasSection:922`,
`impactChainMatches:926`, `extractChain:931`, `lastChainId:936` (~40 lines) — plus the new `coverage.ts`
(~250 lines: `extractIds`, `buildMatrix`, `checkInvariants`, `checkCounts`, the phase dispatch table,
`amendImpact`). `countPlaceholders:967` and `countSubstancePlaceholders:978` are **not** lifted: the accounting
below drops the placeholder-density gate, and a helper no invariant calls is dead code. `meta.ts`, `types.ts` and
`project-root.ts` lose their phase maps but keep their types.

**Test coverage that dies with its subject.** **10 files** (`packages/*/test/*.test.ts`, globbed at plan time; the
`9 files / 85 tests` in `TASKS.md:18-19` predates the tenth, and the per-test count is measured in row 4.5, not
asserted here). `graceful-input.test.ts`, `validate.test.ts`, `feature-arg.test.ts` and five of the six cases in
`vision-retired.test.ts` test the deleted phases directly; `http-transport.test.ts:49` asserts a session id is
issued, which 2.0.0 forbids; `server-surface.test.ts` asserts the 14-tool registry; most of
`api-surface.test.ts` (14 tools, delegation envelopes, prompt parity) is replaced rather than amended. Surviving
subjects: `types-schema.test.ts` (6), `project-root.test.ts` (3), `feature-schema.test.ts` (its pattern moves out of
`server.ts:16` — see 4.4). The exact split is measured in row 4.5. The replacement coverage is 4.1's coverage-engine
suite and 4.4's surface suite; **no test is deleted unless the code it names is deleted in the same commit**, and row
4.5 records the before/after counts.

**The 108 checks: what survives and what is lost.** `gate0`–`gate7` are not exported (`engine.ts` exports only
`PHASES`) and are reachable only through `e2e`, so all 108 die when `e2e` does. Per gate, from
`references/quality-gates.md:316-329` (42 forward + 38 backward + 28 S&T = 108; G0's six are outside that total):

| Gate | Junction | Checks | Retained in `coverage.ts` | Dropped — replaced by |
|---|---|---|---|---|
| G0 | constitution | 6 (outside the 108) | none — `vdd_check{phase:'constitution'}` runs only the per-key count | 6 content checks (stack, security rules, banned patterns, layout, domains, PENDING) → `skills/vdd-constitution/SKILL.md` checklist |
| G1 | V→S | 5 + 5 + 4 | invariants A/B/C + per-key `goals`/`pillars` (4 behaviours) | 6 prose checks → `vdd-strategy` checklist; the 4 S&T assumptions → the same checklist |
| G2 | S→T | 4 + 5 + 4 | A/B/C + per-key (4) | 5 prose → `vdd-tactics`; 4 S&T → same |
| G3 | T→SP | 10 + 4 + 4 | A/B/C + per-key (`specs == MUST actions`) (4) | 10 prose → `vdd-specs`; 4 S&T → same |
| G4 | SP→PL | 7 + 6 + 4 | A/B/C + per-key (4) | 9 prose incl. the dependency DAG → `vdd-plan`; 4 S&T → same |
| G5 | PL→TK | 6 + 6 + 4 | A/B/C + per-key (4) | 8 prose → `vdd-tasks`; 4 S&T → same |
| G6 | TK→IM | 4 + 7 + 4 | none — 2.0.0 takes no commit input | 11 prose (commit behaviour, test evidence) → `vdd-implement`; 4 S&T → same |
| G7 | IM→VS | 6 + 5 + 4 | none — same reason | 11 prose (chain substance audit) → `vdd-validate`; 4 S&T → same |

Resulting count: **20 of the 108 behaviours survive as automated invariants** (A/B/C + the per-key count for the five
phases that have a parent); **60 forward/backward checks and 28 S&T assumptions become skill checklist prose with no
automated check**; G0's 6 are outside the 108 and are likewise prose. The tactics cross-key rule of §2 row 7 is
**additional to this accounting**, not part of it: it is new output the spec's §8 fixture pins, not one of the seven
gates' checks, so the 20/88 split is unchanged by it. Placeholder density (part of the substance
enforcement inside G1–G7) is **not** retained — no 4.1 invariant calls `countSubstancePlaceholders`. The arithmetic
is behaviour-level, not check-ID-level: the matrix invariants stand in for the forward/backward sets of their phase,
and every named check stays in `references/quality-gates.md` until 4.6 replaces that file with
`references/coverage-invariants.md`.

---

## 9. Release vehicle

**2.0.0.** `docs/plan.md:145` reserves 2.0.0 for a capability collapse and this is one: 14 tools → 3, 20 prompts → 0,
the seven counted gates (G1–G7) → 0, replaced by a coverage matrix, plus a protocol revision bump. §8 accounts for
all 108 checks and G0's six: 20 behaviours survive as invariants and 88 become checklist prose with no automated
check. `docs/plan-vision-skill-only.md` had
reserved 1.11.0 for one tool removal; skipped, and that plan is superseded (§4). `1.10.1` is the last 1.x.

- **No alias release.** The breaking change lands once, documented.
- **Deprecation window:** after 2.0.0 publishes, `npm deprecate '@simonmak-ascent/mcp@1.10.1' 'v5.0 replaces every
  tool with vdd_check/vdd_chain_validate/vdd_amend + 9 skills — see docs/migration-2.0.md'` (and the same for any
  earlier 1.x still resolvable). 1.x stays published: it is the rollback target.
- **`docs/migration-2.0.md`** is authored in **4.4**, in the same commit as the surface swap: a breaking change
  never lands before the document that explains it. It states, per removed tool: what it did, what replaces it (skill
  or tool), and the exact call to make now.
- **Version surfaces — 8 values, 7 files**, unchanged in shape from `TASKS.md:16`: the three
  `packages/vdd-*/package.json` versions, `server.json:6` and `:32` (both measured), `SERVER_VERSION`
  (`api/_vdd-rpc.js:880` — measured; `AGENTS.md` says `:892` and is stale — which
  4.4 deletes, so it moves to the new shim), `packages/vdd-mcp/src/server.ts:106` and `packages/vdd-cli/src/cli.ts:6`.
  4.4 adds **one test that pins all of them to `packages/vdd-mcp/package.json`** — a test, not a generator, because
  eight hand-edited values is the recurring defect this repo keeps paying for and an assertion is the cheapest control.

---

## 10. File-by-file change list

| File | Change |
|---|---|
| `packages/vdd-engine/src/coverage.ts` | **new** — `extractIds`, `buildMatrix`, `checkInvariants` (matrix only), `checkCounts` (per-key declared-vs-actual, called by the `PHASE_CONFIG` dispatch), `checkCrossKeyActual` (cross-key actual-vs-actual, called from the `tactics` entry only), `PHASE_CONFIG`, `amendImpact` |
| `packages/vdd-engine/src/engine.ts` | **deleted** (4.5), after its exports stop being imported (4.4) |
| `packages/vdd-engine/src/index.ts` | re-exports `coverage.ts`; drops `PHASES`/`PHASE_NAMES` |
| `packages/vdd-engine/src/meta.ts` | `PHASE_META` → the 8 phase descriptors `vdd_check` dispatches on; `PARAM_RELATIONSHIP_NOTES` deleted |
| `packages/vdd-engine/src/types.ts` | `VddOutput`/`VddMode`/delegation types deleted; `CheckResult`, `Coverage`, `ImpactedArtifact` added |
| `packages/vdd-engine/test/{graceful-input,validate,feature-arg,vision-retired}.test.ts` | **deleted** with their subjects (4.5) |
| `packages/vdd-engine/test/coverage-engine.test.ts` | **new** — the spec's §8 A-001 fixture reproduced exactly (**no `declaredCounts`**, all three reasons including `action_count=1 < pillar_count=3`), a separate declared-vs-actual case, the pass fixture, multi-parent, the per-key count rule, prefix-table-vs-template |
| `packages/vdd-engine/test/template-grammar.test.ts` | **new** — parses `references/artifact-templates.md`; for each of the five phase templates asserts the field is exactly `PHASE_CONFIG[phase].servesField`; for the five named non-phase templates asserts **no** `serves_*` line (§11.2) |
| `references/artifact-templates.md` | `serves_*` fields on the five phase templates only (`serves_goal` / `serves_pillar` / `serves_action` / `serves_spec` / `serves_component`, §11.2); vision template replaced by the seven v16 headings + `## Chain projection` |
| `docs/vision-framework-v17.md` | **new** — the 30-line delta (Branch A of §5) |
| `skills/<9 names>/SKILL.md` | **new** — 9 files |
| `scripts/gen-skill-manifest.mjs` | **new** — `skills/` → `packages/vdd-mcp/src/generated/skills.ts` |
| `packages/vdd-mcp/src/generated/skills.ts` | **generated, committed** |
| `packages/vdd-mcp/src/skills.ts` | **new** — `listSkills()`, `getSkill(name)` |
| `packages/vdd-mcp/src/server.ts` | 3 tool registrations; version literal; `FEATURE_PATTERN` removed with `feature` |
| `packages/vdd-mcp/src/prompts.ts` | **deleted** |
| `packages/vdd-mcp/src/http.ts` | `sessionIdGenerator: undefined` (`:17-19` today mints a UUID) |
| `packages/vdd-mcp/src/stdio.ts` | unchanged unless 4.4's SDK probe says `discover` must be registered |
| `api/mcp.js` | CJS transport kept; `require("./_vdd-rpc.js")` → `await import()` of the built core; **stops minting `Mcp-Session-Id` (`:81-85`) and deletes its CORS expose line (`:24`)**; **awaits** the shim (`:69` `await Promise.all(body.map(...))`, `:87` `await handleJsonRpc(body)`); adds `server/discover`, `MCP-Protocol-Version` mismatch ⇒ 400, `-32022` for an unsupported version, `resultType` on every result |
| `api/_vdd-rpc.js` | **deleted** (1,569 lines) |
| `api/_vdd-rpc.cjs` | **new** — ~80-line CJS shim exporting exactly what `api/mcp.js:11` destructures: `handleJsonRpc` (**async**), `isBrowser`, `html`, plus `SERVER_VERSION`; `load()` the built core and route (`api/mcp.js:34-36` uses `isBrowser`/`html`) |
| `vercel.json` | unchanged unless §3 Q2's fallback is needed |
| `.github/workflows/vdd-quality-gates.yml` | `:103` `node --check api/mcp.js && node --check api/_vdd-rpc.js` → `node --check api/mcp.js && node --check api/_vdd-rpc.cjs`; **delete** the `gate-count-consistency` job at `:63-77` — it greps `108` and only prints `WARN` (`:76`), so it can never fail, and retargeting it would preserve a control that cannot fail |
| `packages/vdd-mcp/test/api-surface.test.ts` | rewritten: 3 tools, 0 prompts, `resultType`, `server/discover`, no session header, version pin |
| `packages/vdd-mcp/test/{server-surface,http-transport,feature-schema}.test.ts` | all three **rewritten in 4.4** (their subjects survive): `server-surface` 14 tools → 3, `http-transport` session id → none, `feature-schema`'s pattern moves out of `server.ts:16` |
| `packages/vdd-mcp/test/count-parity.test.ts` | **new** — presence/absence sweep (4.6) over §11.5's live-surface set |
| `packages/vdd-mcp/test/skill-manifest.test.ts` | **new** — 9 directories, frontmatter rules, recomputed digests, idempotent generator (4.3, §11.3) |
| `packages/vdd-cli/src/cli.ts` | 16 subcommands → `check`, `chain`, `amend` (they print the JSON result); version literal |
| `SKILL.md`, `README.md`, `llms.txt`, `context7.json`, `glama.json`, `server.json`, `references/quick-reference.md`, `references/INDEX.md`, `CONTRIBUTING.md`, `docs/deployment.md`, `scripts/gen-landing.py`, `packages/vdd-*/package.json:4` descriptions | count and command sweep: 3 tools / 0 prompts / 9 skills / 2.0.0; `INDEX.md` also drops the deleted reference docs below |
| `references/quality-gates.md` | **deleted** — its subject (G0–G7, the 108) is gone; replaced by `references/coverage-invariants.md` |
| `references/coverage-invariants.md` | **new** — the phase dispatch table, invariants A–C, the per-key declared-vs-actual rule with its reason string, the tactics cross-key actual-vs-actual rule (`action_count=1 < pillar_count=3`), and the A-001 worked fixture |
| `references/compliance-evidence.md` | `:65` "Gate Results (G1–G7)" → "Coverage invariants (A–C) and per-key counts"; the rest of the file stands (the impact report still exists) |
| `references/prompt-patterns.md`, `references/ai-agent-patterns.md` | **deleted** — 0 prompts; the nine `SKILL.md` bodies are the procedures |
| `references/workflow-phases.md` | **rewritten** — the eight phase procedures, each with `vdd_check` as its only tool call |
| `index.html`, `zh/index.html`, `hk/index.html` | **regenerated only** (`python3 scripts/gen-landing.py`) |
| `docs/migration-2.0.md` | **new** — the §6 replacement tables verbatim, including the three tools and four prompts marked `no successor`, and the `-32602` message rules |
| `CHANGELOG.md` | `## [2.0.0]` with Removed / Added / Migration, and the supersession of `docs/plan.md`'s C-series |

**Not touched:** `docs/plan.md`, `docs/plan-vision-skill-only.md`, `docs/plan-dependabot-2026-11.md`,
`docs/restructure_plan-20261126.md`, `docs/vision-framework-v16.md` (a new v17 supersedes it), `TASKS.md` rows 1.x–3.x,
`.github/workflows` `pull_request.paths` (already a superset of `packages/**`, `api/**`, `scripts/**`, `docs/**`,
`TASKS.md:17`), `.gitignore` (`pnpm-lock.yaml` already ignored, `TASKS.md:17`).

---

## 11. Test plan

Five new or rewritten files, each owned by the task that makes it green. The probe rule applies: **a test that has
never been red proves nothing**, and a load error is not a red (`apg-infra/scripts/probe.sh` exits 2 for that) — so
each task's red is produced by running the test against a deliberate stub that returns the *wrong* answer, pasted into
its `TASKS.md` row.

**11.1 `packages/vdd-engine/test/coverage-engine.test.ts`** (4.1) — the spec's §5 Phase 5 tests 1–4 and 7, corrected:

1. `vdd_check({phase:'tactics', content: A-001-only})` with `priorArtifacts.strategy` containing `S-001`, `S-002` and
   `S-003` — **no `declaredCounts`**, exactly as the spec's §8 reference fixture calls it
   (`docs/restructure_plan-20261126.md:504`, where the call is `vdd_check({phase:"tactics", content})`) → `status:
   "FAIL"`, `coverage.forward_covered == ["S-001"]`, `matrix == {S-001:["A-001"], S-002:[], S-003:[]}`, and **exactly
   three reasons**, in the spec's order: `"S-002 has no action item"`, `"S-003 has no action item"`,
   `"action_count=1 < pillar_count=3"` (`:508`). The third is computed from the text — 1 action found in `content`,
   3 pillars found in `priorArtifacts.strategy` — not from anything declared. **This is the test the engine must fail
   before it is trusted**: the stub returns `status:"PASS"`, and the red is that assertion, not an import error.
2. `S-001`-and-`V-002` multi-parent child (two `serves_goal:` lines) → `dedicated` omits both.
3. Dedicated chains → `PASS`.
4. **The count rules, stated once — two rules, not one.** **(a) Per-key, declared vs actual.** `checkCounts(declared,
   actual, phase)` is a separate step in the `PHASE_CONFIG` dispatch, not part of `checkInvariants(matrix)` (which
   takes a matrix and nothing else): for every key the phase consumes, `declaredCounts.<key> == actual <key>`; a key
   that is absent is not checked, so a `phase:'constitution'` call that omits `declaredCounts` does not fail for
   absent keys; the reason is `"declared <key> <declared>, actual <actual>"`. **(b) Cross-key, actual vs actual.**
   `checkCrossKeyActual(matrix)` is a second, separate rule called from the `tactics` entry of `PHASE_CONFIG`: it
   counts the children in the matrix against the parent rows and emits `action_count=<n> < pillar_count=<m>` when the
   former is smaller — the literal string of the spec's §8 fixture. Invariant C already forces children ≥ parents, so
   this reason restates what C reports; it is emitted anyway because the fixture makes the string part of the output
   contract. Cases: `declaredCounts.goals = 3` with 2 actual goals → `FAIL` on rule (a)'s reason; the A-001 fixture
   (item 1) → rule (b)'s reason, with rule (a) silent because no counts are declared. The spec's *declared-vs-declared*
   inequalities (`:358`, `:393`, `:405`) stay dropped — they compare two numbers the caller typed (§2 row 7) — and no
   cross-key reason is invented for `strategy`, `plan` or `tasks`, because the spec names no string for them.
5. `vdd_amend` with `S-002` removed → `impactedArtifacts` phases `["tactics","specs","plan","tasks"]`.
6. **Prefix table equals the templates**: every prefix in `PHASE_CONFIG` is observed as an id shape in
   `references/artifact-templates.md`. This is the no-invented-structure control — without it the engine could key on
   a grammar nothing produces, which is exactly what the spec's `serves_*` regex would have done (§2 row 5).

**11.2 `packages/vdd-engine/test/template-grammar.test.ts`** (4.2) — parses `references/artifact-templates.md` and
binds each heading to an exact token. "Six child templates" (v1) was never defined: the file has twelve template
headings — ten carry an `Impact Chain`, one report carries `Full Chain`, and `constitution.md` carries neither. This
table binds the ten headings other than the vision template (rewritten in 4.2) and `constitution.md`:
This table **is** the contract:

| Heading in `references/artifact-templates.md` | Line (plan time) | `PHASE_CONFIG` key | Required token |
|---|---|---|---|
| `## strategy.md Template` | `:184`, chain `:191` | `strategy` | `serves_goal: V-###` |
| `## tactics.md Template` | `:280`, chain `:287` | `tactics` | `serves_pillar: S-###` |
| `## spec.md Template` | `:370`, chain `:377` | `specs` | `serves_action: A-###` |
| `## plan.md Template` | `:470`, chain `:477` | `plan` | `serves_spec: SP-###` |
| `## tasks.md Template` | `:654`, chain `:661` | `tasks` | `serves_component: PL-###` |
| `## data-model.md Template` | `:549`, chain `:556` | none | **no `serves_*`** — a view of a plan component, linked by `plan.md` |
| `## contracts/[endpoint].md Template` | `:593`, chain `:600` | none | **no `serves_*`** — same |
| `## research.md Template` | `:705`, chain `:712` | none | **no `serves_*`** |
| `## decision_log.md Template` | `:747`, chain `:752` | none | **no `serves_*`** |
| `## Impact Verification Report Template` | `:770`, `> Full Chain:` | none | **no `serves_*`** — 2.0.0 takes no commit input |

For each of the five phase rows the assertion is `field == PHASE_CONFIG[phase].servesField` — a string equality, not
"a line contains `serves_`" (any `serves_*` token would have satisfied v1's test) — plus ≥1 occurrence carrying an id
of that phase's `parentPrefix`. For the five `none` rows the assertion is that the fenced template under that heading
contains no `serves_` token, so a well-meaning hand-edit fails instead of passing silently. `## Chain projection` is
asserted separately: one `V-###` per selected `OBJ-###`, every `V-###` distinct and resolving to an existing
`OBJ-###`, and no metric restated on the projection line. Red first: today zero `serves_` lines exist.

**11.3 `packages/vdd-mcp/test/skill-manifest.test.ts`** (4.3) — 9 directories; frontmatter `name == dirname`,
`^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$` with no `--`; `description` 1–1024; body non-empty; `sha256` recomputed from the
file equals the manifest's; `gen && git diff --exit-code` is clean.

**11.4 `packages/vdd-mcp/test/api-surface.test.ts`** (rewritten in 4.4) — the spec's §7 criteria, corrected:

| # | Assertion | Why it can fail |
|---|---|---|
| 1 | `server/discover` **called over HTTP** returns `supportedVersions` containing `"2026-07-28"`, `capabilities`, and `_meta['io.modelcontextprotocol/serverInfo'].version` | today the method does not exist |
| 2 | `tools/list` returns exactly **3** on stdio **and** on the hosted handler | 14 today |
| 3–5 | the three `vdd_check` cases (11.1 items 1, 3, 4) run through the **hosted** handler, asserted on `resultType == "complete"` as well as status | the hosted twin has its own gate copy today |
| 6 | `skills/list` returns 9 entries with `skill://<name>/SKILL.md` URIs and `resultType`; `skills/get` on one returns frontmatter and body; both answer **with no protocol negotiation in the request** — the method is not conditional on SEP-2640 (§7) | neither method exists |
| 7 | a POST carrying a stray `Mcp-Session-Id` returns 200 **and the response has no `Mcp-Session-Id` header** — asserted on `tools/list`, and on `initialize` if the SDK still answers it | `api/mcp.js:81-85` mints one today |
| 8 | `tools/list` with `MCP-Protocol-Version: 2025-06-18` → HTTP **400**; with an unsupported version in `params._meta['io.modelcontextprotocol/protocolVersion']` → error `-32022` with `data.supported` containing `"2026-07-28"` | no header check exists; whether `initialize` is still a method at all is settled by 4.4 step 0 |
| 9 | every tool result carries `coverage.matrix` and `resultType` (schema validation, both surfaces) | — |
| 10 | `prompts/list` returns `[]` on both surfaces | 20 today |
| 11 | the eight version values equal `packages/vdd-mcp/package.json` | three are pinned today; five are not |

**11.5 `packages/vdd-mcp/test/count-parity.test.ts`** (4.6) — the presence/absence shape of §4.3b in
`docs/plan-vision-skill-only.md`, retargeted to 2.0.0:

- **presence** of `3 tools`, `0 prompts`, `9 skills`, `2.0.0` in the named count-bearing files (including the three
  `package.json:4` descriptions and the regenerated landing pages);
- **absence** of `14 tools`, `20 prompts`, `21 prompts`, `108`, `7 gates`, `7 Gates`, `7 quality gates`, `G1–G7`,
  `G1-G7`, **`17 phase`** and **`16 subcommand`** across the **live-surface** set — §3.3's allowlist **plus
  `references/*.md`** — excluding `CHANGELOG.md`, `TASKS.md`, `docs/plan*.md`, `docs/restructure_plan-*.md` and
  `docs/vision-framework-v*.md` by name (those are the record). The last two tokens are the ones 2.0.0 most falsifies:
  the CLI goes from 16 subcommands to 3 (`check`, `chain`, `amend`) and the engine's 17 phase functions become 3
  tools, so `SKILL.md:248,250`, `README.md:412,414` and both `packages/vdd-{engine,cli}/package.json:4` descriptions
  are stale words for a live surface, not history;
- **the v16-heading assertion**: the vision template in `references/artifact-templates.md` contains all seven
  `§0`–`§6` headings of `docs/vision-framework-v16.md:94-132` verbatim, so the template cannot drift from the
  framework it claims to implement.

The absence set is `references/*.md` plus §3.3's allowlist, so **every file that carries one of those tokens is edited
by 4.6, not excluded by name**. The disposition list is eight files — five reference documents, one hand-edited SVG,
the root description, and the template table 4.2 leaves alone. A file left behind fails the test rather than being
silently skipped:

| File | Token(s) today | Disposition in 4.6 |
|---|---|---|
| `references/quality-gates.md:329` | `108` (the file says "Seven bi-directional gates", not `7 gates`) | **deleted** — replaced by `references/coverage-invariants.md` |
| `references/compliance-evidence.md:65` | `G1–G7` | reworded to "Coverage invariants (A–C) and per-key counts" |
| `references/workflow-phases.md:363` | `7 gates` | **rewritten** |
| `references/prompt-patterns.md:780,791` | `7 gates` | **deleted** with the prompt catalogue |
| `references/ai-agent-patterns.md` | none of the tokens (checked: 0 matches) | **deleted** with the prompt catalogue — listed so its deletion is not forgotten |
| `references/artifact-templates.md:841` | `7 gates` ("… (repeat for all 7 gates)") | **reworded**, and it must be: this row sits inside the Impact Verification Report template, which 4.2 does **not** rewrite, so it survives 4.2 and is 4.6's to fix |
| `docs/social-preview.svg:15,17` | `7 Gates`, `108 Checks` | **edited by hand** — `scripts/gen-landing.py` writes only `index.html`, `zh/index.html` and `hk/index.html` (`:326-330`) and emits no SVG, so no generator will ever fix this file; regenerating the landing pages does not touch it |
| `package.json:3` | `7 quality gates` | reworded — the root description is a live surface (it is in §3.3's allowlist) and is not one of the three `packages/vdd-*/package.json:4` descriptions |

The two N1 tokens land in four files that are **already** on 4.6's file list — `SKILL.md:248,250`, `README.md:412,414`,
`packages/vdd-engine/package.json:4`, `packages/vdd-cli/package.json:4` — so no new file is added for them; only the
tokens join the absence set, and `SKILL.md:248` and `README.md:412` are the lines that carry `17 phase` while `:250`
and `:414` carry `16 subcommand`.

**Deleted tests** are named in §8 and deleted only with their subject, in 4.5.

---

## 12. Verification commands

```bash
# The gate that must stay green at every commit.
pnpm -r build && pnpm check && pnpm test

# 4.1 / 4.2 — red then green; the red must be an assertion, never "Failed to load"
pnpm --filter @simonmak-ascent/engine test coverage-engine
pnpm --filter @simonmak-ascent/engine test template-grammar

# 4.3 — manifest drift is a failure, not a diff to eyeball
pnpm --filter @simonmak-ascent/engine test skill-manifest
node scripts/gen-skill-manifest.mjs && git diff --exit-code packages/vdd-mcp/src/generated/skills.ts

# 4.4 — both surfaces, incl. the headers the protocol forbids, the shim's export surface, and the doc
test -f docs/migration-2.0.md
node -e 'const c=require("./api/_vdd-rpc.cjs");for(const k of ["handleJsonRpc","isBrowser","html","SERVER_VERSION"])if(!(k in c))process.exit(1)'
node -e 'require("./api/_vdd-rpc.cjs").handleJsonRpc({jsonrpc:"2.0",id:1,method:"tools/list"}).then(r=>{if(r.result.tools.length!==3)process.exit(1)})'
pnpm --filter @simonmak-ascent/engine test api-surface

# 4.5 — the deletion is complete and its tests went with it
test ! -e packages/vdd-engine/src/engine.ts
test ! -e packages/vdd-engine/test/vision-retired.test.ts
test "$(grep -rc 'it.skip' packages/vdd-engine/test packages/vdd-mcp/test | grep -v ':0' | wc -l)" = 0

# 4.6 — copy sweep and generated pages. One token grep over the whole live surface — including the
#        hand-edited SVG and the root description, which no generator owns — then the landing idempotency.
pnpm --filter @simonmak-ascent/engine test count-parity
! grep -rnE '14 tools|20 prompts|21 prompts|17 phase|16 subcommand|108|7 gates|7 Gates|7 quality gates|G1[–-]G7' \
    SKILL.md README.md llms.txt context7.json glama.json server.json package.json CONTRIBUTING.md \
    docs/deployment.md docs/social-preview.svg packages/vdd-*/package.json references/*.md
python3 scripts/gen-landing.py && git add index.html zh/index.html hk/index.html \
  && python3 scripts/gen-landing.py && git diff --exit-code -- index.html zh/index.html hk/index.html

# 4.7 — release metadata and the plan gate
test "$(grep -c '"version": "2.0.0"' server.json)" = 2
grep -q 'const SERVER_VERSION = "2.0.0";' api/_vdd-rpc.cjs
node -p '["packages/vdd-engine","packages/vdd-cli","packages/vdd-mcp"].map(d=>require("./"+d+"/package.json").version).join(",")' \
  | grep -qx '2.0.0,2.0.0,2.0.0'
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete

# 4.8 — review and merge; no tag, no publish, no new row
gh pr checks <pr>                      # the exit status is the assertion, not the printed text
gh pr merge <pr> --merge --delete-branch

# 4.9 — tag the merged commit, publish, probe. No file is edited between 4.8's ship verdict and this tag.
#        A checkout of main DOES happen inside 4.8: gh's --delete-branch path runs CheckoutBranch(base) then
#        Pull(base) when the PR head is the checked-out branch (pkg/cmd/pr/merge/merge.go, deleteLocalBranch).
#        That does not void the verdict — the gate compares content hashes of the reviewed files rather than
#        tracking checkouts, and `gh pr merge` is not one of its write-shaped commands (estate AGENTS.md §7).
git fetch origin main
git tag v2.0.0 origin/main
# the tag resolution itself proves nothing on its own (both sides come from origin/main), so it is stated
# to record the target, and the drift guard below is the assertion that can fail:
test "$(git rev-parse v2.0.0^{tree})" = "$(git rev-parse origin/main^{tree})"
# a main that advanced between 4.8's merge and this tag must not be published unseen
test "$(git rev-parse v2.0.0^{commit})" = "$(gh pr view <pr> --json mergeCommit -q .mergeCommit.oid)" \
  || { echo "origin/main moved after 4.8's merge — the tag would publish a tree the reviewer never saw"; git tag -d v2.0.0; exit 1; }
git push origin v2.0.0
test "$(git rev-parse v2.0.0^{commit})" = "$(git rev-parse origin/main)"
# the tag push starts publish-npm.yml (.github/workflows/publish-npm.yml:3-6); these npm assertions race it
# unless that run is awaited, so resolve it, pin it to the tagged commit, and bound the wait.
RUN=$(gh run list --workflow publish-npm.yml --limit 1 --json databaseId,headSha \
  --jq '.[0] | "\(.databaseId) \(.headSha)"')
test "${RUN%% *}" != "" \
  || { echo "no publish-npm run exists — the tag push did not queue the workflow"; exit 1; }
test "${RUN##* }" = "$(git rev-parse origin/main)" \
  || { echo "the latest publish-npm run is not for origin/main — waiting on a stale run would prove nothing"; exit 1; }
timeout 900 gh run watch "${RUN%% *}" --exit-status --interval 20 \
  || { echo "publish-npm run ${RUN%% *} (tag v2.0.0) did not finish green within 15 min; npm view and verify:publish would race CI rather than test it"; exit 1; }
test "$(npm view @simonmak-ascent/mcp version)" = 2.0.0
pnpm verify:publish
diff -r packages/vdd-mcp/dist ~/.npm-global/lib/node_modules/@simonmak-ascent/mcp/dist

# 4.9 (cont.) — production probe: assert, never print (a 14/20 answer must fail the command)
MCP=https://vdd.simonmak.com/api/mcp
test "$(curl -s $MCP -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq -r '.result.tools|length')" = 3
test "$(curl -s $MCP -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}' \
  | jq -r '.result.prompts|length')" = 0
test "$(curl -s $MCP -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"server/discover"}' \
  | jq -r '.result.supportedVersions|index("2026-07-28")')" != null
test "$(curl -s $MCP -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"skills/list"}' \
  | jq -r '.result.skills|length')" = 9
test "$(curl -si $MCP -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | grep -ci '^mcp-session-id:')" = 0

# 4.10 — record the release on main: TASKS.md only (after 4.9, because the tag must be on origin/main)
grep -c '| 4\.9 |' TASKS.md
test "$(git diff --name-only HEAD~1)" = "TASKS.md"
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete
```

---

## 13. Risks and rollback

| Risk | Control | Rollback |
|---|---|---|
| **`-32022` / `server/discover` support in the SDK is not what the docs suggest** (§3 Q1) | 4.4 step 0 installs and greps the SDK before any edit; 11.4 criterion 1 calls the method rather than assuming it | 4.4 is its own commit: revert it, the 14-tool surface returns with `_vdd-rpc.js` |
| **The Vercel function cannot reach the built ESM core** (§3 Q2) | 4.4's Node test exercises the same `import()` Vercel will; 4.9's probe is the deployment proof | `vercel rollback` to the last 1.10.1 deployment (immediate, one command), then the `includeFiles` one-liner |
| **The `serves_*` grammar does not fit real artifacts** | 4.2's `template-grammar` test parses the shipped templates, so the grammar is proven on the files users copy | 4.2 is one file plus one doc; revert restores the Impact-Chain-only templates and 4.1's prefix test still passes |
| **Breaking change strands existing users** | `docs/migration-2.0.md` per removed tool; `npm deprecate` on 1.x; unknown-name error names the doc | `npm dist-tag add '@simonmak-ascent/mcp@1.10.1' latest`; `npm deprecate '@simonmak-ascent/mcp@2.0.0' 'rolled back'` |
| **Deleting the engine deletes coverage silently** | §8 names every file; row 4.5 records before/after test counts; no test is deleted without its code | `git revert` of 4.5 restores the engine; 4.1's suite is untouched by it |
| **The count sweep leaves a stale `14 tools`** | 4.6's absence list covers the regenerated pages, so a no-op generator fails it | regenerate and re-run |
| **Model-provided `content` is unbounded** | `vdd_check` is pure, but a megabyte of text costs CPU: reuse `api/mcp.js:55-56`'s 512 KB body cap and add a 256 KB per-`content` cap in the handler | cap is one constant |
| **The plan gate refuses a commit** | rows are added as `done — <command and output>` only, one per commit, never `ready`, never `blocked by <done row>` | a `ready` row exits 1 and a stale blocker exits 2 — fix the row, do not bypass |
| **The release deadlocks on the review gate** (tag/publish refused because the verdict is stale or the bytes moved) | 4.8's verdict is over the branch head and nothing is edited between it and 4.9. A checkout of `main` **does** happen inside 4.8 — `gh pr merge --delete-branch` runs `CheckoutBranch(base)` then `Pull(base)` when the PR head is the checked-out branch (`pkg/cmd/pr/merge/merge.go`, `deleteLocalBranch`) — but the gate binds to content hashes of the reviewed files, not to checkouts, and `gh pr merge` is not a write-shaped command (estate `AGENTS.md` §7); the merged bytes are the reviewed bytes. The tag is created against `origin/main` and 4.9 asserts the tagged tree equals `origin/main`'s tree. 4.9 carries no row and 4.10 is `.md`-only | nothing to roll back: re-run `reviewer` over the unchanged tree, then repeat 4.9 from the `git fetch` |
| **4.9's npm assertions race the publish workflow** | publishing happens in `publish-npm.yml` on the tag push (`.github/workflows/publish-npm.yml:3-6`), so 4.9 resolves that run, pins it to `origin/main`'s SHA, and waits with `timeout 900 gh run watch <id> --exit-status` before `npm view` / `pnpm verify:publish`; the failure message names the race rather than reporting a missing version | nothing to roll back: re-run the wait, or re-run the workflow with `gh workflow run publish-npm.yml` if the tag run was lost |

Every deletion in this plan is a git-tracked source file: `git revert` is the rollback, and none of them is
destructive to data. The one irreversible act is `npm publish` 2.0.0, whose rollback is a dist-tag move, not an
unpublish.

---

## 14. Tasks

Each task 4.1–4.7 is one **reviewed change-set**: finish the edits, run the full suite, dispatch `reviewer`, then
commit with **one** `TASKS.md` row — `4.N … done — <command and output>`. The red run for 4.1/4.2/4.3/4.4 is pasted
into that row. No task pre-writes another's row. `git commit`, `git push`, `gh pr merge`, `git tag` and `npm publish`
are *shipping* commands that the review gate refuses without a `ship` verdict over the same bytes, so the reviewer
pass precedes every one of them; the release tasks 4.8–4.10 are ordered by that gate, not by taste (§14.1).

| # | Task | Depends | verify (can fail) |
|---|---|---|---|
| 4.1 | **Coverage engine + its fixture.** New `packages/vdd-engine/src/coverage.ts`: `extractIds(content, prefix)`, `buildMatrix(parents, children, servesField)`, `checkInvariants(matrix)` (A: no all-zero row; B: no all-zero column; C: every row has a child whose column-sum is 1), `checkCounts(declared, actual, phase)` (per-key declared-vs-actual `==`, called by the `PHASE_CONFIG` dispatch — never merged into `checkInvariants`), `checkCrossKeyActual(matrix)` (actual-vs-actual, called from the `tactics` dispatch only, emitting the literal `action_count=<n> < pillar_count=<m>`), `PHASE_CONFIG`, `amendImpact`. New `coverage-engine.test.ts` per §11.1 (six cases incl. the spec's §8 A-001 fixture **with no `declaredCounts`**, a separate declared-vs-actual case, and the prefix↔template control). Red first against a stub `checkInvariants` that returns all-pass | — | `pnpm --filter @simonmak-ascent/engine test coverage-engine` — **red** on the A-001 fixture with the stub (`expected FAIL, received PASS`), **green** after, with exactly the **three** reasons of §11.1 item 1, the third being `action_count=1 < pillar_count=3`. A run that dies with `Failed to load`/`Cannot find module` is not a red and does not satisfy this row |
| 4.2 | **Grammar + vision projection.** Add the five `serves_*` lines to the five phase templates in `references/artifact-templates.md` (the exact heading→token table is §11.2; `data-model`, `contracts`, `research`, `decision_log` and the Impact Verification Report get **none**); replace the vision template with the seven `§0`–`§6` headings plus `## Chain projection` (`V-### → OBJ-###`, referencing — not restating — the objective's metric; non-goals from `out_of_scope`); write `docs/vision-framework-v17.md` as the 30-line delta recording the projection, the `OBJ-###`-authoritative rule, and the preset-relative objective bound that replaces `N ≥ 3`. New `template-grammar.test.ts` (§11.2) | 4.1 | `pnpm --filter @simonmak-ascent/engine test template-grammar` — red today (0 `serves_` lines in the template file), green after, with each of the five fields equal to its `PHASE_CONFIG[phase].servesField` and each of the five non-phase headings carrying no `serves_` line; and the prefix control in 4.1 still green against the rewritten templates |
| 4.3 | **Nine skills + manifest.** `skills/<name>/SKILL.md` ×9 per §7 (v16 procedure for vision; spec §3.4's Step 0–4 skeleton for the rest, rewritten so the generation steps are the agent's and the only tool call is `vdd_check`); `scripts/gen-skill-manifest.mjs`; generated `packages/vdd-mcp/src/generated/skills.ts`; `packages/vdd-mcp/src/skills.ts` (`listSkills`, `getSkill`); `skill-manifest.test.ts` (§11.3). Report the body sizes in the row | 4.2 | `pnpm --filter @simonmak-ascent/engine test skill-manifest` green, plus `node scripts/gen-skill-manifest.mjs && git diff --exit-code …/skills.ts` clean. Red first: run it with one directory's frontmatter `name` deliberately mismatched |
| 4.4 | **Atomic surface swap — one commit.** `server.ts` registers 3 tools and no prompts; `prompts.ts` deleted; `http.ts` stateless (`sessionIdGenerator: undefined`); `api/mcp.js` stops minting `Mcp-Session-Id` (`:81-85`), **deletes the `Mcp-Session-Id` CORS expose line (`:24`)**, adds `server/discover`, the `MCP-Protocol-Version` mismatch 400, `-32022`, and `resultType` on every result; `_vdd-rpc.js` deleted and `_vdd-rpc.cjs` added exporting `handleJsonRpc` (**async**), `isBrowser`, `html`, `SERVER_VERSION`, with `api/mcp.js` awaiting it (`:69` `await Promise.all(body.map(...))`, `:87` `await handleJsonRpc(body)`); CI `:103` retargeted; CLI reduced to `check`/`chain`/`amend`; `api-surface.test.ts`, `server-surface.test.ts` and `http-transport.test.ts` rewritten (§11.4); the eight-value version test added; **`docs/migration-2.0.md` authored here, not later**, reproducing §6's tables. **Step 0:** install and grep the SDK (§3 Q1) and record it | 4.1, 4.3 | `test -f docs/migration-2.0.md`; the §12 4.4 block (export surface + async dispatch + `api-surface`); red before (14 tools, 20 prompts, a session header present), green after on all 11 criteria; record the SDK symbol list in the row. Parity is why this cannot be split: today's test compares stdio against the hosted twin |
| 4.5 | **Delete the engine.** Remove `packages/vdd-engine/src/engine.ts` and its re-exports; delete `graceful-input`, `validate`, `feature-arg` and `vision-retired` test files; lift the four content helpers of §8 into `coverage.ts` if 4.4 still imports them. **Supersedes `TASKS.md:23`**: row 2.4 says the `it.skip` is removed at 2.6, but 2.5–2.10 were never written; this row removes the skip by deleting the file, which is why it needs no greening | 4.4 | `test ! -e packages/vdd-engine/src/engine.ts`; `test ! -e packages/vdd-engine/test/vision-retired.test.ts`; `test "$(grep -rc 'it.skip' packages/*/test \| grep -v ':0' \| wc -l)" = 0`; `pnpm -r build && pnpm check && pnpm test` green; row records the test count before and after (`--reporter=verbose`) and the list of deleted files |
| 4.6 | **Copy, count and reference sweep.** `3 tools` / `0 prompts` / `9 skills` / `2.0.0` through `SKILL.md`, `README.md`, `llms.txt`, `context7.json`, `glama.json`, `server.json`, `references/{quick-reference,INDEX}.md`, `CONTRIBUTING.md`, `docs/deployment.md`, the root `package.json:3` description, the three `packages/vdd-*/package.json:4` descriptions and `scripts/gen-landing.py`; **reword `references/artifact-templates.md:841`** ("… (repeat for all 7 gates)", inside the Impact Verification Report template 4.2 does not rewrite); **hand-edit `docs/social-preview.svg:15,17`** — `gen-landing.py` writes only the three `index.html` files and emits no SVG, so this one is not regenerable; regenerate the three landing pages; **delete** the CI `gate-count-consistency` job (`.github/workflows/vdd-quality-gates.yml:63-77`, which only `WARN`s); dispose of the five reference docs as §11.5's table states (`quality-gates.md` → new `coverage-invariants.md`; `compliance-evidence.md:65` reworded; `workflow-phases.md` rewritten; `prompt-patterns.md` and `ai-agent-patterns.md` deleted); new `count-parity.test.ts` (§11.5) | 4.5 | `pnpm --filter @simonmak-ascent/engine test count-parity` green, including the `G1–G7` absence, the `17 phase` / `16 subcommand` absence and the v16-heading assertion; the §12 4.6 token grep over the ten live-surface paths exits 0 (it names the SVG and the root description, so a regenerated landing page cannot mask them); landing idempotency (`gen`, add, `gen`, `git diff --exit-code`) clean **after** the regeneration commit |
| 4.7 | **Release metadata.** `CHANGELOG.md` `## [2.0.0]` with Removed/Added/Migration, the supersession note for `docs/plan.md`'s C-series and `docs/plan-vision-skill-only.md`, and the pointer to `docs/migration-2.0.md` (written in 4.4); all eight version values → 2.0.0; `server.json` description | 4.6 | the §12 4.7 block: two `2.0.0` in `server.json`, `SERVER_VERSION` in the shim, three package versions, `pnpm --filter @simonmak-ascent/engine test api-surface` green (the eight-value pin), `plan-state.py --require-complete` exits 0 |
| 4.8 | **Review and merge.** Full suite on the branch head; `reviewer` over the whole change-set; apply findings and re-run; on `REVIEW-VERDICT: ship` merge the PR. **No tag, no publish, no new row** | 4.7 | reviewer `ship` over bytes that are still HEAD; `gh pr checks <pr>` **exit status** 0; `test "$(git rev-parse origin/main)" = "$(gh pr view <pr> --json mergeCommit -q .mergeCommit.oid)"`; `test -n "$(git ls-tree --name-only origin/main -- packages/vdd-engine/src/coverage.ts)"` |
| 4.9 | **Tag, publish, probe.** `git fetch origin main`; `git tag v2.0.0 origin/main`; assert `v2.0.0^{tree}` equals `origin/main^{tree}` **and** that `v2.0.0^{commit}` is 4.8's merge commit, deleting the local tag on mismatch, so a `main` that advanced after the review is not published unseen; push the tag; await the tag-triggered `publish-npm.yml` run (`timeout 900 gh run watch`, resolved from `gh run list --workflow publish-npm.yml --limit 1` and pinned to `origin/main`'s SHA) **before** asserting npm state; `pnpm verify:publish`; re-apply the hand-patched global install (`rsync -a --delete packages/vdd-mcp/dist/ ~/.npm-global/lib/node_modules/@simonmak-ascent/mcp/dist/` + `chmod +x …/stdio.js`); `npm deprecate` 1.10.1 with the migration pointer; the production probe. A checkout of `main` **does** happen in 4.8 (`gh pr merge --delete-branch` → `CheckoutBranch(base)` + `Pull(base)`); it voids nothing because the gate compares content hashes, not checkouts. **Carries no commit and no row** — a tag and a publish are not source | 4.8 | `test "$(git rev-parse v2.0.0^{tree})" = "$(git rev-parse origin/main^{tree})"`; `test "$(git rev-parse v2.0.0^{commit})" = "$(gh pr view <pr> --json mergeCommit -q .mergeCommit.oid)"`; the publish run resolved, pinned to `origin/main`, and `gh run watch --exit-status` green (a timeout exits 1 with a message naming the race); `test "$(npm view @simonmak-ascent/mcp version)" = 2.0.0`; `pnpm verify:publish`; `diff -r packages/vdd-mcp/dist ~/.npm-global/…/dist` exits 0; the §12 probe — 3 tools, 0 prompts, `2026-07-28`, 9 skills, zero `Mcp-Session-Id` headers; Vercel's `main` deployment is the one serving |
| 4.10 | **Record the release.** One commit on `main` adding rows `4.8`, `4.9` and `4.10` as `done — <command and output>` — the pattern `docs/plan-vision-skill-only.md:534-536` settled: no commit can observe its own publish, and a tag cannot record the commit it tags. `TASKS.md` only | 4.9 | the three rows are present (`grep -c`); `test "$(git diff --name-only HEAD~1)" = "TASKS.md"`; `plan-state.py --path TASKS.md --require-complete` exits 0 |

**14.1 The release crosses three gates, and the order is forced.** `git commit`, `git push`, `gh pr merge`,
`git tag` and `npm publish` are all *shipping* commands: the review gate refuses each until `reviewer` returns
`REVIEW-VERDICT: ship` over the same file bytes, with a passing test run observed after the last edit (estate
`AGENTS.md` §7); the plan gate independently refuses every shipping command unless `TASKS.md` validates with zero
`ready` rows. Hence: (a) each of 4.1–4.7 is reviewed before its commit; (b) 4.8's merge is preceded by the final pass
over the whole branch head; (c) 4.9 runs with **no file edited after that verdict** — a tag object and a pushed ref
are not file bytes, so the verdict still binds. The `git checkout` that v2 claimed does not occur **does** occur:
`gh pr merge --delete-branch` runs `CheckoutBranch(base)` then `Pull(base)` when the PR head is the checked-out
branch (`pkg/cmd/pr/merge/merge.go`, `deleteLocalBranch`). It voids nothing, because the gate binds to content hashes
of the reviewed files rather than tracking checkouts, and `gh pr merge` is not one of its write-shaped commands
(estate `AGENTS.md` §7); the tag is created against `origin/main` and 4.9 asserts both that its tree equals
`origin/main`'s and that its commit is 4.8's merge commit, so a `main` that advanced in between is caught before the
tag is pushed;
(d) nothing can be tagged before it is reviewed, which is why review precedes merge and the tag
targets the merged commit rather than HEAD; (e) 4.9 carries no row because a tag/publish produces no commit, and
4.10 is the first commit after it. v1 ordered 4.8 (tag) before 4.9 (review) and asserted
`git describe --exact-match HEAD`, which required HEAD to be the tagged commit while also requiring the tag's own row
in that commit — both impossibilities are removed here.

**Ordering.** 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6 → 4.7 → 4.8 → 4.9 → 4.10 is a chain, not a preference: 4.4 imports
`coverage.ts` and the generated manifest, and today's parity test forces both surfaces to change together. Nothing can
run in parallel except 4.2's document edits alongside 4.1's code — and even then 4.1's prefix control reads the
template file, so 4.1 lands first. 4.5–4.7 are separable and each reversible on its own; 4.8–4.10 cannot be
reordered, for the reasons in §14.1.

**Production continuity.** Every commit 4.1–4.7 lands on one branch; production keeps serving 1.10.1's 14-tool
surface until 4.8 merges, because `main` → production is the deploy path. The cross-surface window is 4.8 → 4.9 and
it runs **endpoint first**: for the minutes between the merge and the tag the endpoint serves 2.0.0 while npm still
serves 1.10.1. That is the safe direction — a 1.10.1 client calling a removed tool gets `-32602` naming
`docs/migration-2.0.md`, which is in the same merged tree; the reverse (npm at 2.0.0, endpoint at 1.10.1) would offer
a migration to a document no one could reach. 4.9's global re-patch is what makes a local `npx`/global run agree with
production afterwards.

---

## 15. Definition of done

`pnpm -r build && pnpm check && pnpm test` green on the exact reviewed bytes, with the before/after test count in row
4.5; reviewer `ship` with no edit afterwards; PR merged on green checks and the branch deleted; `v2.0.0` tagged at
`origin/main` and published with `pnpm verify:publish` passing and `npm view` showing 2.0.0; the global install
re-patched; Vercel production serving `main`; the production probe asserting **3 tools / 0 prompts / `2026-07-28` / 9
skills / no `Mcp-Session-Id`**; 1.10.1 deprecated with the migration pointer; `TASKS.md` ending with rows 4.1–4.10,
all `done`, and `plan-state.py --require-complete` exiting 0. A green local suite is not a production test.

## 16. What this plan could not verify

- The installed `@modelcontextprotocol/server` version and whether it emits `resultType` or answers `server/discover`
  — `node_modules/` is absent; §3 Q1, settled in 4.4 step 0.
- Whether Vercel's tracer follows the CJS→ESM dynamic import — §3 Q2, settled by 4.9's probe with the `includeFiles`
  fallback recorded in advance.
- Per-test counts today: the file count is **10** (`packages/*/test/*.test.ts`, globbed at plan time); the per-test
  number in `TASKS.md:18-19` is measured in row 4.5, not asserted here.
- Whether the review gate reads a checkout as a write that voids a standing verdict. v2 answered "there is no
  checkout"; that was false. `gh pr merge --delete-branch` **does** check out `main` and pull it (`pkg/cmd/pr/merge/merge.go`,
  `deleteLocalBranch` → `CheckoutBranch` + `Pull`), so the checkout happens inside 4.8. It voids nothing because the
  gate binds to content hashes of the reviewed files and `gh pr merge` is not among the commands it reads as a write
  (estate `AGENTS.md` §7) — but that is the gate's documented behaviour, not its source read here, so a refusal is
  still possible and its remedy is one `reviewer` pass over the unchanged tree.
- Whether the tag-triggered `publish-npm.yml` run always appears as the most recent run of that workflow by the time
  4.9 resolves it. 4.9 therefore pins the run's `headSha` to `origin/main` and fails with a message instead of waiting
  on a stale run; if the tag run was lost entirely, `gh workflow run publish-npm.yml` is the fallback
  (`workflow_dispatch` is declared at `.github/workflows/publish-npm.yml:7`).
- The "<5000-token body" tier for skills: token counts are not measurable without a tokenizer this repo does not have,
  so the plan asserts frontmatter validity and records body sizes instead of inventing a proxy threshold.
- That the Agent Skills extension is usable by any host that will actually connect: SEP-2640 is Final but Beta in host
  support, so no acceptance criterion assumes it (§7).

## 17. Review response

One line per finding; the section or task that now carries the fix is named. **v3 answers round 3**: F2 and F3 are
restated with what actually closes them, and N1–N3 are added. F1 and F4–F15 are unchanged and closed.

- **F1 — publish order and the 4.8 row/tag contradiction.** Fixed by §14 tasks 4.8–4.10 and §14.1: review → merge →
  tag → publish → probe; 4.8 (review + merge) and 4.9 (tag/publish/probe) carry no row, 4.10 records both in a
  `TASKS.md`-only commit after the tag, and the `git describe --exact-match HEAD` assertion is replaced by
  `git rev-parse v2.0.0^{commit} == origin/main`.
- **F2 — the copy sweep still could not go green (round 3; the round-2 fix named only the five reference documents).**
  Three files in the absence set were named by no task. Fixed in §11.5's disposition table and in row 4.6, whose file
  list and token grep now carry all three: `references/artifact-templates.md:841` ("… (repeat for all 7 gates)",
  inside the Impact Verification Report template that 4.2 does not rewrite); `docs/social-preview.svg:15,17`
  (`7 Gates`, `108 Checks` — **hand-edited**, because `scripts/gen-landing.py` writes only the three `index.html`
  files, `:326-330`, and emits no SVG, so no regeneration will ever fix it); and `package.json:3`
  (`7 quality gates`). §12's 4.6 grep is one command over the whole live surface, so a regenerated page cannot mask
  either the SVG or the root description.
- **F3 — the deviation was unnecessary; the spec is reproduced instead (round 3).** The round-2 argument — that a
  cross-key comparison adds nothing — was about **declared vs declared**: two numbers the caller typed, which no
  artifact text can fail. It did not apply to the spec's §8 fixture, which calls `vdd_check({phase:"tactics",
  content})` with **no `declaredCounts`** and prints `"action_count=1 < pillar_count=3"`
  (`docs/restructure_plan-20261126.md:504`, `:508`) — an **actual vs actual** comparison of actions found in
  `content` against pillars found in `priorArtifacts.strategy`. Fixed in §2 row 7, §3 Q5, §10, §11.1 items 1 and 4 and
  row 4.1: the fixture carries no `declaredCounts` and expects all three reasons; `checkCounts` keeps the per-key
  `declared == actual` check, separate and unchanged; a new `checkCrossKeyActual(matrix)` emits the literal reason.
  The word "deviation" is gone from the plan.
- **F4 — T6's non-vision work was abandoned.** Fixed in §4's T6 row and §11.5: a `G1–G7` absence assertion over
  `README.md:149` and `references/compliance-evidence.md:65`, plus an assertion that the vision template carries all
  seven `§0`–`§6` headings of `docs/vision-framework-v16.md:94-132`.
- **F5 — six prompt/tool names had no stated successor.** Fixed by §6's two replacement tables (14 tools, 20 prompts),
  with `no successor` spelled out for `vdd_clarify`, `vdd_get_next_task`, `vdd_detect_environment`, `clarify`,
  `get-next-task`, `detect-environment` and `e2e`; `-32602` now promises a successor *or* the words `no successor`;
  `docs/migration-2.0.md` must reproduce the tables (4.4).
- **F6 — the CJS shim's export surface was incomplete and dispatch was async.** Fixed in §10's shim row and row 4.4:
  `handleJsonRpc` (async), `isBrowser`, `html`, `SERVER_VERSION`; `api/mcp.js` awaits batch dispatch
  (`await Promise.all(body.map(...))`) and a single call (`await handleJsonRpc(body)`), per `:69` and `:87-90`.
- **F7 — "six child templates" was undefined and the grammar test could not bind field names.** Fixed in §11.2:
  a heading → `PHASE_CONFIG` key → exact token table for all ten headings in `references/artifact-templates.md`,
  with the five non-phase headings asserted to carry no `serves_*` line and the five phase ones asserted by string
  equality against `PHASE_CONFIG[phase].servesField`.
- **F8 — `V-###` was a second identity with no join.** Fixed in §5 Branch A: `OBJ-###` is authoritative, `V-###` is a
  projection key, the projection must not restate the metric, and every `V-###` must resolve to a distinct existing
  `OBJ-###`.
- **F9 — the reason for dropping `N ≥ 3` misread §2.5.** Fixed in §5 Branch A: §2.5 constrains *candidate* count; the
  objective bound is preset-relative in §8 (`Product 3–5`, `Feature 2–3`, `Lean 1`), so `declaredCounts.goals` is
  asserted against the §8 bound for the declared preset.
- **F10 — row 2.4's "skip removed at 2.6" dangling clause.** Fixed in row 4.5, which now states it supersedes
  `TASKS.md:23` by deleting the file.
- **F11 — 10 test files, not 9; two unplaced.** Fixed in §1, §8, §10 and §16: 10 files stated, and
  `server-surface.test.ts` and `http-transport.test.ts` are placed as **rewritten in 4.4** (their subjects survive).
- **F12 — `skills/list` specified two incompatible ways.** Fixed in §7 and §11.4 criterion 6: the `-32601` claim is
  deleted; `skills/list`/`skills/get` always answer, and SEP-2640 governs only host advertisement.
- **F13 — the 108 checks' loss was not accounted.** Fixed by §8's per-gate table: 20 behaviours retained as invariants,
  60 forward/backward checks and 28 S&T assumptions become skill checklist prose, G0's 6 are outside the 108, and
  placeholder density is dropped (so its two helpers are no longer lifted).
- **F14 — `gate-count-consistency` locator and fork.** Fixed in §10 and row 4.6: `:63-77`, and the action is
  **delete** (it only prints `WARN`), not "retargeted or removed".
- **F15 — `Mcp-Session-Id` still exposed via CORS.** Fixed in row 4.4: `api/mcp.js:24`'s
  `Access-Control-Expose-Headers` line is deleted with the session-id mint at `:81-85`.
- **N1 — two token controls were dropped.** Fixed in §11.5 and row 4.6: `17 phase` and `16 subcommand` rejoin the
  absence set (they were in `docs/plan-vision-skill-only.md`'s §4.3b tokens, `:316`, and v1 of this plan dropped
  them). 2.0.0 falsifies both: the CLI goes from 16 subcommands to 3 and the engine's 17 phase functions become 3
  tools. The four files they hit — `SKILL.md:248,250`, `README.md:412,414`,
  `packages/vdd-engine/package.json:4`, `packages/vdd-cli/package.json:4` — were already on 4.6's file list, so only
  the tokens were added; §11.5 says so explicitly so a later reader does not look for a fifth new file.
- **N2 — the "no checkout" claim was false.** `gh pr merge --delete-branch` runs `CheckoutBranch(base)` then
  `Pull(base)` when the PR head is the checked-out branch (`pkg/cmd/pr/merge/merge.go`, `deleteLocalBranch`), so the
  checkout happens inside 4.8 rather than being avoided. It voids nothing — the gate binds to content hashes of the
  reviewed files and `gh pr merge` is not a write-shaped command (estate `AGENTS.md` §7) — and the plan now says that
  instead of claiming no checkout. Fixed in §12's 4.9 block, §13's gate row, §14.1(c), row 4.9 and §16. Added with
  it: the tree assertion `test "$(git rev-parse v2.0.0^{tree})" = "$(git rev-parse origin/main^{tree})"` immediately
  after tagging, and — because that pair resolves from one ref and therefore cannot fail on its own — the assertion
  that can: `v2.0.0^{commit}` equals 4.8's `mergeCommit`, checked before the push and with the local tag deleted on
  failure, so a `main` that advanced between review and merge is never published unseen.
- **N3 — 4.9's npm assertions raced CI.** Publishing happens in `publish-npm.yml` on the tag push
  (`.github/workflows/publish-npm.yml:3-6`), so `npm view` and `pnpm verify:publish` could run before the run
  finished. Fixed in §12's 4.9 block, row 4.9, §13's new risk row and §16: 4.9 resolves the run from
  `gh run list --workflow publish-npm.yml --limit 1`, pins its `headSha` to `origin/main`, and waits with
  `timeout 900 gh run watch <id> --exit-status --interval 20`; a timeout exits 1 with a message saying the assertions
  would race CI rather than test it.
