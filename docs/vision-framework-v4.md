# Vision framework — v4 (proposal under review)

Status: draft for review. Not implemented. The repository's current vision template is still the
7-section version in `references/artifact-templates.md`.

## 1. Purpose and scope

Turn an ambiguous user narrative into a software design vision: the change, the evidence, the
actors, the constraints, the role software plays, and a software possibility space for strategic
analysis.

- Software addressability is a gate (N-series). If the narrative cannot be decomposed into a
  behaviour software can influence — law, culture, subsidy, hiring or physical infrastructure being
  the primary mechanism — the correct output is `kill`, recorded and owned.
- Solutions do not validate the narrative. Evidence and human confirmation validate it; section 5
  only instantiates it.

## 2. Principles

1. The human supplies a few sentences; the agent restructures and asks when information is missing.
2. Evidence is a record: tool, query, date, locator, chain position.
3. A field exists only if traced, used as a lens, or consumed by a gate.
4. Alignment is bidirectional: output→input grounding, input→output coverage.
5. The candidate count is derived from the coverage grid.
6. Generation and selection are separated; Vision never selects.
7. A model may not judge its own output.

## 3. IPO

- INPUT: the user narrative (verbatim, hashed, classified), constitution/context, non-negotiables,
  known window, optional evidence.
- TRANSFORMATION: 14 stages, 3 human gates, deterministic checks at each boundary.
- OUTPUT: vision.md sections 0–6, vision-research.json, manifest, decision record, software
  possibility space to Strategy.

## 4. Research chain

Every research task attempts the chain in order and logs every attempt.

| # | Tool | Capability | Provenance | go possible |
|---|---|---|---|---|
| 1 | Perplexity | search + synthesis with citations | research, locator + date | yes |
| 2 | Exa | semantic search, page contents | research, URL + date | yes |
| 3 | Firecrawl | search + scrape/crawl | research, URL + date | yes |
| 4 | Browserless | retrieval (renders a known/discovered URL; not a search API) | research, URL + date + note | yes, with limitation |
| 5 | Harness search | the agent's own websearch / web_search / search | harness, query + date + result URLs | yes |
| 6 | LLM knowledge | parametric, no citations | llm, no locator | no — clarify unless the human confirms |

Brave Search is not in the chain. Browserless needs a URL; at position 4 it means "somewhere to
look, no search", and the log must say so.

### Three Vision research tasks

| id | Task | Runs at | Answers | Output |
|---|---|---|---|---|
| R1 | Evidence & prevalence | T1 | Is the problem real? How prevalent, for whom? What do people do today? Has anyone tried, and what happened? | OB-### (≤3) + precedent locators for A1 |
| R2 | Forces & alternatives | T5 | Rivalry, substitutes (incl. do-nothing), entrants, suppliers, buyers/payers | F-1…F-6 + STK rows for rivals/suppliers/buyers |
| R3 | Actors & stakeholders | T5 | Who is affected, decides, blocks, pays; interest, influence, stance, salience | STK-### with type and force |

R2 and R3 run after the problem is confirmed (T3).

## 5. Artifact schema

Roles: T trace, L lens, B both.

### Section 0 — Input (T)
verbatim, hash, version, owner, received, classification (outcome|problem|solution|mixed),
derived_objective + survival test (solution input only), claim ledger (represented / deferred+trigger
/ rejected+reason / out_of_scope+reason), questions (≤5, each with a default and an answer or
hypothesis+consent), evidence_step (1–6).

### Section 1 — Observations (1–5) (T)
OB-###, text, source: research|harness|llm|agent, tool, query, locator (+locator_verified when
applicable), date, strength, confirmed.

### Section 2 — Problems (1–5) (T)
PR-###, text, observations[], baseline or baseline_unknown_plan, unit, hypothesis.

### Section 3 — Vision & objectives (L statement / T objectives)
statement (software role named; no technology, vendor or solution names), horizon (2–5 years or a
target date), objectives[] (OBJ-###, text, parent_goal, metric, baseline → target, horizon,
software_role).

### Section 4 — Scope, boundaries & principles
| Sub-section | Fields | Role |
|---|---|---|
| 4.0 Principles P-# | testable trade-off rules | L + T (spec boundary) |
| 4.1a Industry forces F-# | kind, level: industry, bearing | L |
| 4.1b Stakeholders STK-### | type, force, interest, influence, stance, salience P/L/U, engagement, material, source | L (blockers) + T (impact actors) |
| 4.2 Where LOC-### | location/surface, problems[] | L + T |
| 4.3 When T-### | window/trigger, problems[], driver_date | L + T |
| 4.4 What | envelope in / out / never | T |
| 4.5 Why | GOAL, I-### with objective, actor, measurement | B |
| 4.6 How | H-###, approach, impacts[], rationale, evidence | B |

Stakeholder rules: type in {person, organisation, role, group, community, regulator}. Never a
software component (API, service, database, system, module, UI, frontend, backend, server,
middleware, domain data object). force is the competitive force the actor embodies. All five forces
plus contextual have ≥1 actor or "no identifiable actor — reason". Constraints and never are separate
fields.

### Section 5 — Software possibility space (T)
C-###, capability (one verb + object), PR, OBJ, I[], LOC, T, STK, H, M (metric, baseline or plan,
target, method), A (tier A1|A2|A3, locator, evidence, effort), R[], horizon, cluster, confidence,
derives_from[], lenses[], structural_exclusion (duplicate / out_of_envelope / not_software, with
reason).

No dispositions, no ranking, no buckets. Structural exclusions are logged, not deleted.

### Section 6 — Decision (T)
Owner, date, go|clarify|kill, kill criteria, review date, evidence_step.

### Companion: vision-research.json
{ id, task, attempts: [{step, tool, query, outcome, reason?}], step_used, result_ref, date }. Every
attempt is used, failed+reason, or rejected+reason.

## 6. Pipeline

| # | Stage | Output | Human gate |
|---|---|---|---|
| T0 | classify, hash, claim ledger | section 0 | — |
| T0a | detect-environment + gap questions (≤5) | section 0 | yes (answers) |
| T1 | R1 research (chain) → observations | section 1 | — |
| T2 | derive problems (baseline or plan) | section 2 | — |
| T3 | confirm the problem | flags | yes |
| T4 | goal, horizon, objectives + software_role | section 3 | yes |
| T5 | R2/R3 research (chain) + 5Ws | sections 4.0–4.4 | — |
| T6 | impact model | section 4.5 | — |
| T7 | approaches | section 4.6 | — |
| T8 | coverage grid + independent passes + lens passes (blockers, constraints) | raw sets | — |
| T9 | dedupe/cluster; new-cluster curve | clusters | — |
| T10 | SMART, evidence tiers, traces, software-only + envelope pruning | section 5 | — |
| T11 | independent judge (shuffled, objective's metric) | scores for Strategy | — |
| T12 | decision record | section 6 | yes |
| T13 | consumption lint + handoff | manifest | — |

Stop rule: two consecutive passes with zero new clusters and a complete grid. Report the curve;
never claim saturation.

## 7. Checks

Environment (E): E1 environment ran and reports the chain per phase; E2a each task records step_used
and prior attempts; E2b step 6 requires allowLlm, a limitation, and confirmation for go; E2c
evidence_step appears in section 0 and section 6.

Vision structure (V): V0 input; V0a ledger; V0b gap/questions; V0c question limit; V1a/b
observations; V1c go requires step 1–5 evidence or confirmed LLM; V1d source enum + query/date; V1e
no unverified locator; V2a/b problems; V3 statement/horizon/software role; V4 objectives; V5
principles; V6a–f stakeholders (five forces, typed, no components, sourced); V7 where; V8 when; V9
envelope; V10 impacts; V11 approaches; V12 grid + derived count + preset; V13 unique clusters; V14
candidate trace; V15 M fields; V16 evidence tier; V18 language (no tech, no non-software
intervention, no compound); V19 coverage; V20 revision hash.

Software addressability (N): N1 objective software_role; N2 input addressable or kill; N3 candidates
software-only; N4 no selection/ranking/disposition in section 5; N5 statement names software role.

Consumption (C): C1 observations; C2 problems; C3 objectives; C4 principles; C5 forces; C6
stakeholders; C7 where/when consumed by candidates; C8 impacts; C9 approaches; C10 candidates
offered to Strategy; C11 domains consumed by primers; C12 non-goals inherited; C13 dead-field lint;
C16 Strategy consumes the research log and step_used; C17 every research attempt dispositioned.

Alignment (A): A1 anchor; A2 ledger; A3 drops confirmed; A4 grounding; A5 no contradiction with
never; A6 so-that chain; A7 ban-the-input; A8 new nouns; A9 revision re-derives; A10 signatures bound
to hash; A11 questions bound to hash; A12 research log hash-pinned.

Strategy (H, not Vision): H1 one disposition per candidate; H2 buckets cite OBJ+H; H3 2–4 buckets;
H4 cluster arithmetic; H5 reasons/triggers; H6 hashes match; H7 full table reachable.

## 8. Handoff to Strategy

Vision hands over: the full C-### table (traces, M, tier, cluster), the coverage grid and cluster
counts, structural exclusions with reasons, the claim ledger, questions/hypotheses, the research log
with step_used, the decision and hashes. Vision hands over no rankings, buckets or dispositions;
Strategy applies H1–H7.

## 9. Presets

| Preset | Problems | Objectives | Clusters | Candidates | Passes |
|---|---|---|---|---|---|
| Product | 1–5 | 3–5 | 12–20 | derived, cap 80 | 3 + 2 lens |
| Feature | 1–3 | 2–3 | 6–10 | 8–16 | 2 + 1 lens |
| Lean | 1 | 1 | 3–5 | derived | 1 |

Floor = grid completeness; waivers recorded with reasons.

## 10. Explicitly rejected

Network registries; executable extensions/hooks; a fixed candidate count; absolute 1–10 scoring; an
LLM as the only judge; technology or vendor names in vision or candidates; non-software interventions
as candidates; software components as stakeholders; value-based selection inside Vision; fabricated
locators; silent fallback (every chain attempt is logged).

## 11. Review questions

1. Confirm Brave removed from the chain.
2. Confirm Browserless re-added to TOOL_KEYS as a research tool at position 4.
3. Confirm R2/R3 run after T3.
4. Confirm evidence_step is visible in the artifact and decision record.
5. Confirm step 6 blocks go without human confirmation.
6. Confirm section 5 has no dispositions and Strategy owns H1–H7.
7. Confirm the software-addressability gate and kill are acceptable outputs.
