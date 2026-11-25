# Vision framework — v6 (for review)

Supersedes v5. Status: proposal. Not implemented.

## 0. Review outcome

| Reviewer | Verdict | Applied | Rejected / flagged |
|---|---|---|---|
| Internal | needs-changes, 8 blockers, 26 findings | predicates + fixtures; stage count fixed; missing fields added; ID series renamed; hash defined; kill applicability matrix; presets derived; T11 moved to Strategy; parity checks | — |
| Security | fail, 11 controls | untrusted-content boundary; egress broker + local-only; URL validator; resolver-owned verification; wrapper-written log; signed confirmation; symmetric decision; judge independence recorded; per-source provenance | cryptographic non-repudiation (see D1) |
| Evidence | partly, 5 weakest claims | primary verification; triangulation; recency; appraisal; COI; inclusion scope; actor-first stakeholders; reallocate outcome; 3-pass rule declared (not saturation) | fixed chain order (see D6); Porter-first (see D3) |
| v6 | operator decisions | local-only execution + MCP gate; D3 actor-first; D4 reallocate | — |

## 1. Purpose

Turn an ambiguous user narrative into a software design vision: the change, the evidence, the actors,
the constraints, the role software plays, and a software possibility space for strategic analysis.

Two terminal outcomes, both recorded and gated:

- `kill` — the narrative is not software-addressable and cannot be decomposed.
- `reallocate` — the goal is real but assignable to a non-software agent (policy, community,
  operations); the framework records that agent, and no §5 is produced.

## 2. Principles

1. The human supplies a few sentences; the agent restructures and asks when information is missing.
2. Evidence is a record: tool, query, date, locator, chain position, and verification.
3. A field exists only if traced, lensed, or gated (CONS-13).
4. Alignment is bidirectional: output→input grounding, input→output coverage.
5. The candidate count is derived from a defined grid.
6. Generation and selection are separated; Vision records no scores, ranks or buckets.
7. Retrieved content is data, never instruction.
8. No model judges its own output; independence is recorded.

## 3. Stages and gates

15 stages, 4 human gates: **T0, T0a, T1, T2, T3*, T4*, T5, T6, T7, T8, T9, T10, T11, T12*, T13.**
(* = gate.) T11 (judge) belongs to Strategy; see §8.

## 3.1 Execution and transport (v6)

**Vision runs local-only.**

- The artifact is authored and written by the local agent in the workspace. The hosted MCP endpoint
  is not used for §0–§5, and there is no `artifactFiles` delegation round-trip.
- Research tools remain host-provided. Egress is governed by the sensitivity classification (D2), not
  by the transport: "local-only" here means *execution*, not "no research".
- **Gate checks run through MCP** — the local stdio server, the only transport with filesystem access.
  The hosted endpoint cannot gate (stateless, no filesystem) and must not be used for it.
- The gate result is recorded in §6: tool, version, checks run/passed, `artifact_hash`, and the
  signature event. Strategy refuses an artifact whose gate result is absent or bound to a different
  hash.

## 4. Research

### 4.1 Dispatch

Default attempt order (your sequence): Perplexity → Exa → Firecrawl → Browserless → harness search →
LLM. Capability shortcuts are permitted and recorded: known URL → Browserless/Firecrawl; recency →
search. **Every observation requires primary verification before `confirmed`** (ALIGN-13): a resolver
records HTTP status, final URL, body SHA-256, and span containment.

### 4.2 Tasks

| id | Task | Runs at | Output |
|---|---|---|---|
| R1 | Evidence & prevalence | T1 | OB-### (1–5) |
| R2 | Forces & alternatives | T5 | F-# + STK rows |
| R3 | Actors & stakeholders | **T5, before T3 is re-confirmed** | STK-### |

R3 runs before the problem is finally confirmed; actor framing defines the problem (CATWOE), it does
not follow it.

### 4.3 Evidence rules

- **Triangulation:** each OB needs ≥2 independent sources, or `single_source: true` + limitation.
  A `go` needs ≥1 triangulated observation.
- **Recency:** each domain declares `max_age_days`; older observations are flagged `stale`.
- **Appraisal:** `{bias, directness, precision}` per observation; `source_type`
  (peer_reviewed | preprint | vendor | news | other) and `coi` recorded.
- **Scope:** `search_scope` records languages, date window and access limits, so "no identifiable
  actor" is not a hidden search failure.
- **Quarantine:** retrieved text lands only in `evidence_quote` + `source_id` + locator. The research
  path may not write `confirmed`, `tier`, `strength` or any decision field.
- **Egress:** every outbound call goes through the broker, which records the exact bytes and hash.
  Sensitivity is classified before the ladder; sensitive narratives default to **local-only**
  (steps 1–4 structurally unavailable).
- **URL safety:** every fetch validates https-only, no userinfo, no IP literals, rejects
  private/loopback/link-local/ULA/metadata on **every** redirect hop, caps redirects, records the
  final URL.
- **LLM:** `step_used: 6` carries no locator, requires an operator-signed `allowLlm`, a recorded
  limitation, and a human confirmation for `go`. Tiers are `EV1–EV3` with a rubric:
  EV1 = primary source verified; EV2 = prototype/observation in the field; EV3 = named estimate with
  method and reference class. No tier is assigned by a tool's self-description.

## 5. Artifact

Roles T/L/B. **Hash:** `artifact_hash = sha256(canonical JSON of sections 0–5)`, stored in §6;
`log_hash = sha256(vision-research.json)`.

### §0 Input (T)
verbatim · hash · version · owner · received · classification · preset (selected at T0) ·
derived_objective + survival test · claim ledger · questions (≤5, default, answer/hypothesis) ·
`evidence_step: {R1, R2, R3}` · sensitivity + local_only flag.

### §1 Observations (1–5) (T)
OB-### · text · evidence_quote · source (research|harness|llm) · tool · query · locator ·
locator_verified + resolver record · date · source_type · coi · strength {bias,directness,precision} ·
single_source · stale · confirmed_by (signed event id).

### §2 Problems (1–5) (T)
PR-### · text · observations[] · baseline or baseline_unknown_plan · unit · hypothesis.

### §3 Vision, goal, objectives (L statement / T rest)
statement · horizon · **GOAL** (moved here so objectives have a parent at T4) · objectives[]:
OBJ-### · parent_goal · metric · baseline → target · horizon · software_role · scope_target.

### §4 5Ws
- 4.0 Principles P-# (3–7, testable) — L/T
- 4.1a Forces F-# (industry-level, bearing) — L
- 4.1b Actors STK-###: **enumerated actor-first** (affected · decides · blocks · pays · supplies),
  each optionally **tagged** with a force (rivalry/entrants/substitutes/suppliers/buyers/contextual).
  The five forces are a lens, never the completeness rule. Fields: type
  (person|organisation|role|group|community|regulator) · interest · influence · stance · salience
  P/L/U · engagement · material · source.
  **No software components; no domain data objects.**
- 4.2 Where LOC-### · 4.3 When T-### (driver_date)
- 4.4 What: envelope in/out/never · constraints[] (separate) · domains[] (consumed by primers)
- 4.5 Why: I-### (objective · actor → STK-### · measurement)
- 4.6 How: H-### (impacts[] · rationale · evidence)

### §5 Software possibility space (T)
C-### · capability · PR · OBJ · I[] · LOC · T · STK · H · M (metric · baseline/plan · target ·
method) · EV tier (EV1–EV3, locator, evidence, effort) · R[] · horizon · cluster · confidence ·
derives_from[] · lenses[] (+ pre/post hash) · structural_exclusion (duplicate | out_of_envelope |
not_software + reason). **No scores, ranks, buckets or preference.**

### §6 Decision (T)
owner · date · outcome (go|clarify|kill|reallocate) · kill/reallocate criteria · review date ·
artifact_hash · log_hash · evidence ids · signature event (git commit/PR approval SHA) · evidence_step.

### Companion vision-research.json
{ id, task, attempts: [{step, tool, query, outcome, reason?}], step_used (1–6|null),
failure_reason (required when null), result_ref, date, log_hash }.

## 6. Applicability

| Outcome | Required | Not applicable (CONS-13 reports N/A) |
|---|---|---|
| go | §0–§6 | — |
| clarify | §0, §1, §2, §6 with the open questions | §5 |
| kill | §0, §2 (if derived), §6 | §3–§5; ADDR-1, VIS-10..25, CONS-2..12 |
| reallocate | §0, §2, §3 (objectives + allocated agent), §4.1b, §6 | §5; ADDR-3..4, VIS-21..25 |

## 7. Checks

Every row has a predicate, a field, a stage and an enforcer; each ships a known-bad fixture.
Series: ENV, VIS, ADDR, CONS, ALIGN, STRAT, PARITY.

| id | Predicate (fails when) | Stage | By |
|---|---|---|---|
| ENV-1 | environment not run, or no chain report per phase | T0a | code |
| ENV-2 | a task lacks attempts[] or step_used; step_used null without failure_reason | T1/T5 | code |
| ENV-3 | step_used 6 without operator-signed allowLlm + limitation + confirmation | T12 | code+human |
| ENV-4 | §0 evidence_step ≠ log step_used ≠ §6 | T13 | code |
| ENV-5 | meta TOOL_KEYS/REQUIREMENTS/detectEnvironment ≠ chain | CI | code (PARITY-2) |
| EXEC-1 | Vision authored through the hosted endpoint, or an artifactFiles round-trip used | T0–T10 | code |
| EXEC-2 | gate check not run via local stdio MCP, or run against the hosted endpoint | T12 | code |
| EXEC-3 | §6 lacks the gate result, or its artifact_hash differs from the current artifact | T12/T13 | code |
| EXEC-4 | research egress occurred without a sensitivity classification allowing it | any | code |
| VIS-1 | verbatim/hash/version/owner/classification/preset missing | T0 | code |
| VIS-2 | an input claim has no disposition; a drop lacks confirmation | T0 | code+human |
| VIS-3 | >5 questions, a question without a default, or no answer/hypothesis | T0a | code |
| VIS-4 | observations outside 1–5; missing source/tool/query/date; source=agent | T1 | code |
| VIS-5 | an OB has <2 sources and no single_source flag+limitation | T1 | code |
| VIS-6 | an OB is older than max_age_days and not flagged stale | T1 | code |
| VIS-7 | source_type or coi missing | T1 | code |
| VIS-8 | problems outside 1–5; a PR cites no OB | T2 | code |
| VIS-9 | a PR claims a % without a number; no baseline and no plan and no hypothesis | T2 | code |
| VIS-10 | statement/horizon/software_role missing; tech/solution names present | T4 | code |
| VIS-11 | objectives outside the preset range; parent_goal missing; a field missing | T4 | code |
| VIS-12 | principles outside 3–7; a principle not testable | T5 | code |
| VIS-13 | an actor type outside the enum; a component or data object named; a row unsourced | T5 | code |
| VIS-14 | an actor without interest/influence/stance/salience/engagement | T5 | code |
| VIS-15 | a force with no actor and no reason; contextual bucket missing | T5 | code |
| VIS-16 | a problem without a location; a location without a surface | T5 | code |
| VIS-17 | a problem without timing; timing outside the horizon | T5 | code |
| VIS-18 | envelope empty; tech in envelope; constraints[] missing | T5 | code |
| VIS-19 | GOAL missing; <2 impact actors; I.actor not resolving to STK; I without measurement | T6 | code |
| VIS-20 | approaches outside 2–4; an approach with no impact | T7 | code |
| VIS-21 | grid undefined or incomplete without excused cells | T8 | code |
| VIS-22 | candidate count outside the preset derivation; duplicate capability signature | T10 | code |
| VIS-23 | a candidate missing PR/OBJ/I/LOC/T/STK/H, M, EV, R or horizon | T10 | code |
| VIS-24 | a candidate names a technology, a non-software intervention, or is compound | T10 | code |
| VIS-25 | a score/rank/bucket in §5; an exclusion outside the three reasons | T10 | code |
| VIS-26 | a domain not consumed by a primer; a non-goal not inherited | T13 | code |
| VIS-27 | artifact_hash or log_hash missing/mismatched | T13 | code |
| ADDR-1 | an objective's software_role does not name information/coordination/automation/access | T4 | code+judge |
| ADDR-2 | input not addressable and no kill/reallocate with decomposition attempt | T12 | human |
| ADDR-3 | a candidate is not a software capability | T10 | code |
| ADDR-4 | a preference exists in §5 | T10 | code |
| ADDR-5 | the statement does not name software's role | T4 | judge |
| CONS-1..12 | the named field has no inbound reference (per field) | T10 | code |
| CONS-13 | a field has no role or consumer; N/A not reported | T13 | code |
| CONS-14 | Strategy has no research log reference | Strategy | code |
| CONS-15 | a research attempt is not used/failed/rejected with a reason | T13 | code |
| CONS-16 | Strategy entered without a signed decision for the current hash | Strategy | code |
| ALIGN-1 | input hash changed since derivation | any | code |
| ALIGN-2 | ledger incomplete | T0 | code |
| ALIGN-3 | a rejected/out-of-scope claim lacks confirmation | T0 | human |
| ALIGN-4 | an OB/PR/OBJ/I/C lacks derives_from resolving to input/evidence | T13 | code |
| ALIGN-5 | a field contradicts never/constraints | T13 | code |
| ALIGN-6 | an objective cannot complete the so-that chain | T4 | judge |
| ALIGN-7 | ban-the-input answer not recorded | T4 | human |
| ALIGN-8 | a new noun is neither derived from confirmed evidence nor confirmed | T13 | code+human |
| ALIGN-9 | an input revision has no re-derivation report | any | code |
| ALIGN-10 | a gate signature is not bound to input_rev + artifact_hash | any | code |
| ALIGN-11 | questions/answers not bound to input_rev | T0a | code |
| ALIGN-12 | research log not hash-pinned | T13 | code |
| ALIGN-13 | EV1/EV2 observation lacks a resolver record or span containment | T1 | code |
| ALIGN-14 | an EV3/llm observation carries a locator | T1 | code |
| ALIGN-15 | the research path wrote confirmed/tier/strength/decision | any | code (writer matrix) |
| ALIGN-16 | an outbound call bypassed the broker; local-only mode not enforced | any | code |
| ALIGN-17 | a fetch URL is not https, or resolves private/loopback/metadata, or redirects unchecked | any | code |
| ALIGN-18 | judge family = generator family, or model/prompt not recorded | Strategy | code |
| ALIGN-19 | a decision is overwritten; kill/reallocate not signed | any | code |
| ALIGN-20 | human confirmation agreement not reported when >1 reviewer | T12 | human |
| STRAT-1 | a candidate has no disposition or more than one | Strategy | code |
| STRAT-2 | bucket count outside 2–4; a bucket cites no OBJ/H | Strategy | code |
| STRAT-3 | cluster arithmetic does not reconcile | Strategy | code |
| STRAT-4 | a killed/deferred row lacks reason/trigger | Strategy | code |
| STRAT-5 | hashes do not match the artifact | Strategy | code |
| STRAT-6 | the full candidate table is unreachable | Strategy | code |
| STRAT-7 | selection criteria (originality vs feasibility) not recorded | Strategy | code+human |
| STRAT-8 | judge scores lack agreement measure or order-swap | Strategy | code |
| PARITY-1 | artifact-templates/prompt-patterns/workflow-phases field lists ≠ this document | CI | code |
| PARITY-2 | meta TOOL_KEYS/REQUIREMENTS/detectEnvironment ≠ §4 | CI | code |

## 8. Handoff

Vision hands over the artifact, the research log (with `step_used` and attempts), structural
exclusions, the claim ledger, questions/hypotheses, the signed decision and hashes. **No scores, ranks
or buckets.** Strategy runs the independent judge (two judges, agreement reported, order-swapped,
grounded in locators), selects, buckets, and applies STRAT-1..8.

## 9. Presets

| Preset | Problems | Objectives | Clusters | Candidates (derived) | Passes |
|---|---|---|---|---|---|
| Product | 1–5 | 3–5 | 12–20 | clusters × 1–4 | 3 + 2 lens |
| Feature | 1–3 | 2–3 | 6–10 | clusters × 1–2 | 2 + 1 lens |
| Lean | 1 | 1 | 3–5 | clusters × 1 | 1 |

Count = clusters × fan-out, capped at 80; no fixed candidate number. Floor = grid completeness.

## 10. Decisions still open

D1. **Signing:** signed git commit / PR approval SHA (proposed) vs SSO-signed event. **Open.**
D2. **Resolved (v6):** Vision executes local-only. Remaining question: default sensitivity class for
    a narrative with no signal — proposed "not sensitive, research allowed"; sensitive ⇒ local-only
    research (harness/LLM). **Confirm the default.**
D3. **Decided (v6):** actor-first enumeration with force tags. The five forces are a lens, not a
    completeness rule.
D4. **Decided (v6):** `reallocate` is a third outcome, recorded with the non-software agent.
D5. **Stop rule:** 3 consecutive zero-new passes (pragmatic, declared) vs 10+3 (closest published
    precedent, heavier). **Open.**
D6. **Chain:** fixed order as the default attempt order, with capability shortcuts and mandatory
    primary verification — the evidence says a fixed *quality* order is wrong. **Open.**
D7. **Evidence tiers:** EV1–EV3 with the rubric above vs mapping to TRL. **Open.**

## 11. Acceptance

Good fixture passes; every check has a known-bad fixture; kill and reallocate fixtures produce the
applicability matrix; a sensitive narrative in local-only mode cannot reach steps 1–4; a poisoned page
leaves `confirmed` and the decision unchanged; an EV1 observation without a resolver record fails;
Strategy cannot enter without a signed decision; parity checks bind the four repo surfaces; a Vision
authored via the hosted endpoint fails EXEC-1; a gate run outside the local stdio MCP fails EXEC-2.
