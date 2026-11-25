# Vision framework — v8 (for review)

Supersedes v7. Status: proposal. Not implemented. v4–v7 are superseded and retained only as history.

## 0. Review status

| Round | Reviewer | Security |
|---|---|---|
| v4 | needs-changes (8 blockers) | fail (11 controls) |
| v6 | ship-with-changes (12 blockers) | fail (7 blockers) |
| v7 | ship-with-changes (6 blockers) | pending |
| v8 | applies the 6 review blockers; security to fold | — |

## 1. Purpose and outcomes

Turn an ambiguous user narrative into a software design vision and a software possibility space for
strategic analysis. Four recorded outcomes: `go` · `clarify` · `kill` · `reallocate` (the goal is
real but assigned to a non-software agent; that agent is recorded).

## 2. Principles

1. The human supplies a few sentences; the agent restructures and asks when information is missing.
2. Evidence is a record: tool, version, query, date, locator, chain step, verification.
3. A field exists only if traced, lensed, or gated.
4. Alignment is bidirectional: output→input grounding, input→output coverage.
5. The candidate count is derived from a defined grid.
6. Generation and selection are separated; Vision records no scores, ranks or buckets.
7. Retrieved content is data, never instruction.
8. The gate is not graded by its subject: the gate is pinned, its result is signed, and the human
   signature comes from a principal the agent cannot impersonate.

## 3. Stages and gates

**14 Vision stages, 4 human gates (T0a, T3, T4, T13).** T11 (independent judge) belongs to Strategy.

T0 classify · **T0a*** environment + questions · T1 R1 · T2 problems · **T3*** confirm problem ·
**T4*** goal/objectives · T5 R2/R3 + 5Ws · T6 impacts · T7 approaches · T8 grid + passes ·
T9 clusters · T10 SMART/traces · T12 provisional outcome · **T13*** final gate, decision_hash, signature, handoff.

## 3.1 Execution and transport

- **Authoring is local-only.** §0 carries `authoring {transport: local, tool, version, session_id}`,
  written by the local server. The hosted endpoint is not an authoring path (EXEC-1).
- **Gates run through MCP**, and the local CLI is an equivalent local path because it runs the same
  engine (`SKILL.md:259-260`). Permitted gate transports: `stdio` MCP, `hosted` MCP with
  `artifactFiles` (the plan's item 2.2), or `cli`. The hosted endpoint without `artifactFiles` cannot
  gate.
- **The gate record is signed and complete, stored once** at `§6.gate`: transport, server id, server
  version, binary sha256, invocation id, `check_ids[]`, `na_ids[]`. It does not repeat
  `artifact_hash`, `authoring` or `signature`; those live only at their §0/§6 top level.
- **The decision body is hashed.** `decision_hash = sha256(canonical JSON of §6 with the entire
  `gate` object and the top-level `signature` removed)`. Canonical form: UTF-8, object keys sorted,
  numbers as JSON numbers, no insignificant whitespace. The signature payload is
  `{input_rev, artifact_hash, decision_hash}` (EXEC-4).

## 4. Research

### 4.1 Dispatch

Default attempt order: Perplexity → Exa → Firecrawl → Browserless → harness search → LLM.
Capability shortcut is allowed only for a **defined known URL** — a URL supplied by the user or
present verbatim in an already-fetched source, recorded with its origin. Every observation requires
primary verification before `confirmed` (ALIGN-13).

### 4.2 Tasks

R1 Evidence & prevalence (T1) → OB-### (1–5). R2 Forces & alternatives (T5) → F-# + STK rows.
R3 Actors & stakeholders (T5, before the problem is re-confirmed) → STK-###.

### 4.3 Evidence and egress rules

- **Triangulation:** each OB needs ≥2 independent sources, or `single_source: true` + limitation.
  `go` needs ≥1 triangulated observation.
- **Recency:** `max_age_days` per domain; older observations flagged `stale`.
- **Appraisal:** `{bias, directness, precision}`, `source_type`, `coi` per observation.
- **Scope:** `search_scope` (languages, date window, access limits).
- **Quarantine:** retrieved text lands only in `evidence_quote` + `source_id` + locator. The research
  path may not write `confirmed_by`, `locator_verified`, the resolver record, `tier`, `strength`,
  `decision`, `decision_hash`, `gate` or `signature` (ALIGN-15).
- **Sensitivity and egress (D2, decided):** `sensitivity ∈ {public, internal, confidential, personal,
  unclassified}`; the default is `unclassified`. `unclassified`, `confidential` and `personal`
  default to `research_mode: local-only` — steps 1–4 structurally unavailable. Egress requires a
  signed human opt-up at T0a, recorded with the classification basis. The broker **refuses**
  pre-flight and logs the refusal; it does not merely record bytes.
- **URL safety:** https only, no userinfo, no IP literals; resolve and reject private/loopback/
  link-local/ULA/metadata on **every** hop; redirect cap; the fetcher must return the resolved
  redirect chain (ALIGN-17).
- **Attempt floor:** to use step *n*, every step below *n* has a wrapper-recorded attempt (or an
  operator waiver). Step 6 requires attempts at 1–5 (ENV-6).
- **LLM:** step 6 carries no locator, requires operator-signed `allowLlm`, a recorded limitation, and
  a signed human confirmation for `go`.
- **Per-source provenance:** `tool_version`, `endpoint`, `credential_id`, `retention_terms` per
  attempt.
- **Tiers:** EV1 primary source verified · EV2 prototype/field observation · EV3 named estimate with
  method and reference class. Assigned by the gate from the provenance record, never by the tool.

## 5. Artifact

`artifact_hash = sha256(canonical JSON of §0–§5)`; `log_hash` for the research log.

### §0 Input (T)
verbatim · hash · owner · classification · preset · `authoring{transport: local, tool, version, session_id}` ·
`research_mode: egress|local-only` · `sensitivity` + basis · `input_rev` ·
derived_objective + survival test · claim ledger · questions (≤5) ·
`evidence_step {R1,R2,R3}` · `grid {axes, cells}` · `fan_out`.

### §1 Observations (1–5) (T)
OB-### · text · `evidence_quote` · source (research|harness|llm) · tool · tool_version · endpoint ·
credential_id · retention_terms · query · locator · `locator_verified` + resolver record
(status, final URL, body sha256, span) · date · source_type · coi · strength · single_source ·
stale · **attempt_id** · `confirmed_by` (signed event id). The per-source fields
(tool_version, endpoint, credential_id, retention_terms) are consumed by ENV-7.

### §2 Problems (1–5) (T)
PR-### · text · observations[] · baseline or plan · unit · hypothesis.

### §3 Vision, goal, objectives (T)
statement · horizon · GOAL · objectives[]: OBJ-### · parent_goal · metric · baseline → target ·
horizon · software_role · **allocated_agent** + `reallocate_rationale` (required when outcome =
reallocate).

### §4 5Ws
- 4.0 Principles P-# (3–7, testable, `boundary_kind: always|ask|never`) — consumed by CONS-4
- 4.1a Forces F-# (industry-level, bearing)
- 4.1b **Actors, enumerated actor-first** (affected · decides · blocks · pays · supplies), each
  optionally **tagged** with a force. The five forces are a lens, **not** a completeness rule.
  Fields: type · interest · influence · stance · salience P/L/U · engagement · material · source.
  **No software components, no domain data objects.**
- 4.2 Where LOC-### (location, problems[], surface) · 4.3 When T-### (window, problems[], driver_date) ·
  4.4 envelope in/out/never (each entry carries `owner_stage` — consumed by CONS-12) · constraints[] · domains[]
- 4.5 I-### (objective · actor→STK · measurement) · 4.6 H-### (impacts · rationale · evidence)

### §5 Software possibility space (T)
C-### · capability · PR · OBJ · I[] · LOC · T · STK · H · M (metric · baseline/plan · target ·
method) · EV tier + locator + evidence + effort (consumed by STRAT-7) · R[] · horizon · cluster · derives_from[] ·
lenses[] (`lens_hash` = sha256 of the capability text before/after application, consumed by CONS-18) · `structural_exclusion` (duplicate | out_of_envelope | not_software +
reason). **No confidence field, no scores, no ranks, no buckets.**

### §6 Decision (T)
owner · date · outcome (go|clarify|kill|reallocate) · criteria · review date · evidence ids ·
`artifact_hash` · `log_hash` · `decision_hash` · `gate{transport, server_id, server_version,
binary_sha256, invocation_id, check_ids[], na_ids[]}` · `signature` (external principal: SSO/OIDC
event or a key not in the agent's config). `authoring` lives only in §0; `artifact_hash` only here.

### Companions
`vision-research.json` (attempts with per-tool provenance, step_used 1–6|null, failure_reason,
result_ref, log_hash) · `vision-egress.json` (broker refusals/allows, bytes hash, classification
basis).

## 6. Applicability

| Outcome | Required | N/A |
|---|---|---|
| go | §0–§6 | — |
| clarify | §0, §1, §2, §6 | §5 |
| kill | §0, §2 (if derived), §6 | §3–§5; ADDR-1, VIS-10..25, CONS-2..12 |
| reallocate | §0, §2, §3 (incl. allocated_agent), §4.1b, §6 | §5; ADDR-3..4, VIS-21..25 |

## 7. Checks

Each row: predicate (fails when) · stage · enforcer. Every check ships a known-bad fixture. The
Consumption and Alignment tables carry stage and enforcer per row.

**Environment/research**
| id | Predicate | Stage | By |
|---|---|---|---|
| ENV-1 | environment not run / no per-phase chain report | T0a | code |
| ENV-2 | attempts[] or step_used missing; null without failure_reason | T1/T5 | code |
| ENV-3 | step 6 without signed allowLlm + limitation + confirmation | T12 | code+human |
| ENV-4 | §0 evidence_step ≠ log step_used ≠ §6 | T13 | code |
| ENV-5 | meta TOOL_KEYS/REQUIREMENTS/detectEnvironment ≠ chain | CI | code |
| ENV-6 | step n used without a wrapper attempt at each step < n (or waiver) | T1/T5 | code |
| EXEC-1 | `authoring.transport ≠ local`, or block absent | T13 | code |
| EXEC-2 | gate transport ∉ {stdio, hosted+artifactFiles, cli} | T12 | code |
| EXEC-3 | gate block absent, signature invalid, or check_ids ∪ na_ids ≠ applicable set | T12 | code |
| EXEC-4 | `decision_hash` absent or mismatched | T12/T13 | code |

**Vision structure**
| id | Predicate | Stage |
|---|---|---|
| VIS-1 | verbatim/hash/version/owner/classification/preset/input_rev missing | T0 |
| VIS-2 | claim without disposition; drop without confirmation | T0 |
| VIS-3 | >5 questions, no default, or no answer/hypothesis | T0a |
| VIS-4 | observations outside 1–5; missing source/tool/query/date; source=agent | T1 |
| VIS-5 | OB with <2 sources and no single_source+limitation | T1 |
| VIS-6 | OB older than max_age_days and not stale | T1 |
| VIS-7 | source_type/coi missing | T1 |
| VIS-8 | problems outside 1–5; PR cites no OB | T2 |
| VIS-9 | % claim without number; no baseline and no plan and no hypothesis | T2 |
| VIS-10 | statement/horizon/software_role missing; tech/solution names | T4 |
| VIS-11 | objectives outside preset; parent_goal missing; field missing | T4 |
| VIS-12 | principles outside 3–7; not testable | T5 |
| VIS-13 | actor type outside enum; a component/data object named; row unsourced | T5 |
| VIS-14 | actor missing interest/influence/stance/salience/engagement | T5 |
| VIS-15 | **actor-first enumeration incomplete** (affected/decides/blocks/pays/supplies not all addressed) | T5 |
| VIS-16 | problem without a location; location without surface | T5 |
| VIS-17 | problem without timing; timing outside horizon | T5 |
| VIS-18 | envelope empty; tech in envelope; constraints[] missing | T5 |
| VIS-19 | GOAL missing; <2 impact actors; I.actor not a STK; I without measurement | T6 |
| VIS-20 | approaches outside 2–4; approach without impact | T7 |
| VIS-21 | grid undefined/incomplete without excused cells | T8 |
| VIS-22 | candidate count ≠ clusters × fan_out, or outside preset; duplicate signature | T10 |
| VIS-23 | candidate missing PR/OBJ/I/LOC/T/STK/H, M, EV, R, horizon | T10 |
| VIS-24 | tech, non-software intervention, or compound capability | T10 |
| VIS-25 | score/rank/bucket; exclusion outside the three reasons | T10 |
| VIS-26 | domain not consumed by a primer; non-goal not inherited | T13 |
| VIS-27 | artifact_hash/log_hash missing or mismatched | T13 |

**Addressability**
| id | Predicate | Stage |
|---|---|---|
| ADDR-1 | software_role does not name information/coordination/automation/access | T4 |
| ADDR-2 | input not addressable and no kill/reallocate with decomposition attempt | T12 |
| ADDR-3 | candidate is not a software capability | T10 |
| ADDR-4 | a preference appears in §5 | T10 |
| ADDR-5 | statement does not name software's role | T4 |
| ADDR-6 | reallocate does not name a non-software agent + rationale | T12 |

**Consumption** (each fails when the named field has no inbound reference)
| id | Predicate | Stage | By |
|---|---|---|---|
| CONS-1 | OB → ≥1 PR | T13 | code |
| CONS-2 | PR → ≥1 OBJ, LOC, T, C | T2 (re-checked T13) | code |
| CONS-3 | OBJ → ≥1 I, ≥2 C, parent_goal exists | T4 | code |
| CONS-4 | P → ≥1 C and `boundary_kind` present | T5 | code |
| CONS-5 | F → ≥1 actor tag or not-material reason | T5 | code |
| CONS-6 | STK → ≥1 I/C or no-action reason | T5 | code |
| CONS-7 | LOC/T → ≥1 C; every C has both | T10 | code |
| CONS-8 | I → ≥1 C; I.objective resolves | T6 | code |
| CONS-9 | H → ≥1 C | T7 | code |
| CONS-10 | C → offered to Strategy or excluded with reason | T10 | code |
| CONS-11 | domain → primer | T13 | code |
| CONS-12 | each envelope entry → `owner_stage` recorded | T5 | code |
| CONS-13 | field with no role/consumer; N/A not reported | T13 | code |
| CONS-14 | Strategy lacks the research-log reference | Strategy | code |
| CONS-15 | an attempt is not used/failed/rejected with reason | T13 | code |
| CONS-16 | Strategy entered without a signed decision for the current hash | Strategy | code |
| CONS-17 | a research/harness OB has no `attempt_id` resolving to an attempt | T13 | code |
| CONS-18 | a lens lacks `lens_hash` before/after | T10 | code |
| CONS-19 | per-source provenance missing (tool_version/endpoint/credential/retention) | T13 | code |

**Alignment**
| id | Predicate | Stage | By |
|---|---|---|---|
| ALIGN-1 | input hash changed since derivation | any | code |
| ALIGN-2 | ledger incomplete | T0 | code |
| ALIGN-3 | rejected/out-of-scope claim lacks confirmation | T0 | human |
| ALIGN-4 | OB/PR/OBJ/I/C lacks derives_from resolving to input/evidence | T13 | code |
| ALIGN-5 | a field contradicts never/constraints | T13 | code |
| ALIGN-6 | objective cannot complete the so-that chain | T4 | judge |
| ALIGN-7 | ban-the-input answer not recorded | T4 | human |
| ALIGN-8 | a new noun is neither derived from confirmed evidence nor confirmed | T13 | code+human |
| ALIGN-9 | input revision has no re-derivation report | any | code |
| ALIGN-10 | a gate signature is not bound to input_rev + artifact_hash + decision_hash | T13 | code |
| ALIGN-11 | questions/answers not bound to input_rev | T0a | code |
| ALIGN-12 | research log not hash-pinned | T13 | code |
| ALIGN-13 | EV1/EV2 lacks a resolver record or span containment | T1 | code |
| ALIGN-14 | an EV3/llm observation carries a locator | T1 | code |
| ALIGN-15 | the research path wrote a write-once field | any | code |
| ALIGN-16 | an outbound call bypassed the broker, or local-only not enforced | any | code |
| ALIGN-17 | fetch URL unsafe or redirect chain not returned | any | code |
| ALIGN-18 | judge family = generator, or model/prompt not recorded | Strategy | code |
| ALIGN-19 | a decision is overwritten; kill/reallocate not signed | any | code |
| ALIGN-20 | human agreement not reported when >1 reviewer | T13 | human |
| ALIGN-21 | human gate did not display evidence_quote | T13 | human |
| ALIGN-22 | sensitivity reclassification lacks a signed event | any | code |

**Strategy (not Vision)**
STRAT-1 one disposition per candidate · STRAT-2 buckets cite OBJ+H, 2–4 · STRAT-3 cluster
arithmetic · STRAT-4 reasons/triggers · STRAT-5 hashes match · STRAT-6 full table reachable ·
STRAT-7 selection criteria recorded · STRAT-8 judge agreement + order swap.

**Parity**
MATRIX-1 each outcome's Required ∪ N/A = the catalogue, disjoint (partition test) ·
PARITY-1 `artifact-templates`/`prompt-patterns`/`workflow-phases` field lists = this document ·
PARITY-2 `meta.ts` TOOL_KEYS/REQUIREMENTS/detectEnvironment = §4 · PARITY-3 `api/_vdd-rpc.js` and
`SKILL.md` carry the same field list (or are generated from the registry).

## 8. Handoff

Artifact, research log (with `step_used`, attempts, per-tool provenance), egress log, structural
exclusions, claim ledger, questions/hypotheses, gate record, signed decision and hashes. **No
scores, ranks or buckets.** Strategy runs the judge, selects, buckets.

## 9. Presets

| Preset | Problems | Objectives | Clusters | Candidates |
|---|---|---|---|---|
| Product | 1–5 | 3–5 | 12–20 | clusters × fan_out 1–4, cap 80 |
| Feature | 1–3 | 2–3 | 6–10 | clusters × fan_out 1–2 |
| Lean | 1 | 1 | 3–5 | clusters × 1 |

`grid = problems × material actors × approaches`; `fan_out` recorded in §0; floor = grid
completeness; waivers recorded with reasons.

## 10. Decisions

D1 **Decided (v7):** the human signature is an external principal — an SSO/OIDC-signed event or a key
not present in the agent's config. A plain git commit SHA is **not** sufficient.
D2 **Decided (v7):** fail-closed. Unclassified/confidential/personal ⇒ local-only research; egress
requires a signed opt-up.
D3 **Decided:** actor-first + force tags; the five forces are a lens, not a completeness rule.
D4 **Decided:** `reallocate` is a third outcome, with the agent recorded and checked (ADDR-6).
D5 **Open:** stop rule — 3 consecutive zero-new passes (pragmatic) vs 10+3 (published precedent).
D6 **Open:** chain — fixed default order + capability shortcuts + primary verification.
D7 **Open:** EV1–EV3 rubric vs TRL mapping.

## 11. Acceptance

Good fixture passes; every check has a known-bad fixture; all four outcomes produce the applicability
matrix; a sensitive or unclassified narrative cannot reach steps 1–4 without a signed opt-up; a
poisoned page leaves `confirmed`, `tier` and the decision unchanged; an OB without `attempt_id` fails;
a gate without a signed block or with a partial check set fails; editing `outcome` after signing
fails `decision_hash`; a hosted-authored artifact fails EXEC-1; a gate run through the CLI passes
EXEC-2; a gate run at T12 cannot satisfy EXEC-3 (it runs at T13); MATRIX-1 fails if any check is
in both Required and N/A.
