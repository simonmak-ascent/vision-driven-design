# Vision framework — v18: the field contract, the projection rule, the record corrected

**Status**: delta over `docs/vision-framework-v16.md` and `docs/vision-framework-v17.md`. This file
supersedes v16 §0 and §11 and v17 §3. v16 still governs the artifact's §0–§6 structure and its research
rules; v17 still governs the objective id and the preset-relative objective bound. This file governs the
field inventory (§2), the projection rules the tool enforces (§4), the candidate caps (§5), and the
corrections below.

## 1. Corrections to the record

v16 and v17 are not edited: they are the record of what was certified, and `docs/plan-restructure-v5.md:37,92,118-129`
and `docs/plan-vision-skill-only.md:4` cite them. Every statement below is false today; this table is the
correction a reader is sent to.

| Statement in the record | Where | What is true in 2.0.0 |
|---|---|---|
| "Status: proposal … **Vision is a skill procedure only.** No engine phase, no MCP tool" | `v16:3`, `v16:6-9` | `vdd_check{phase:'vision'}` is a shipped phase (`packages/vdd-engine/src/coverage.ts:74`); §4 extends it to the projection. The vision has no *generation* tool, which is what the sentence was reaching for |
| "the skill's template is authoritative" | `v16:92` | No template lives in the skill. The template is `references/artifact-templates.md:84-177`; the field contract travels in `skills/vdd-vision/SKILL.md` (§2, §6) |
| "Skill documents: replace … in `references/artifact-templates.md`, `references/prompt-patterns.md`, `references/workflow-phases.md`, `SKILL.md`" | `v16:245-249` | `prompt-patterns.md` no longer exists; the vision procedure is the skill, and the reference documents were rewritten for the three-tool surface |
| "**Counts**: 14 → 13 tools and 20 → 19 prompts" | `v16:254` | 2.0.0 shipped **3 tools and 0 prompts**; the live surface is enumerated in `packages/vdd-mcp/test/count-parity.test.ts:18-44` |
| "the projection rule … is asserted over the *template* … not by `vdd_check`" | `v17:36-45` | It is a tool rule from this version (§4). The template test (`packages/vdd-engine/test/template-grammar.test.ts:112-140`) remains as a second, independent control |

## 2. The field inventory

The artifact's field contract, one row per field. This table is the authority: the vision template
(`references/artifact-templates.md`) and the skill (`skills/vdd-vision/SKILL.md`) must carry every token,
and `packages/vdd-engine/test/vision-framework.test.ts` derives its assertions from this table — the test
hardcodes nothing.

| token | §N | rule |
|---|---|---|
| verbatim | §0 | the human's words, or a redacted summary where the classification is not approved for the host |
| classification | §0 | outcome, problem, solution or mixed |
| preset | §0 | product, feature or lean; it sets the bounds in §5 |
| sensitivity | §0 | public, internal, confidential, personal or unclassified |
| sensitivity_rule | §0 | one handling rule per label; `public` may egress, every other label is local-only unless agreed |
| research_mode | §0 | egress or local-only — the decision actually taken, not the default |
| egress_agreement | §0 | the human's verbatim words and date; required when `research_mode` is egress |
| owner | §0 | the artifact has exactly one owner |
| date | §0 | the artifact's date |
| claim_ledger | §0 | every claim represented, deferred with a trigger, rejected with a reason, or out of scope with a reason |
| locator | §0 | the source location for each represented claim and each observation |
| questions | §0 | at most five, each with a proposed default |
| validated_by | §0 | for an answered question, who confirmed it and when; for a default, the assumption's retirement owner |
| evidence_by_task | §0 | the observation and problem ids each research task produced |
| grid | §0 | problems × material actors × approaches; every cell holds a candidate or an excuse with a reason |
| grid_sampling | §0 | the rule by which cells were sampled; a not-sampled cell carries its reason |
| gate_criteria | §0 | the ordinal criteria and thresholds §6 decides against, declared before §5 is generated |
| observations | §1 | one to five, each with the next eight fields |
| quote | §1 | the verbatim text that supports the observation |
| source | §1 | the publisher; two answers from one tool are one source |
| type | §1 | primary, preprint, vendor, news or other |
| triangulated | §1 | true, or false together with a limitation |
| limitation | §1 | required when `triangulated` is false |
| searched | §1 | the date the source was retrieved |
| revalidate_by | §1 | the date or trigger after which the observation is re-checked |
| stale | §1 | true when `revalidate_by` has passed; derived, never judged |
| problems | §2 | one to five, each with the next six fields |
| baseline | §2 | the measurement today, or the plan to measure it |
| unit | §2 | the unit of the baseline, the target and any disconfirming result |
| hypothesis | §2 | true or false |
| hypothesis_reason | §2 | required when `hypothesis` is true |
| hypothesis_test | §2 | the test that could disconfirm the hypothesis |
| disconfirming_result | §2 | a value in `unit`, with a direction and a date, at which the hypothesis is abandoned |
| statement | §3 | one sentence: the future state this product creates |
| horizon | §3 | when the statement is true |
| goal | §3 | the outcome the objectives add up to |
| non_goals | §3 | what the vision explicitly does not do |
| objectives | §3 | OBJ-###, one per metric, each with the next five fields |
| metric | §3 | the measured quantity |
| target | §3 | the value to reach, stated with the baseline as `baseline → target` |
| software_role | §3 | what the software does for the objective |
| allocated_agent | §3 | the receiving agent, on a reallocate outcome only |
| instrument | §3 | the named measurement instrument; a baseline with none is unmeasurable |
| principles | §4 | three to seven, each testable |
| forces | §4 | the industry screen; a force is a tag, never a standalone actor |
| actors | §4 | actor-first: affected, decides, blocks, pays, supplies; no software components |
| interest | §4 | what the actor wants, in the actor's own terms |
| influence | §4 | high, medium or low |
| stance | §4 | supportive, neutral or resistant |
| power | §4 | yes or no — Mitchell, Agle and Wood's first attribute |
| legitimacy | §4 | yes or no — the second attribute |
| urgency | §4 | yes or no — the third attribute |
| salience_class | §4 | derived, not judged: three attributes definitive, two expectant, one latent |
| engagement | §4 | how the actor is engaged |
| material | §4 | true when the actor has a non-empty interest and a stated stance |
| where | §4 | the place |
| when | §4 | the time window |
| envelope | §4 | the constraints, regulatory and technical domains |
| context | §4 | users, tasks, equipment and environment (ISO 9241-11) |
| impacts | §4 | actor, measurement and objective; at least two actors |
| approaches | §4 | two to four, each mapped to impacts |
| capabilities | §5 | C-###, one verb and one object: an outcome-bearing ability, not a feature or a component |
| capability_key | §5 | unique within the artifact |
| derives_from | §5 | the ids the capability derives from; each resolves |
| evidence | §5 | the named source or method behind the capability's measurement |
| downgrades | §5 | the GRADE domains that lower certainty: risk of bias, inconsistency, indirectness, imprecision, publication bias |
| outcome | §6 | exactly one of go, clarify, kill or reallocate |
| criteria | §6 | the `gate_criteria` met, named with the threshold |
| review_date | §6 | after the decision date |
| review_points | §6 | the four reviews, each with its principal, timestamp and displayed evidence ids |

## 3. The research verdicts

Each entry is one decision; the sources are the ones the research pass named.

| Construct | Verdict | Reason |
|---|---|---|
| Evidence before §2 (Opportunity Solution Tree) | already present | §2 already carries `observations`; v18 adds one checklist line — every `PR-###` names an `OB-###` that exists |
| Claim ledger locator (ISO 29148; ADR) | narrowed | each represented claim carries a `locator`; a per-claim owner is rejected because the artifact has one owner, and a second identity for the same fact is the defect |
| Sensitivity handling (ISO 27001 A.5.12) | adopted | one rule per label (`sensitivity_rule`); `research_mode` is kept as the record of what was done |
| Gap questions with defaults (ISO 29148) | narrowed | an unanswered question gains `validated_by`; a default is an assumption with a retirement owner, not an answer |
| 24-month recency window (Cochrane C35) | adopted | `recency_window` and the fixed 24 months are deleted; `searched` and `revalidate_by` replace them, and `stale` derives from the latter |
| Triangulation (Denzin) | narrowed | one operational sentence: independent means different publishers and neither quotes the other |
| Hypothesis needs a test (Ries) | adopted | `hypothesis_test` and `disconfirming_result` are required when `hypothesis` is true |
| Objectives need an instrument (GQM, SMART, OKR) | narrowed | one `instrument` per objective; leading indicators stay optional and are not a token |
| Actor salience (Mitchell–Agle–Wood) | adopted | `power`, `legitimacy` and `urgency` are yes/no and `salience_class` is derived; the bare label is unfalsifiable |
| Porter forces as actor tags | adopted as a divergence | forces are an industry screen (§4.1a); no actor carries a force tag |
| Capability = verb + object (TOGAF) | narrowed | one sentence: an outcome-bearing ability the software provides |
| EV1/EV2/EV3 (GRADE, CEBM, TRL) | adopted, replaced | the invented tiers are deleted; `downgrades` records GRADE's five domains. TRL is rejected: nothing in the artifact consumes maturity |
| No scores or ranks (Stevens) | narrowed | aggregate scores stay banned; `gate_criteria` declares the ordinal criteria and thresholds the decision uses |
| Grid and fan_out (Zwicky; Kuhn) | adopted | `fan_out` and `clusters × fan_out` are deleted; the candidate count is the enumerated grid cells and the preset cap binds; `grid_sampling` records the rule |
| go/clarify/kill (Stage-Gate) | adopted | `criteria` names which `gate_criteria` was met |
| Four review points (ADR; NASA) | rejected as a count, adopted as a record | no source mandates a number in either direction; the count stays and `review_points` records each review |
| Presets, research_mode, lenses, stale | kept / kept / deleted / redefined | presets are this framework's own bound; `lenses` is deleted because it is never defined and can be neither satisfied nor failed; `stale` survives, redefined above |
| Context of use (ISO 9241-11) | narrowed | one `context` line — users, tasks, equipment, environment |

## 4. The projection rule

The `## Chain projection` section runs from its heading to the next line beginning `## ` or the end of
the text. A *projection line* is a trimmed line matching `^- V-\d{3} → OBJ-\d{3}$` exactly: no metric, no
target, no restatement.

| Rule | Check | Failure reason |
|---|---|---|
| R1 | the section exists | `vision has no "## Chain projection" section` |
| R2 | at least one valid line; every `- V-` line is the strict shape | `the chain projection names no V-### id`, or `not a projection line: <line>` |
| R3 | no `V-###` appears on two lines | `V-001 is projected more than once` |
| R4 | no `OBJ-###` is projected by two lines | `OBJ-001 is projected more than once` |
| R5 | every `V-###` anywhere in the artifact appears on exactly one projection line; ids R2 or R3 already reported are skipped | `V-002 is not in the chain projection` |
| R6 | every projected `OBJ-###` is declared before the heading; objectives R4 already reported are skipped | `V-001 projects OBJ-099, which the artifact does not declare` |

R1 and R2 short-circuit: no section emits one reason; no valid line emits R2's reasons only. Projection
reasons precede the count reasons, so a structurally broken artifact reads structurally first.

**Still held by the skill, not by the tool** — a parser cannot verify these without inventing a §0 grammar:

- the seven `### §N` headings exist (asserted over the template by `count-parity.test.ts:133-141`);
- `out_of_scope` is non-empty when a claim was scoped out;
- `declaredCounts.goals` falls inside the preset's bound.

## 5. Presets and candidate caps

| Preset | Problems | Objectives | Clusters | Candidates |
|---|---|---|---|---|
| Product | 1–5 | 3–5 | 12–20 | grid cells, cap 80 |
| Feature | 1–3 | 2–3 | 6–10 | grid cells, cap 20 |
| Lean | 1 | 1 | 3–5 | grid cells, cap 5 |

The Product cap is v16's own (`v16:199`); the Feature and Lean caps are its maxima computed — ten clusters
× two, five clusters × one (`v16:200-201`). A vision outside its preset's objective bound is out of preset,
not out of vision (`v17:23-34`).

## 6. Why the skill carries the contract

The published package ships `dist` only (`packages/vdd-mcp/package.json:12-14`), and the skill manifest is
compiled from `skills/<name>/SKILL.md` by `scripts/gen-skill-manifest.mjs:21`. A hosted or npm client
therefore never receives `references/`, so a pointer from the skill to the template would be a dead end on
the surface that matters. The inventory in §2 is carried in the skill as a compact contract — one line per
section — and in the template as the fields themselves; `vision-framework.test.ts` binds the two to this
table.
