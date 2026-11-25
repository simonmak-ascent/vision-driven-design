# Implementation plan — Vision becomes a skill-only procedure (v7)

Repository: `/home/simonmak/git/vision-driven-design`
Framework: `docs/vision-framework-v16.md` — certified (security `pass`, reviewer `REVIEW-VERDICT: ship`).
This v7 applies review rounds 1–5 **and** round 6 (two unowned `api/` tokens, T0b's unfalsifiable
verify, the count fixture's scope, and six low findings) and round 7 (§9), plus the operator's adopted decisions: A1 corrected, A2 split by surface, and the
release split into two (1.10.0 clone, 1.11.0 vision). Two structural rules from round 5 govern every
task below and are stated once where they apply: **`TASKS.md` carries completed rows only** (§7) and
**a fixture belongs to the task that can make it green** (§4). All locators are re-derived at
execution (T0b); they were produced by inspection and will drift.

## 0. Framework amendments (adopted by the operator, 2026-11-25)

v16 leaves three things unspecified and in one place says "retire `chainContext`" while the chain still
needs `V-00n`. Each delta is recorded here rather than silently retained.

- **A1 — `chainContext` stays, read-only.** `engine.ts:957-964`, **eight call sites**
  (`:151,235,353,406,486,559,801,1529`, plus the definition at `:957`), all local reads: no network, no gate, no signed claim — none
  of the risk classes v16 removed lives here. When `vdd/vision.md` is absent it falls back to `V-001`,
  which the source documents as *"canonical V-001 → S-002 → T-003 numbering for a fresh project"*
  (`:956`) — the same placeholder class as the `SP-<n>` / `TK-<n>` ids every template already carries,
  so it invents nothing. (Round 3 caught the earlier text claiming the header "says the parent was not
  supplied"; it does not. That was a description defect, now corrected — the function is unchanged.)
  The hosted twin has no `chainContext`; it hardcodes `hdr("V-001 → S-002")` at `_vdd-rpc.js:584`,
  which stays. Alternative if rejected: delete it and accept headers with no parent id.
- **A2 — `vdd/vision.md` is required locally and excluded on the hosted surface.** After this change
  nothing writes the file on either surface, so the requirement is only satisfiable where a skill can
  author it. **Local** `validate` keeps the node in `present === total` (`engine.ts:680,720`) and fails
  with a message naming the skill procedure — the last remaining enforcement that Phase 1 happened, the
  same shape as `constitution.md` at gate 0. **Hosted** `vdd_validate` **deletes the `vision.md` canonical row** (`_vdd-rpc.js:675`) — the only edit
  that removes it from `uncovered`, `present` **and** `total`, because excluding it from
  `present === total` alone leaves it in `uncovered` (`:690`) and `substancePassed` false. The same
  reason applies to the places the hosted surface still *solicits* the file: `:701` (read-delegation
  envelope), `:731` and `:754` (trace / inspect file lists), `:864` and `meta.ts:42,43` ("Requires
  vdd/vision.md"). Each is removed, because the only way a hosted user could satisfy them is by
  uploading the narrative — the egress v16 §4 forbids. The hosted `e2e` scaffold also hands out the
  `phase1_vision` template (`:772`, `:785`) and a write list containing `vdd/vision.md` (`:841`) —
  inside the `:764-851` block already listed, but named here because the T7 grep token is `vdd_vision`,
  which does not match `vdd/vision.md`, so only §4.2 can catch it. `chainOf`/`fullChain` are
  **engine-only** (`engine.ts:722-752`); the hosted reporters are `traceProject` (`:541`) and the
  hardcoded chain (`:731`), and hosted e2e already reports the artifact as unavailable, so the two
  cannot contradict each other.
- **A3 — `readTargetDomains` dual grammar** (`engine.ts:192-213`). Order: `### 4.4`, then legacy
  `## Target Domains`. Grammar: one line per domain, `- [x] WebApp` / `- [ ] Data Storage`, parsed
  **per line**. Two existing defects are fixed: `section[0].includes('[x]')` (`:206`) admits every
  domain once one is checked, and `\z` (`:196`) is a literal `z` in a non-`u` regex, never
  end-of-input. The hosted strategist (`_vdd-rpc.js:577`) lists all primers and never calls
  `domainPrimersForTargets`; that stays, documented as a hosted/local difference — the hosted endpoint
  has no filesystem and cannot read §4.4.

Each amendment is a delta to a certified document. **All three were adopted by the operator on
2026-11-25** (the round-3 entry in §9 records the adoption), so T5 carries no outstanding approval
gate and §0 no longer contradicts §9. The "alternative" clauses stay as the option that was not
taken, not as an open condition on any task.

## 1. Decision

Retire `vdd_vision` from every *executable* surface — engine phase, stdio tool, hosted tool, MCP
prompt, CLI subcommand — and make the artifact a skill procedure authored from `SKILL.md` +
`references/`. The code stops writing and judging it; the chain still reads it (A1).

Surfaces after: **13 tools · 19 prompts · 16 phases · 15 CLI subcommands · 6 gates · 91 checks.**

## 2. Evidence (each re-checked against source)

| Fact | Source |
|---|---|
| Prompts are 20, not 21 | `prompts.ts:20-222` and `_vdd-rpc.js:1013-1214` each define 20; `AGENTS.md:71` is stale |
| `PHASE_NAMES` 17 → 16 | `meta.ts:5-23` |
| `MCP_TOOL_PHASES` 14 → 13 | `server.ts:101-103` filters `e2e/trace/analyze` |
| hosted phases 14 → 13 | `_vdd-rpc.js:882` |
| CLI `PHASE_DESC` 16 → 15 | `cli.ts:8-25` |
| G1 is 14 checks (5F/5B/4A) | `tallyGate('G1', …, 5, 5, 4)` `engine.ts:1104`; hosted `_vdd-rpc.js:103` |
| 108 = 5/5/4 + 4/5/4 + 10/4/4 + 7/6/4 + 6/6/4 + 4/7/4 + 6/5/4 | `references/quality-gates.md:329` |
| 108 − 14 − 3 = **91**, 36/31/24 | arithmetic; no test asserts 108 today |
| Canonical total is `output.gates.summary.checksTotal` | `engine.ts:1535`; `_vdd-rpc.js:831` (NOT `gateResult.total`, which is checksRun at `engine.ts:1566`) |
| `totalGates` is 8; the canonical check count is 7 today, 6 after | `totalGates = gates.length` (`engine.ts:1371`) counts G0–G7 = **8**; `checksTotal` adds only the non-G0 gates (`:1378`), so the canonical count is **7** today and 6 once G1 is deleted — the 8 is the runtime array length, never the headline; hosted twin `_vdd-rpc.js:808` |
| Parity test forces one commit | `api-surface.test.ts:108-118` (meta↔hosted), `:136-153` (schema↔hosted), `:169-176` (prompts↔hosted) |
| Writers of `vdd/vision.md` | `engine.ts:147-189`, `_vdd-rpc.js:570-574`, e2e via the phase; `amend` is read-only |
| `selfHeal` re-injects the 7 sections | `engine.ts:995,1005-1044`; `_vdd-rpc.js:264,290` |
| `validate` requires it for a GO today | `engine.ts:662,720`; `_vdd-rpc.js:675,703` |
| Version surfaces are split today | `vdd-engine`/`vdd-cli` `1.9.0`, `vdd-mcp` `1.9.5`, `server.json:6,:32` `1.9.5`, `_vdd-rpc.js:880` `1.9.5` — so 1.10.0 needs a real bump on all seven files / eight values (`server.ts:106` and `cli.ts:6` are literals no test compares) |
| `TASKS.md` already passes the ship gate | rows 1.1–1.4 (`TASKS.md:12-15`), every status `done`, no `ready` row |
## 3. Change map

### 3.1 Removal — every surface that registers, writes, reads, prompts or counts `vision`

**Engine registrations** — `meta.ts:7` (`PHASE_NAMES`), `:37-40` (`PHASE_META`), `:122`
(`TOOL_REQUIREMENTS`), `:296` (`PARAM_RELATIONSHIP_NOTES`); stale cross-refs `:34,42,43,298`;
research-subagent input strings `:159,169,179,189,199`; `:74` "28 S&T / 7 gates" → 24 / 6; the `e2e`
entry `:93-96` ("the full 8-phase chain … all 10+ template files", "Pass `statement` with your
vision") → nine phases, nine artifacts, statement optional. That text contains no `vdd_vision` token,
so neither the grep nor a parity test would catch it.

**Engine behaviour** — `engine.ts:146-189` delete `vision()`; `:191-213` dual grammar (A3);
`:225,236-237` strategize's "Derived from `vdd/vision.md`" reference text; `:654-720` inventory node stays required locally (A2); `:722-752` report row / `visionId` / `fullChain` **stay** — A2 keeps the node required locally, so deleting them would make `validate` demand the file and then not report it; `:752` reword the NO-GO message to name `SKILL.md` phase 1, which is what §4.1 asserts; `:958-961` chainContext
placeholder (A1); `:995` delete `REQUIRED_SECTIONS['vdd/vision.md']`; `:1025` delete the self-heal
target; `:1070-1105` delete `gate1`; `:1300-1349` G7 — drop the vision node from `allPaths` (`:1300`; `keys` is the hosted name), delete
F7.4/B7.3/B7.5, and **re-baseline the thresholds**: `:1317` "All 10 artifacts" and `:1345`
`foundCount >= 8` must become `keys.length` / `keys.length - 1` (9 → 8 of 9), or the gate weakens by
deletion — **and the declared tallies must move with them**: `tallyGate('G7', …, 6, 5, 4)` at `:1349`
→ `5, 3, 4`. `gateSummary` sums the *declared* totals (`:1378`) while `tallyGate` only reports them
(`:1366`), so deleting three checks without this leaves `checksTotal` at 94 — the exact symptom this
plan exists to remove; `:1386-1569` e2e — no `vision()` (`:1404-1407`), no `gate1` (**both** call sites,
`:1415` and `:1492`), **delete the
`statement` guard at `:1387`**, phase list `:1506`, `phasesCompleted` 10 → 9, `nextActions`
`:1551-1561`; `:1572,1578` `RAW_PHASES` / `WRITE_PHASE_NAMES`.

**stdio** — `server.ts:10-11,31` (`statement`, `statementReq`, the `vision` schema), `:67`
annotation, `:106` version; `prompts.ts:60-69` delete the prompt, rewrite `start_vdd_project:29`,
init `:58`, e2e `:220`, **and the two prompts that still require the file**: `:78` ("Confirm
vdd/vision.md exists and pass it") and `:88` (`artifactFiles (vision.md, strategy.md)`).

**CLI** — `cli.ts:6` version, `:10` route, `:23` e2e args → `[]`, `:46` dead `statement` branch.

**Hosted twin** — `_vdd-rpc.js:83-104` `gate1`; **`:235-258` `gate7` — `keys` `:237`, F7.4 `:244`,
B7.3 `:249`, B7.5 `:251`, thresholds `:240,253`, **and the declared tally `tallyGate(…, 6, 5, 4)`
`:258` → `5, 3, 4`** — the same defect as the engine, and this block is why the first draft reached
94/7 on the hosted surface); `:264,290` sections; `:326` env map; `:411`
write list; `:570-574` handler; **`:577,584` domain primer selection and the "Derived from" text**;
`:675` **delete the `vision.md` canonical row** (A2); `:690` `uncovered` then no longer lists it; `:701` drop `vdd/vision.md` from the read-delegation envelope; `:731`/`:754` drop it from the trace and inspect file lists; `:864` drop "Requires vdd/vision.md"; `:772,785` stop returning the `phase1_vision` template and `:841` drop it from the e2e write list; `:764-851` e2e (`statement` guard, phase 1, `gate1`,
`phasesCompleted`, `nextActions`); `:880` `SERVER_VERSION`; `:882` phase list; `:862,888,890,913,933-934,
951` meta/notes/annotations/fields — `:862` is the `init` description ("run this first, before
vdd_vision"), the second `api/` token T7's grep would otherwise still find; `:1022,1051,1061,1071,1081,1213,1234` prompts and instructions;
`:344-348` research input strings; `:778` hard-coded `checks: 108` → the recomputed total;
`:1303-1513` docs page (13 tools / 91 checks / 6 gates, the `vdd_vision` example heading at `:1510`
and its curl body naming `"vdd_vision"` at `:1511-1513` → `vdd_strategize`).

**Stale gate numbering — eleven sites, two owners** (measured: `grep -rn 'G1.\{0,3\}G7'` over the
repo finds exactly these, plus the plan's own mentions and `docs/plan-best-in-class.md:38` — a record
document outside live-surface, already excluded by name in 4.3b, so neither owner writes it). The seven strings that read "G1–G7" are
`meta.ts:90`, `meta.ts:91`, `engine.ts:864`, `_vdd-rpc.js:761`, `_vdd-rpc.js:876`, `_vdd-rpc.js:1193`
and `prompts.ts:200`; the **eighth** is the comment at `engine.ts:1377`, which says the canonical check
count "covers G1–G7 only (G0 is pre-chain)". After G1 is gone the set is G0 (pre-chain) plus G2–G7, so
all eight become **"G2–G7"** — **T5's work**, since all eight live in §3.1's code surface.
Three document sites carry the same token and are **T6's**, because §4.3a's absence assertion is T6's
green and covers `README.md` and `references/*.md`: `README.md:149` (a Mermaid node, "Re-run affected
gates G1–G7"), `references/compliance-evidence.md:65` (the impact-report tree, "Gate Results (G1–G7)")
and `docs/architecture.md:28` (the gate-definition row). `docs/architecture.md` sits outside the
fixture's live-surface list (§4.3a), so its edit is carried in the same commit rather than asserted.
Parity compares equal-to-equal and T3 asserts only keys and prompt tokens, so none of the eleven is
caught by an existing test: reword them and assert the absence in §4.3a.

**Hosted e2e without a filesystem** — `_vdd-rpc.js:764-785` is stateless and receives only
`statement`. It cannot see a skill-authored artifact. Decision: it stays as a nine-phase scaffold and
reports `vision: 'skill-authored — not available at the endpoint'`, emitting the placeholder chain
from A1. It is unadvertised (`toolDefs` excludes `e2e`), and the plan states this rather than claiming
it "requires" a file it cannot read.

**Tests that break and must be updated** — `packages/vdd-mcp/test/server-surface.test.ts:5,11`,
`api-surface.test.ts:47-48`, `http-transport.test.ts:7,70`, `packages/vdd-engine/test/
graceful-input.test.ts:25`, `packages/vdd-engine/test/validate.test.ts:33`.

**Retained deliberately** (all read-only): `chainContext` (A1), the `trace`/`inspect` Vision node
(`engine.ts:779`; `_vdd-rpc.js:541`) — it will report `exists:false` for skill-only projects, which
is correct and documented — and the `> Impact Chain:` header requirement.

### 3.2 Skill documents (authority: v16 §3–§6)

- `references/artifact-templates.md:84-180` → the §0–§6 template verbatim, plus two structural
  notes the code depends on: the `> Impact Chain: V-001` header, and a `### 4.4` block whose lines
  are `- [x] WebApp`, `- [ ] Data Storage`, `- [ ] ETL`, `- [ ] Infrastructure`. The verbatim rewrite
  also disposes of `:171` (`<!-- Filled by AI during Gate G1 … -->`), which no token sweep sees —
  and `:841` (`| ... (repeat for all 7 gates) |`) must become 6 gates in the same pass, because
  4.3b's `7 gates` absence assertion hits that line whether or not a token sweep does.
- `references/prompt-patterns.md:37-89` → V0–V11, the ≤5-question gap prompt, evidence and
  local-only rules, the §6 checklist; **and fix every other vision reference**: `:97,113,199,692,747,
  759,841`; **and the Gate 1 prose**, which the `G1–G7` token check cannot see because it says `G1`:
  `:194-217` ("Bi-Directional Gate G1 Prompt (Vision → Strategy)") and `:780-782,791` ("For each of
  the 7 gates (G1 through G7)" and the trailing "(repeat for all 7 gates)" — both hit by 4.3b's
  `7 gates` absence token).
- `references/workflow-phases.md:44-87` → V0–V11, four review points, commit step; fix `:102`, plus
  the Gate 1 step at `:122-123` ("Step 2.4 — Run Bi-Directional Gate G1 (V→S)"), `:363`
  ("Step 8.6 — S&T assumption validation (all 7 gates)", hit by 4.3b's `7 gates` token) and the
  phase table's `G1 (V→S)` cell at `:399`.
- `SKILL.md` — `:59,64-66` quick start, `:126-141` phase 1 row, `:145` heading "## 7 Bi-Directional
  Gates", `:151` the G1 table row, `:159` count, `:173` command row, `:235`; new subsection
  "Phase 1 — Vision is a skill procedure" stating there is no tool.
- `references/quality-gates.md` — `:3` "Seven bi-directional gates", `:26-62` Gate 1, `:267-300`
  F7.4/B7.3/B7.5, `:308` the G1 substance row, `:314` "G1-G6", `:316-329` the total → 6 / 91
  (36/31/24). **T7's** (the §3.2 tail), not T6's: §4.3a asserts only the `G1–G7` token over
  `references/*.md`, and this file says `G1`, `G1-G6` and `G1 (V→S)` — so leaving it to T7 keeps T6's
  fixture reachable. T7's own `grep -c 'G1'` check is what proves it left.
- **The document half of the stale-gate reword (T6).** `README.md:149` and
  `references/compliance-evidence.md:65` read "G1–G7" and are in the live-surface set §4.3a asserts
  over, so they land in T6's commit — not T7's — or the fixture is red at T6 for a reason T6 did not
  cause. `docs/architecture.md:28` is reworded in the same commit; the fixture does not assert it
  (§3.1, §4.3a).
- `references/INDEX.md:25,56-57,73`; `references/ai-agent-patterns.md:34,36,72,78,84,90,96,151,157,
  271` (the earlier `:33,192` were wrong); `references/quick-reference.md:24,40-46`.
- `scripts/install.sh:39` prints `/vdd:vision "your vision"` to every new installer — a surface no
  parity test reads, so it is named here and added to the T7 grep.

### 3.3 Counts → 13 / 19 / 16 / 15 / 6 / 91

`SKILL.md`, `README.md:72,78,105,112,129,160,174,258-278,361,399,413,416`, `llms.txt:3,14,17,21,26,
29,31`, `context7.json:4,13`, `references/quick-reference.md:5,10,24,40-46,93`,
`references/{INDEX,quality-gates,workflow-phases,prompt-patterns,artifact-templates,ai-agent-patterns}
.md`, `docs/deployment.md:3`, `CONTRIBUTING.md:9`, `glama.json:5`, `server.json:5`, `package.json:3`,
`packages/vdd-engine/package.json:4`, `packages/vdd-cli/package.json:4`,
`packages/vdd-mcp/package.json:4`, `scripts/gen-landing.py:22,35-47,78-90,126-133`,
`index.html`/`zh/`/`hk/` (**regenerate only**),
`.github/workflows/vdd-quality-gates.yml:61-70` (`108` → `91`), `docs/social-preview.svg:15,17`
(`7 Gates`, `108 Checks`).
`docs/og.png` has no generator (Q9) — edit the SVG, record the PNG as a gap.

Historical numbers in `TASKS.md`, `docs/plan-best-in-class.md`, `docs/vision-framework-v*.md` are
records and are not rewritten. One exception: `docs/plan.md:163-164` (C15/C15a) asserts `108` is "still
present and unchanged (113 fails)" and sweeps six `15` claims — unsatisfiable at 91/13, so those two
lines are re-baselined in the same commit.

`CHANGELOG.md:22-27`'s **content** needs no edit, but its heading does: retitle `CHANGELOG.md:3` from
`## [Unreleased]` to `## [1.10.0] - <date>` at T0a. Leaving it would give T9 two `[Unreleased]`
headings and record 1.10.0 as never released, while the "now **14 tools and 20 prompts**" is correct
for 1.10.0. **One bullet inside that section must be amended in the same commit**: `CHANGELOG.md:19-20`
says `SERVER_VERSION` and the stdio server version are "synchronised to the package version
(**1.9.5**)" — retitling `:3` with "content unchanged" would place a 1.9.5 statement inside 1.10.0, so
that parenthetical becomes **(1.10.0)**. The rest of `:5-27` is unchanged. The vision removal then
opens a *new* `## [Unreleased]` stating 13 tools / 19 prompts, which becomes 1.11.0.
## 4. Fixtures — written red first, run red for the right reason

Four files: three under `packages/vdd-mcp/test/` and the engine-behaviour one under
`packages/vdd-engine/test/`. The root `vitest.config.ts` includes `packages/*/test/**` and only
`vdd-engine` declares a `test` script, so all four run through it. **Each fixture belongs to the task
whose work makes it green**, and a fixture that asserts two tasks' deliverables is split — that is
round 5's finding 1 and it is why 4.3a and 4.3b are two files, not one.

**4.1 `packages/vdd-engine/test/vision-retired.test.ts`**
- e2e is pre-seeded with a skill-authored `vdd/vision.md`; the fixture calls `PHASES.e2e` directly
  with a legacy `statement` argument to prove it is now **ignored** (the guard at `engine.ts:1387` is
  deleted, §3.1), and asserts `success === true`, `files` contains the other nine artifacts and
  **excludes** `vision.md`.
- `validate`, by surface (A2): **local** without `vdd/vision.md` fails with a message naming the skill
  procedure, and **with** it passes (`gateResult.passed === true`; there is no `substancePassed` field —
  `engine.ts:770` returns `gateResult`); **hosted** without it passes because the canonical row is
  absent — it appears in neither `uncovered` nor `present`/`total` (`_vdd-rpc.js:675,690,703`), which
  is the effect of deleting the row, not of excluding a present row from the count.
- **The message has no observable in the return value, so assert the file.** `validate` returns
  `{ success, artifact, output, gateResult }` (`engine.ts:759-771`) — no message field — and the
  reworded sentence at `:752` exists only on the `## Decision` line of
  `vdd/impact-report.generated.md`, which `:756-757` writes. So in the **local-fails** case above, read
  that file and assert its `## Decision` line matches `/skill/i`. (Asserting the return value for the
  skill name would pass on nothing.)
- `strategize` resolves `webapp.md` from a §4.4 fixture with `[x] WebApp` **and** `[ ] Data Storage`
  (proves the per-line parse), and from a legacy `## Target Domains` fixture.
- `e2e` summary, **both surfaces**: `output.gates.summary.checksTotal === 91` on the engine
  (`engine.ts:1535`) and on the hosted e2e (`_vdd-rpc.js:831`), and
  `gateResults.filter(g => g.gate !== 'G0').length === 6` on each. Asserting only the engine is how
  the hosted 94/7 survives, so this assertion is the control for finding 1.
- **The 91 is only true if every gate reaches `tallyGate`.** `gateSummary` sums the *declared* totals
  (`engine.ts:1378`), but a gate that short-circuits returns `makeGateFail` with
  `forwardTotal/backwardTotal/assumptionsTotal` all `0` (`engine.ts:1352-1355`; hosted
  `_vdd-rpc.js:86`), so a chain missing one artifact reports **fewer** than 91 and the assertion fails
  for a reason unrelated to the counts. The fixture therefore (a) pre-seeds the full nine-artifact set
  before running `e2e`, and (b) asserts the per-gate totals as well as the sum —
  `{G2:13, G3:18, G4:17, G5:16, G6:15, G7:12}` as `forwardTotal+backwardTotal+assumptionsTotal`, which
  is 36/31/24 and sums to 91. A single bad total then names the gate instead of the chain.
- `PHASES` has no `vision`; `PHASE_NAMES.length === 16`.

**4.2 `packages/vdd-mcp/test/retired-surface.test.ts`**
- `MCP_TOOL_PHASES.length === 13`; hosted `toolDefs().length === 13`; neither contains `vdd_vision`.
- `PROMPTS.length === 19`; hosted `listPrompts().length === 19`; no prompt named `vision`.
- No `vision` key in `PHASE_META`, `TOOL_REQUIREMENTS`, `PARAM_RELATIONSHIP_NOTES`, annotations
  (both surfaces).
- **No hosted solicitation of `vdd/vision.md`.** Assert that no delegation envelope, `needsInput` output,
  tool description, `vdd_init` template set or hosted `e2e` scaffold in the twin contains
  `vdd/vision.md`. This is the egress guard A2 depends on and a global grep cannot express it, because
  the skill documents legitimately tell the agent to author that file.
- Prompt bodies: an explicit allowlist of the prompts permitted to name the *file*, asserted
  exhaustively — `{ strategize: /vdd\/vision\.md/, tactics: /vision\.md/ }` — and every other prompt
  body must match neither token. No "where intentional" escape: the allowlist is the predicate, so a
  new exception fails the test instead of widening it.
- CLI: spawn `node packages/vdd-cli/dist/cli.js vision`; assert non-zero exit **and** that stderr
  matches `/unknown command/i` (a `MODULE_NOT_FOUND` from a stale `dist` must fail the test, not pass
  it); `--help` lists 15 subcommands.

**4.3a `packages/vdd-mcp/test/docs-vision-parity.test.ts` — T6's green**
- Repo root located via `import.meta.url`, not `process.cwd()` (tests run inside the package).
- `references/artifact-templates.md` contains all seven §0–§6 headings; the other three skill files
  contain a marker plus absence of the retired **vision-specific** headings (`## Vision Statement`,
  `## Impact Model`, `## Stakeholder Map`, `## Success Metrics`, `## Constraints & Boundaries`,
  `## Target Domains`, `## S&T Assumptions (Vision → Strategy)`) — compared after normalising heading
  levels, and scoped so the strategy/plan/spec templates' own "S&T Assumptions" sections do not
  fail it.
- **Live-surface**, defined once here and reused by 4.3b and by T7's grep: §3.3's allowlist, plus
  `references/*.md`. `docs/architecture.md` is an explicit, reasoned exclusion — it is a proposal
  document (`docs/architecture.md:3`, "Status: **proposed**"), it is not in the count allowlist, and
  its `:28` "G1–G7" cell is reworded in T6's commit anyway so the statement cannot go stale while the
  fixture stays silent about it.
- No live-surface file contains `G1–G7` or `G1-G7` — after retirement the set is G0 (pre-chain) plus
  G2–G7; the historical framework documents are outside the allowlist by name. This is why
  `README.md:149` and `references/compliance-evidence.md:65` are T6's edits and not T7's (§3.1): the
  assertion is red until both are reworded.
- **This file asserts no counts and no figure of 108 or 91.** It cannot be green at T6 if it does, and
  the two concerns have different owners; the count assertions live in 4.3b.

**4.3b `packages/vdd-mcp/test/count-parity.test.ts` — T8's green**
- Same repo-root resolution; same **live-surface** definition as 4.3a.
- **Two assertions, because one cannot hold per file.** No file in the allowlist states all the
  headline numbers, so "contains `13 tools`, `19 prompts`, `91`" over the set could never be green.
- **Presence**, over a named count-bearing subset, each with the phrasing that file uses today
  (measured): `SKILL.md` `13 tools` (`:247,249`); `README.md` `13 tools` (`:232,413,416`);
  `llms.txt` `MCP tools (13)` (`:14`) and `MCP prompts (19)` (`:26`); `docs/deployment.md`
  `same 13 tools` (`:3`); `references/quick-reference.md` `13 tools` (`:93`);
  `glama.json:5`, `server.json:5` and the root `package.json:3` `6 quality gates`; the three published
  package descriptions — `packages/vdd-mcp/package.json:4` `13 tools`,
  `packages/vdd-engine/package.json:4` `16 phase functions`, `packages/vdd-cli/package.json:4`
  `15 subcommands` — each asserted **by file**, because the CLI description reads
  "7 bi-directional quality gates" and the literal `7 quality gates` token would not match it;
  `CONTRIBUTING.md:9` `91 gate checks`; `91` in `index.html`/`zh/index.html`/`hk/index.html`. A file
  outside this subset carries no presence requirement — `glama.json:5`, `server.json:5`,
  `package.json:3`, `CONTRIBUTING.md:9` and `.github/workflows/vdd-quality-gates.yml:61-70` carry gate
  or phase counts but no tools/prompts phrase, which is why the subset is named rather than the whole
  allowlist.
- **Absence**, over the **whole** §3.3 allowlist plus `references/*.md`: none contains `14 tools`,
  `20 prompts`, `21 prompts`, `17 phase`, `16 subcommand`, `108`, `7 gates`, `7 Gates` or
  `7 quality gates`. The three gate tokens are what catch `README.md:112` ("### The pipeline and its
  7 gates"), `:361,399` ("7 gates with 108 checks") and `docs/social-preview.svg:15` ("7 Gates"),
  which a tools/prompts-only set leaves stale. `17 phase` and `16 subcommand` are what make §1's
  "16 phases · 15 CLI subcommands" verified rather than asserted: without them `SKILL.md:248,250`
  and `README.md:412,414` would ship stale.
- `TASKS.md`, `CHANGELOG.md`, `docs/plan.md`, `docs/plan-best-in-class.md` and
  `docs/vision-framework-v*.md` are excluded by name, because those numbers are the record. The
  generated landing pages are in the allowlist, so a no-op generator leaves a stale `14 tools` there
  and fails this fixture.
- Written **red first in T8**, with the red pasted into row 2.9; it is not created at T6, where the
  tree still legitimately says 14/20/108 in the files T8 has not touched yet.

Probe discipline: each fixture's **red run is pasted into its `TASKS.md` row**, and a harness failure
(missing module, wrong runner) is never accepted as the red.

**The red bytes cannot be committed as red.** The estate review gate refuses a `git commit` unless a
passing test invocation over the same bytes is the last recorded one, and a deliberately failing suite
is never that. So **T2 and T3 commit their fixtures behind `it.skip`**, with the red output in their
rows; **T5 removes the `it.skip`** in the commit whose implementation makes them green. (The
permitted alternative — a green subset run as the last recorded invocation — is allowed by the gate
but leaves a failing file on `main`'s tip until T5, which T5's own `pnpm -r build && pnpm check &&
pnpm test` would fail on, so the skip is the route this plan takes.)

## 5. Verification commands

```bash
# T0a — every version value reads 1.10.0 before the tag publishes anything. Seven files, EIGHT
# values: api-surface.test.ts:183-190 pins THREE (the vdd-mcp package.json version at :184-185,
# SERVER_VERSION, and server.json.version at :190), so server.json packages[0].version,
# server.ts:106, cli.ts:6 and the vdd-engine/vdd-cli package.json versions are guarded by no test.
node -p '["packages/vdd-engine/package.json","packages/vdd-cli/package.json","packages/vdd-mcp/package.json"].map(f=>require("./"+f).version).join(",")' | grep -qx '1.10.0,1.10.0,1.10.0'
test "$(grep -c '"version": "1.10.0"' server.json)" = 2       # :6 and packages[0] :32
grep -q 'const SERVER_VERSION = "1.10.0";' api/_vdd-rpc.js      # :880
grep -q "version: '1.10.0'" packages/vdd-mcp/src/server.ts      # :106 — a bare literal no test compares
grep -q ".version('1.10.0')" packages/vdd-cli/src/cli.ts        # :6 — 1.9.0 today
pnpm --filter @simonmak-ascent/engine test api-surface
test "$(npm view @simonmak-ascent/mcp version)" = 1.10.0        # 1.9.5 today; publish rejects a re-publish

# T0b — re-derive every locator in §3 against the published tree, then record the result as row 2.2.
# The inventory grep is narration, not a control: it prints a count and cannot fail. The CONTROL is
# the locator walk below: it exits 1 on the first `path:line` in §3 with no file or no line.
# Exit 0 from plan-state.py here means "no invalid and no stale row" — plan-state.py:229 prints PASS
# on exactly that condition (every status declared, every blocker exists, none stale). It does NOT
# mean "every row is complete": `awaiting you`, `yours` and `blocked by <incomplete>` also exit 0,
# and at T0b every row is already `done`, so it passes by construction and is not the verify.
grep -rn "vision" packages/vdd-engine/src packages/vdd-mcp/src packages/vdd-cli/src api/_vdd-rpc.js | wc -l
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md
python3 - <<'PY'
import os, re, subprocess, sys
src = open("docs/plan-vision-skill-only.md", encoding="utf-8").read()
sec = src.split("## 3.", 1)[1].split("## 4.", 1)[0]
refs = sorted(set(re.findall(r'`([A-Za-z0-9_./-]+\.(?:ts|js|json|md|sh|yml|svg|py|txt)):(\d+)', sec)))
bad = []
for path, n in refs:
    cand = path if os.path.isfile(path) else None
    if cand is None:
        hits = subprocess.run(["git", "ls-files", "--", "*/" + path],
                              capture_output=True, text=True).stdout.split()
        if len(hits) != 1:
            bad.append(f"{path}:{n} — {len(hits)} candidate files"); continue
        cand = hits[0]
    lines = open(cand, encoding="utf-8").read().splitlines()
    if int(n) > len(lines) or not lines[int(n) - 1].strip():
        bad.append(f"{path}:{n} — empty or past EOF in {cand}")
print("\n".join(bad[:10]))
sys.exit(1 if bad else 0)
PY

# T1 — YAML assertion (fails today), then post-merge observation
python3 -c 'import yaml;d=yaml.safe_load(open(".github/workflows/vdd-quality-gates.yml"));p=d[True]["pull_request"]["paths"];assert "packages/**" in p and "api/**" in p'
gh run view "$(gh run list --workflow vdd-quality-gates.yml --limit 1 --json databaseId --jq '.[0].databaseId')" \
  --json jobs --jq '.jobs[].name' | grep -qx build-test     # after merge; prints alone cannot fail

# T2, T3 — red first, and each task commits its own row with the red output in it.
# T6 owns 4.3a and writes it red itself; T8 owns 4.3b.
pnpm --filter @simonmak-ascent/engine test vision-retired
pnpm --filter @simonmak-ascent/engine test retired-surface
# red evidence must contain a count/behaviour assertion and NOT "Failed to load"

# T5 — full gate
pnpm -r build && pnpm check && pnpm test

# T6 — write 4.3a red, then the four skill documents plus the document-side G1–G7 rewords
# (§3.1: README.md:149, references/compliance-evidence.md:65, docs/architecture.md:28) until green.
# It fails on a heading, a retired section, or a surviving G1–G7 token; it cannot fail on a count,
# because it asserts none.
pnpm --filter @simonmak-ascent/engine test docs-vision-parity

# T7 — §3.2 tail. README.md, llms.txt and context7.json are NOT targets: their `vdd_vision` hits
# (README.md:72,160,260,270, llms.txt:17, context7.json:13) are count and command-table edits owned
# by T8, so listing them here would make this verify unreachable at T7.
grep -rnE 'vdd_vision|/vdd:vision' --include='*.ts' --include='*.js' --include='*.json' \
    --include='*.md' --include='*.txt' --include='*.sh' --exclude-dir=test --exclude-dir=node_modules \
    --exclude=CHANGELOG.md --exclude='plan*.md' --exclude='vision-framework-*.md' \
    packages/vdd-engine/src packages/vdd-mcp/src packages/vdd-cli/src api scripts \
    SKILL.md references CONTRIBUTING.md
test $? -eq 1          # 1 = no match; 0 = a hit, 2 = broken path/read
# the G1 sweep cannot sit in an && chain: grep -c exits 1 on zero matches. quality-gates.md is T7's
# file and this is what proves Gate 1 left it — 4.3a asserts the token, not this.
test "$(grep -c 'G1' references/quality-gates.md)" = 0

# T8 — write 4.3b red (the count fixture), sweep the counts, then regenerate and commit only if the
# generator changed something, then prove idempotency. 4.3b covers the generated pages, so a no-op
# generator fails there; the diff guard only stops "nothing to commit" masquerading as the check.
pnpm --filter @simonmak-ascent/engine test count-parity     # red first, pasted into row 2.9
python3 scripts/gen-landing.py
if ! git diff --quiet -- index.html zh/index.html hk/index.html; then
  git add index.html zh/index.html hk/index.html \
    && git commit -m 'chore(docs): regenerate landing pages'
fi
python3 scripts/gen-landing.py && git diff --exit-code -- index.html zh/index.html hk/index.html
pnpm --filter @simonmak-ascent/engine test count-parity     # green
# the full-list grep is T8's, because T8 is the task that clears README.md, llms.txt and
# context7.json; T7's copy of this check is scoped to the files T7 edits (§5, T7)
grep -rnE 'vdd_vision|/vdd:vision' --include='*.ts' --include='*.js' --include='*.json' \
    --include='*.md' --include='*.txt' --include='*.sh' --exclude-dir=test --exclude-dir=node_modules \
    --exclude=CHANGELOG.md --exclude='plan*.md' --exclude='vision-framework-*.md' \
    packages/vdd-engine/src packages/vdd-mcp/src packages/vdd-cli/src api scripts README.md \
    SKILL.md llms.txt context7.json references CONTRIBUTING.md
test $? -eq 1

# T9 — plan gate. Rows 2.1–2.10 map in order to T0a, T0b, T1, T2, T3, T5, T6, T7, T8, T9, and each
# is added by its own task's commit as `done — <command and output>` (§7, row rule). T10
# (merge/deploy) is never a queue row and adds none: after 2.10 the list is complete, so
# --require-complete exits 0.
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete

# T10 — production probe: assert, never print (a 14/20 response must fail the command)
MCP=https://vdd.simonmak.com/api/mcp
test "$(curl -s $MCP -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq -r '.result.tools|length')" = 13
test "$(curl -s $MCP -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"prompts/list"}' | jq -r '.result.prompts|length')" = 19
test "$(npm view @simonmak-ascent/mcp version)" = "$(git describe --tags --exact-match HEAD | sed 's/^v//')"
```
## 6. Release vehicle and rollback

**Two releases, one removal each.** Production already serves 14 tools / 20 prompts while npm `latest`
is `1.9.5`, so the clone removal is owed to registry users independently of this change.

- **`1.10.0` — clone removal only, published first (T0a).** It is merged on `main` and sitting in
  `CHANGELOG.md:22-27` as `[Unreleased]`. Publishing it before T5 aligns npm with production and makes
  14/20 a real published baseline, so the 13/19 delta is measured against a version that exists. It
  must be cut from a commit that **still has** `vdd_vision`: a `v*` tag may point at any earlier SHA, so
  the tag itself is not the constraint — the constraint is that the release must precede the commit
  that removes the tool from `main`'s tip. Publishing without a version bump cannot stand in for it:
  `pnpm -r publish` refuses a version that already exists, which is why T0a bumps all seven files /
  eight values before it tags.
- **`1.11.0` — the vision removal.** The next minor after 1.10.0, so the number no longer skips one.
  Removing a tool and a prompt is still breaking on a minor; 2.0 remains reserved for the capability
  collapse (`docs/plan.md:145-167`), and the departure is paid for with the clone treatment plus one
  thing clone did not do — a migration pointer where an old user will actually see it:

  - a *new* `## [Unreleased]` → 1.11.0 `### Removed` naming `vdd_vision`, its prompt and its CLI
    subcommand, and stating 13 tools / 19 prompts;
  - `docs/migration-1.11.md`: author `vdd/vision.md` with the skill, keep the `> Impact Chain:` header,
    `vdd e2e` no longer takes a statement;
  - README row deleted, "Removed" note added;
  - **`npm deprecate` on the versions that still carry the tool — `1.9.5` and `1.10.0`** — with
    `'vdd_vision was removed in 1.11.0 — see docs/migration-1.11.md'`. Deprecating 1.11.0 itself would
    be wrong: the two old versions are where a user of the removed surface reads it.

If the operator prefers strict SemVer, the alternative is `2.0.0`; nothing else in the plan changes.
That choice is recorded rather than made silently.

**Version surfaces that must all agree at T9 (`1.11.0`)** (the first draft said "package.json ×4",
which is wrong): **seven files, eight values** —
`packages/vdd-{engine,cli,mcp}/package.json` (3), `api/_vdd-rpc.js:880` (`SERVER_VERSION`, 4),
`server.json:6` (5) and `:32` `packages[0].version` (6), `packages/vdd-mcp/src/server.ts:106` (7,
a bare literal no test compares) and `packages/vdd-cli/src/cli.ts:6` (8). The root `package.json`
carries no version. `api-surface.test.ts:183-190` pins **three** of the eight — the `vdd-mcp`
`package.json` version (`:184-185`), `SERVER_VERSION` and `server.json.version` (`:190`) — which is why
T0a's verify greps all eight rather than trusting that test.
The same eight are set to `1.10.0` at T0a.

**Forward path:** publish 1.10.0 first (T0a), then 1.11.0 at T9, and **re-apply the hand-patched global
install** after each (`AGENTS.md`, rsync of `packages/vdd-mcp/dist/` + `chmod +x …/stdio.js`); otherwise
`npx`/global runs the old surface and the local probe disagrees with production.

**Rollback:** revert the merge commit (restores the tool — emergency only, it restores the surface
this change exists to delete); `vercel rollback` to the previous deployment (temporary until the next
`main` deploy); `npm dist-tag add '@simonmak-ascent/mcp@1.10.0' latest` and
`npm deprecate '@simonmak-ascent/mcp@1.11.0' 'rolled back'`; restore `server.json:6,:32` and
`SERVER_VERSION`; re-apply the global install from the reverted dist. 1.10.0 is unaffected and stays
published — rollback returns to it, not to 1.9.5.

## 7. Tasks

| # | Task | Depends | verify (must be able to fail) |
|---|---|---|---|
| T0a | **Publish `1.10.0`** (clone removal, already on `main`): bump all seven files / eight version values (`packages/vdd-{engine,cli,mcp}/package.json`, `server.json:6,:32`, `api/_vdd-rpc.js:880`, `packages/vdd-mcp/src/server.ts:106`, `packages/vdd-cli/src/cli.ts:6`) to `1.10.0`; retitle `CHANGELOG.md:3` to `## [1.10.0] - <date>` and change the `(1.9.5)` parenthetical at `CHANGELOG.md:19-20` to `(1.10.0)`, content otherwise unchanged; add **only** `TASKS.md` row 2.1 as `done — <command and output>`, recording the eight-value check (the `npm view` line cannot be in it — see the row rule); commit, tag `v1.10.0`, publish | — | the §5 T0a block: all eight values read `1.10.0`, and `npm view` returns it (appended to row 2.1 by T9's commit). 1.9.5/1.9.0 today; `api-surface` alone is **not** the check — it pins three of the eight (`api-surface.test.ts:183-190`), so a half-bumped tree passes it |
| T0b | Re-derive every locator in §3 against the published tree; its only write is `TASKS.md` row 2.2 — `done` with the inventory output in it, **no** flip to `ready` | T0a | the §5 locator walk: exit 1 on the first `path:line` in §3 whose file is missing or whose line is empty; exit 0 only when all of them resolve. **Not** the frontier print — it exits 0 at T0b by construction (every row is already `done`) |
| T1 | Widen `pull_request.paths` (`.github/workflows/vdd-quality-gates.yml:5-7`) | T0b | the YAML assertion in §5 (fails today). **Scope note:** a `pull_request` run uses the *base* branch's workflow, so this cannot gate this PR; it gates future `packages/**` PRs and is observed post-merge by `gh run list`. This PR reaches `build-test` anyway because it edits `references/**`. |
| T2 | `vision-retired.test.ts` — committed behind `it.skip` with the red run in row 2.4 (§4: the review gate will not accept a deliberately failing suite) | T0b | non-zero on a count/behaviour assertion when run un-skipped, no `Failed to load`; T5 removes the skip |
| T3 | `retired-surface.test.ts` — committed behind `it.skip` with the red run in row 2.5 | T0b | non-zero on a count assertion when run un-skipped; CLI case asserts `/unknown command/i` |
| T5 | **One atomic commit**: engine + stdio + hosted + CLI (§3.1), **and remove the `it.skip` from the T2 and T3 fixtures** — neither parity fixture (4.3a, 4.3b) exists yet, so neither is part of this gate | T2, T3 | `pnpm -r build && pnpm check && pnpm test` green; T2 and T3 green |
| T6 | `docs-vision-parity.test.ts` (4.3a) **red**, then rewrite the four skill documents (§3.2 bullets 1–4) **plus the document-side `G1–G7` rewords** (`README.md:149`, `references/compliance-evidence.md:65` — both asserted — and `docs/architecture.md:28`, carried in the same commit) until green — one task, because the fixture is red until both halves are done and a red fixture committed before its implementation makes T5's full-suite verify unsatisfiable | T5 | `pnpm --filter @simonmak-ascent/engine test docs-vision-parity` green on headings, retired sections **and** the `G1–G7` token; the red run is pasted into row 2.7 |
| T7 | Retire the remaining references (§3.2 tail: `references/quality-gates.md` incl. the Gate 1 section, `INDEX.md`, `ai-agent-patterns.md`, `quick-reference.md`, `scripts/install.sh:39`) + the executable grep. **Not** the `G1–G7` rewrites — the code eight are T5's, the document three are T6's (§3.1) | T6 | the §5 T7 grep exits **1** over the files T7 edits (`test $? -eq 1`) and `test "$(grep -c 'G1' references/quality-gates.md)" = 0`; `README.md`, `llms.txt` and `context7.json` are deliberately outside it — T8 clears their hits |
| T8 | Count sweep (§3.3) — including the three published `package.json:4` descriptions (`packages/vdd-engine/package.json:4`, `packages/vdd-cli/package.json:4`, `packages/vdd-mcp/package.json:4`) — plus its own regeneration commit, and `count-parity.test.ts` (4.3b) written **red first** | T7 | `pnpm --filter @simonmak-ascent/engine test count-parity` green (it covers the generated pages); the §5 **full-list** grep — including `README.md`, `llms.txt`, `context7.json` — exits 1; landing idempotency clean **after** the guarded regeneration commit |
| T9 | Release `1.11.0`: versions, migration doc, a **new** CHANGELOG section, `TASKS.md` row 2.10 added by this commit as `done — <command and output>`, and the `npm view @simonmak-ascent/mcp version` line appended to row 2.1 (§7 row rule, sole exception) | T8 | `pnpm --filter @simonmak-ascent/engine test api-surface` (version triplet + parity); `plan-state.py --path TASKS.md --require-complete` exits 0 — 2.10 is the last row and every row is `done`/`applied` (`plan-state.py:51-55`) |
| T10 | Review, merge, deploy, probe | T9 | reviewer `REVIEW-VERDICT: ship` on unchanged bytes; `gh pr checks <pr>` — assert its **exit status**, which is non-zero if any check fails; §5 production probe → 13 / 19 / the released version / the tag |

T4 was folded into T6 and its identifier retired; the T-numbers after it are unchanged so §4 and the
round log still resolve. Queue rows are **2.1–2.10 mapping in order** to T0a, T0b, T1, T2, T3, T5, T6,
T7, T8, T9; **T10 is never a queue row**.

**Row rule — `TASKS.md` carries completed rows only.** Measured at the checker, not assumed:
`COMPLETE = ("done","applied")` and `ACTIONABLE = ("ready",)` at `~/.config/opencode/bin/plan-state.py:51-55`;
a row is **stale** when all of its numeric blockers are COMPLETE (`:157-163`) and any stale row makes
the run **exit 2** (`:220-227`); with `--require-complete` an ACTIONABLE row makes it **exit 1**
(`:230-235`); and `~/.config/opencode/plugins/_lib/gates/policies/plan.ts` always passes
`--require-complete` and refuses the command on any non-zero status. So a pending row is not free: a
`blocked by <completed row>` row refuses the very commit that creates it (exit 2, stale) and a `ready`
row refuses every later commit (exit 1). Therefore:

- the commit that delivers task 2.N adds **one** row — `2.N … done — <the command and output>` — and
  nothing else; no task pre-writes another task's row, and no row is ever written `ready` or
  `blocked by`. **One exception**: T9's commit appends the `npm view @simonmak-ascent/mcp version`
  line to row 2.1, because no commit can observe its own publish and row 2.1's eight-value check is
  all T0a can record at the time;
- a task with no code change (T0b) still commits its own row, so the file never depends on the next
  task to become valid;
- this is also what `TASKS.md:1-5` already says about itself: it "records what a commit delivers; it is
  **not** a backlog", and its four existing rows are all `done` (`TASKS.md:12-15`).

**T1 is outside the framework's boundary, by decision.** Widening `pull_request.paths`
(`.github/workflows/vdd-quality-gates.yml:5-7`) is a CI-coverage prerequisite, not part of the vision
removal: `AGENTS.md` records that a `packages/**` or `api/**` change never reaches `build-test` today,
so without it T5's and T9's bytes are merged from a workflow path that never ran them. Nothing in v16
§3–§6 authorises or forbids it; it is in this plan because a change that no CI job tests is not
verified, and it is recorded here as a decision rather than smuggled in as part of the removal.

**T5 is one atomic commit** across engine, stdio, hosted and CLI, because `api-surface.test.ts`
compares prompt text, tool descriptions and schemas between those three surfaces; T1, T8's
regeneration and T9's release metadata are separate commits. Each fixture is written red inside its
own task and greened inside the same task's work: T2 and T3 are red in their commits and green after
T5; 4.3a is red then green in T6; 4.3b is red then green in T8. The red output is pasted into that
task's own `done` row, so a red fixture exists in an intermediate commit but never at the released
head — the `pnpm -r build && pnpm check && pnpm test` at T5 and the PR head at T10 are the gates that
require it.

## 8. Definition of done

`pnpm -r build && pnpm check && pnpm test` green on the exact reviewed bytes; reviewer `ship` with no
edit afterwards; PR merged on green checks and the branch deleted; Vercel production serving `main`;
**1.10.0 published before the vision commit and 1.11.0 after it**; `pnpm verify:publish` passing and
`npm view` showing 1.11.0; the production probe returning 13 tools / 19 prompts and the tag matching;
`1.9.5` and `1.10.0` deprecated with the migration pointer. A green local suite is not a production
test.

## 9. Review response log

### Round-1

| Blocker | Resolution |
|---|---|
| Hosted G7 missing | §3.1 `_vdd-rpc.js:235-258` added, incl. threshold re-baseline; T2 asserts both surfaces |
| `e2e` statement guard | `engine.ts:1387` and `_vdd-rpc.js:764` deleted; hosted e2e behaviour stated explicitly |
| §4.4 grammar / `\z` / per-line parse | A3, with a mixed checked/unchecked fixture |
| T7 grep vacuous + missed surfaces | executable `grep -rnE …; test $? -eq 1` over an explicit list; README/`context7.json`/`SKILL.md:145-157`/`quality-gates.md:3,308,314` enumerated |
| `chainContext` overrides the certified framework | recorded as amendment A1 with its alternative; A2/A3 likewise — all three adopted by the operator on 2026-11-25 (§0), no approval gate remains |
| 91/6 fixture source; T2/T4 scoping; TASKS rows | `checksTotal` + G0-excluded gate count + both surfaces; parity allowlist; rows 2.1–2.10 |
| Release vehicle | §6: see the round-3 entry — split into 1.10.0 (clone) and 1.11.0 (vision), with `npm deprecate` on both tool-carrying versions |

Also applied from P1/P2/P6: T1's YAML verify and its honest scope; CLI probe asserts stderr; the plan
gate has rows to read; the landing idempotency check runs after its own commit; T9/T10 have commands
instead of prose; every version surface is named; rollback and the forward path both re-apply the
global install.


### Round-2 response

Round 2 confirmed blockers 1–5 and 7 closed and found one real hole plus four verify defects:

- **The declared tallies were never re-baselined.** `gateSummary` sums `tallyGate`'s *declared* totals
  (`engine.ts:1378`), so deleting F7.4/B7.3/B7.5 while leaving `6/5/4` reports 94/7 — the original
  symptom, on both surfaces. §3.1 now instructs `5, 3, 4` at `engine.ts:1349` and `_vdd-rpc.js:258`,
  and §4.1 asserts `checksTotal === 91` on the hosted e2e as well as the engine.
- **T9's plan gate was unsatisfiable** with a `ready` T10 or a stale `blocked by`. The queue was cut to
  end at the release row; `--require-complete` runs after the merge.
- **T10's probe printed instead of asserting** — `jq` with a `# 13` comment exits 0 on 14. It now uses
  `test "$(…)" = 13`.
- **Grep form:** `! grep` also swallows exit 2 (bad path); now `grep …; test $? -eq 1`.
- Surfaces added: `scripts/install.sh:39` (plus `--include='*.sh' scripts`), `meta.ts:93-96` (the e2e
  metadata, which contains no `vdd_vision` token so no test would catch it), `docs/plan.md:163-164`
  (C15/C15a become unsatisfiable at 91/13 and are re-baselined in the same commit).
- Corrections: A1's hosted locator (`:584`, no `chainContext` hosted), `gateResult.passed` instead of
  the non-existent `substancePassed`, T1's post-merge `gh run view … | grep -qx build-test`, release
  `1.10.0` (the next minor — **superseded in round 3 by the two-release split**, see below), and the
  one-commit claim narrowed to T5.

### Round-3 response and the adopted decisions

Round 3 closed all five closures and found two self-contradictions this plan had introduced: a
`2.10` queue row in a §5 comment, and `CHANGELOG.md`'s `[Unreleased]` "14 tools and 20 prompts"
exempted as "history". Both are fixed, plus a third `2.1–2.10` instance in this log the reviewer
missed. The operator then adopted three decisions, all reflected above:

1. **A1 corrected, not deleted.** `V-001` is the source's own *canonical* placeholder numbering
   (`engine.ts:956`), the same class as `SP-<n>`/`TK-<n>`; `chainContext` has eight call sites and is a
   local read. The defect was the sentence claiming the header "says the parent was not supplied",
   which it does not. Function unchanged; description fixed.
2. **A2 split by surface.** Required locally (the last enforcement that Phase 1 happened, the shape of
   `constitution.md` at gate 0) and excluded from the hosted `present === total`, because the only way a
   hosted user could satisfy it is by uploading the narrative — the egress v16 §4 forbids.
3. **Two releases.** 1.10.0 = the clone removal already on `main`, published before T5 so npm matches
   production (14/20) and the vision delta is measured from a version that exists; 1.11.0 = the vision
   removal, the next minor, with both tool-carrying versions deprecated at publish.

Rejected deliberately, and recorded as such: re-pointing G1 at §0–§6 to preserve the 108 headline
(it would restore the code catalogue v16 deletes — 91 with honest provenance beats 108 hollow), and
`2.0.0` now (it is reserved for the capability collapse, so it would force the collapse to 3.0.0).

### Round-4 (plan-agent) response

Each round-4 finding and where it landed:

1. **T0 split (blocker).** T0a publishes 1.10.0 with all seven version surfaces bumped and `TASKS.md`
   rows 2.1 `done` / 2.2–2.10 `blocked by 2.1`; T0b re-derives locators and flips 2.2 to `ready`. The
   publish verify fails today at 1.9.5 and on an unbumped tree. *(Superseded in round 5: the
   pending-row layout and the `ready` flip are gone — see the Round-5 entry, items 1–2.)*
2. **T4 folded into T6 (blocker).** T4 is gone; T6 writes the parity fixture red and makes the four
   skill documents green in one task. T5 depends on T2 and T3 only, and its note says the parity
   fixture does not exist yet.
3. **Row mapping (blocker).** 2.1–2.10 map in order to T0a, T0b, T1, T2, T3, T5, T6, T7, T8, T9; T10
   is never a queue row. §5's T9 block, the §7 table, both round-log rows and this entry agree, and no
   earlier nine-row range survives anywhere in the document.
4. **A2 targets the row, not the conjunct (high).** The hosted edit is deleting `_vdd-rpc.js:675`, the
   only edit that clears `uncovered`, `present` and `total`. Solicitation sites `:701`, `:731`,
   `:754`, `:864` and `meta.ts:42,43` also lose the file, and the hosted e2e template/write list
   (`:772,785,841`) is named because the grep token cannot see it.
5. **`engine.ts:722-752` struck from removal (high).** The report row, `visionId` and `fullChain` stay
   (deleting them makes `validate` demand the file and then not report it); `:752` is reworded to name
   `SKILL.md` phase 1, which §4.1 asserts.
6. **Stale gate numbering (medium).** The seven "G1–G7" strings are named, plus the comment at
   `engine.ts:1377` as the **eighth**; all become "G2–G7", and §4.3a forbids `G1–G7`/`G1-G7` in
   live-surface files. Parity compares equal-to-equal and T3 asserts only keys and prompt tokens, so
   no test catches them today.
7. **CHANGELOG heading (medium).** `:22-27`'s content is unchanged, but `:3` is retitled
   `## [1.10.0] - <date>` at T0a; 1.11.0 then opens a new `## [Unreleased]`.
8. **Publish ordering (medium).** §6 now says a `v*` tag may point at any earlier SHA, so the
   constraint is that the release precedes the commit that removes the tool from `main`'s tip.
9. **§4.2 addition (medium).** No hosted delegation envelope, `needsInput` output, tool description,
   init template set or e2e scaffold may contain `vdd/vision.md`; a global grep cannot express it,
   because the skill documents legitimately instruct the agent to author that file.
10. **Verify hygiene (low).** The `wc -l` grep is labelled an inventory; T8's commit is guarded by
    `git diff --quiet`; T7's G1 check is `test "$(grep -c …)" = 0`; T10's `gh pr checks` is asserted by
    exit status; the engine's `allPaths` and the hosted `keys` are distinguished, and both `gate1`
    call sites (`engine.ts:1415`, `:1492`) are named.
11. **Dead clause.** "clone removal is still `[Unreleased]` and rides with it" is deleted from the
    round-2 bullet; the superseded-in-round-3 annotation stays.
12. **This section.** The earlier `2.10` queue row and `[Unreleased]` "history" contradictions remain
    fixed, and no round-4 edit reintroduced either.

### Round-5 (reviewer) response

The checker was read at source for this round, so the two plan-gate findings are stated as measured
behaviour rather than as a warning: `COMPLETE = ("done","applied")` and `ACTIONABLE = ("ready",)` at
`~/.config/opencode/bin/plan-state.py:51-55`; stale = every numeric blocker COMPLETE at `:157-163`,
exit 2 at `:220-227`, exit 1 for an ACTIONABLE row under `--require-complete` at `:230-235`; and
`plugins/_lib/gates/policies/plan.ts` always passes `--require-complete` and refuses on non-zero.

1. **Pending-row layout removed (blocker, F3).** T0a no longer writes `2.2–2.10 blocked by 2.1`; with
   2.1 `done` those rows are stale and exit 2 refuses the commit that creates them. §7 now states one
   rule — `TASKS.md` holds completed rows only, one per task, added by that task's own commit — and
   every task row follows it.
2. **`ready` flip deleted (blocker, F4).** T0b no longer sets 2.2 to `ready` (exit 1, refusing every
   later commit). Its only write is row 2.2 as `done`; the verify is the locator walk plus the
   inventory. *(Superseded in round 6: the walk is the control and the frontier print is not — it
   exits 0 at T0b by construction.)*
3. **Parity fixture split (blocker, F1).** `docs-vision-parity.test.ts` (4.3a) keeps headings,
   retired-section absence and the no-`G1–G7` assertion and is T6's green; the counts moved to the new
   `count-parity.test.ts` (4.3b), T8's verify. §4 intro, §4.3a/b, and the T6/T8 task rows follow.
4. **T7's grep could not exit 1 (blocker, F2).** `README.md`, `llms.txt` and `context7.json` are out of
   T7's target list — their hits (`README.md:72,160,260,270`, `llms.txt:17`, `context7.json:13`) are
   T8's edits — and the full-list grep is T8's verify. T7's verify now names only files T7 writes.
5. **T0a's verify passed on a half-bumped tree (medium, F5).** Replaced by the all-surfaces block in
   §5: three `package.json` versions, `server.json` `.version` **and** `.packages[0].version`,
   `SERVER_VERSION`, `server.ts:106`, `cli.ts:6`, then `npm view`. `api-surface.test.ts:183-190` pins
   two of the eight values. *(Round 6 measured **three**: `183-190` pins the `vdd-mcp` package version,
   `SERVER_VERSION` and `server.json.version` — see §6.)*
6. **Three more `G1–G7` sites (medium, F6).** `README.md:149`, `references/compliance-evidence.md:65`
   and `docs/architecture.md:28` joined §3.1's reword list. The first two are **T6's**, because §4.3a
   asserts the token over live-surface and would otherwise be red at T6 for a reason T6 did not
   cause; the third is reworded in the same commit and named as an exclusion in §4.3a with its reason
   (`docs/architecture.md:3`, "Status: **proposed**"). Live-surface is defined once, in §4.3a, as
   §3.3's allowlist plus `references/*.md`.
7. **§0 approved (medium, F7).** Retitled "(adopted by the operator, 2026-11-25)"; the "if any is
   rejected" condition is deleted, so T5 carries no approval gate and §0 stops contradicting §9.
8. **Counts corrected (low, F8).** A1's "seven call sites" → **eight** (`engine.ts:151,235,353,406,
   486,559,801,1529`, measured by grep, plus the definition at `:957`); `engine.ts:1377` is the
   **eighth** `G1–G7` site, not the seventh; the round-4 entry said "six" for a set of seven and now
   says seven. Eleven sites in total, two owners.
9. **1.9.5 inside the 1.10.0 notes (low, F9).** `CHANGELOG.md:19-20`'s parenthetical becomes
   `(1.10.0)` in T0a's commit, so the retitled section does not record the superseded version; the
   rest of `:5-27` is unchanged.
10. **T1's boundary (low, F10).** §7 records it as a decision: widening CI `paths` is a CI-coverage
    prerequisite outside v16 §3–§6, present because otherwise no job tests T5's bytes.
11. **The 91 assertion was brittle (low, F11).** §4.1 now states the precondition (every gate reaches
    `tallyGate`) and asserts the per-gate totals `{G2:13, G3:18, G4:17, G5:16, G6:15, G7:12}` beside
    the sum, because `makeGateFail` reports `0/0/0` (`engine.ts:1352-1355`; hosted `_vdd-rpc.js:86`).
12. **The message naming the skill had no observable (low, F12).** `engine.ts:759-771` returns no
    message field; the reworded `:752` sentence lives on the `## Decision` line of
    `vdd/impact-report.generated.md` (`:756-757`), so the fixture reads that file and asserts
    `/skill/i`.
13. **This section.** One line per finding; the two places where a finding forced a second decision
    (F1+F6 give the document `G1–G7` sites to T6; F4 makes T0b commit its own row) carry their reason
    in the bullet rather than deferring it. One addition beyond the findings, recorded as such: §3.2
    now names the Gate `G1` prose inside the files T6 and T7 already rewrite
    (`artifact-templates.md:171`, `prompt-patterns.md:194-217,780-782`,
    `workflow-phases.md:122-123,399`) — the `G1–G7` token check cannot see it, because it says `G1` —
    and leaves `anti-patterns.md`/`traceability-matrix.md` flagged below rather than silently owned.

**Surfaced, not acted on** — outside round 5's scope and recorded so it is not rediscovered: Gate `G1`
as prose survives the token sweep in `references/anti-patterns.md:62,146,359` and
`references/traceability-matrix.md:77-80` — two files §3.2 names nowhere. Those read `G1`, not
`G1–G7`, so no fixture sees them. The same prose inside T6's and T7's own files is now named as
locators (§3.2: `artifact-templates.md:171`, `prompt-patterns.md:194-217,780-782`,
`workflow-phases.md:122-123,399`, `quick-reference.md:40-46`). If the two unowned files are left,
they will describe a gate the code no longer runs; that is stated as a gap, not covered by a test.

### Round-6 (reviewer) response

1. **A — two `api/` tokens owned by no task (blocker).** `_vdd-rpc.js:862` (the `init` description,
   "run this first, before vdd_vision") and `:1513` (the curl example naming `"vdd_vision"`, one line
   past the old docs range) are now named in §3.1's hosted bullet, so T5 owns them and T7's
   `test $? -eq 1` over `api` is reachable. Both lines were re-read for this round; the docs range is
   `:1303-1513`, with the example heading at `:1510` and its body at `:1511-1513`.
2. **B — T0b's verify could not fail (blocker).** The frontier print exits 0 whenever no row is
   invalid or stale (`plan-state.py:229` prints PASS on that condition; `awaiting you`, `yours` and
   `blocked by <incomplete>` also exit 0), which at T0b is true by construction. §5 now runs a
   **locator walk** instead: every `path:line` in §3 must resolve to an existing file with a non-empty
   line, and the first failure exits 1. The inventory grep is labelled narration only.
3. **C — the count fixture guarded three of six counts (blocker).** 4.3b is now two assertions:
   **presence** over a named count-bearing subset, each file with the phrasing it uses today, and
   **absence** over the whole §3.3 allowlist with `7 gates`, `7 Gates` and `7 quality gates` added.
   `docs/social-preview.svg:15` joined §3.3; `README.md:112,361,399` are the sites the three new
   tokens catch, and `count-parity` now fails if they survive.
4. **L1.** "two of the eight" → **three** (`api-surface.test.ts:183-190`: the `vdd-mcp` package
   version, `SERVER_VERSION`, `server.json.version`), corrected in §5, §6, the T0a row, and annotated
   in the round-5 entry rather than rewriting it.
5. **L2.** `docs/plan-best-in-class.md:38` joined the `G1–G7` measurement's exclusion sentence — it is
   a record outside live-surface and already excluded by name in 4.3b.
6. **L3.** §4.1 no longer says e2e "passes a statement": the fixture calls `PHASES.e2e` with a legacy
   `statement` to prove it is ignored, which matches §3.1's deletion of the guard at `engine.ts:1387`.
7. **L4.** Row 2.1 records the eight-value check; the `npm view` line is appended to row 2.1 by T9's
   commit, and the §7 row rule names that as its single exception to "one row, nothing else".
8. **L5.** §2 states the direction explicitly: `totalGates = gates.length` (`engine.ts:1371`) is **8**
   (G0–G7) and is never the headline; `checksTotal` skips G0 (`:1378`), so the canonical count is
   **7** today and 6 after.
9. **L6.** §4 states that T2 and T3 commit their fixtures behind `it.skip` (the review gate will not
   take a deliberately failing suite as its passing run) and T5 un-skips them.

**Measured while applying C, recorded so they are not rediscovered.** The `7 gates` absence token also
hits `references/artifact-templates.md:841`, `prompt-patterns.md:791` and `workflow-phases.md:363`;
§3.2 now names all three, and all three are T6's files, so the assertion has an owner rather than
being red at T8 for a reason T8 did not cause. The **three** published package descriptions —
`packages/vdd-mcp/package.json:4`, `packages/vdd-engine/package.json:4` and
`packages/vdd-cli/package.json:4` — are not a class of their own: they are the same
registry-metadata surface as `glama.json:5` and `server.json:5`, and both `docs/plan.md:163` (C15a)
and `TASKS.md:1.3` swept them. Round 7 therefore lists them in §3.3, asserts them **by phrasing** in
§4.3b (a token cannot — see there) and gives them to T8. Round 6's reading was wrong on two counts:
there were three files, not two, and it implied no fixture could see them when §4.3b now does. Also
**measured this round**, not carried: `~/.config/opencode/bin/plan-state.py:229` was re-read and is
the PASS line, so T0b's exit-code statement rests on the source rather than on the previous review.

### Round-7 (reviewer) response

1. **The three published descriptions are now listed, asserted and owned.**
   `packages/vdd-engine/package.json:4`, `packages/vdd-cli/package.json:4` and
   `packages/vdd-mcp/package.json:4` joined §3.3's allowlist; §4.3b asserts each **by file and
   phrasing** (`16 phase functions`, `15 subcommands`, `13 tools`), with the reason a shared token
   cannot; T8's cell names all three.
2. **Two absence tokens added.** `17 phase` and `16 subcommand` join §4.3b's forbidden set, so §1's
   "16 phases · 15 CLI subcommands" is verified and `SKILL.md:248,250` / `README.md:412,414` cannot
   ship stale.
3. **`txt` added to §5's locator walk.** `llms.txt:3,14,17,21,26,29,31` was silently skipped; the
   extension class now reads `(?:ts|js|json|md|sh|yml|svg|py|txt)`.
4. **Round 6's gap note corrected.** Three description files, not two; registry metadata, not a class
   no fixture can see; and `plan-state.py:229` is measured this round rather than carried.
