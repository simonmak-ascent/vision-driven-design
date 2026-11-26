# Vision framework — v17: the chain projection

**Status**: delta over v16. `docs/vision-framework-v16.md` still governs the artifact; this file records the
three changes that make it the root of a VDD chain. Where the two disagree, this file wins for the three points
below and v16 wins for everything else.

## 1. The projection, and which id is authoritative

A vision artifact keeps v16's §0–§6 structure unchanged. It gains one section, `## Chain projection`, holding
one line per selected objective:

```
- V-001 → OBJ-003
```

The **objective is authoritative**. `OBJ-###` carries the metric, the baseline → target and the horizon, and
states them once, in §3. The projection line carries the two ids and nothing else: no metric, no target, no
restatement. A second copy of a number is a copy that drifts.

`V-###` exists so the downstream chain has an id to serve. It has no other content — that is what makes the
projection a projection rather than a second artifact.

## 2. The objective bound is preset-relative

v16 §8 sets the bound; `N ≥ 3` does not appear. The number of objectives is the preset's, not a fixed floor:

| Preset | Objectives |
|---|---|
| Product | 3–5 |
| Feature | 2–3 |
| Lean | 1 |

A vision declaring fewer objectives than its preset's lower bound, or more than its upper bound, is out of
preset — not out of vision.

## 3. What the engine checks, and what it does not

`vdd_check{phase:'vision'}` checks the declared and actual goal counts and nothing else: the vision phase has no
parent, so it has no junction to check. The seven headings, the claim ledger, the grid and the evidence tiers are
v16's own rules, held by `SKILL.md` and `references/` (and, from 2.0.0, by `skills/vdd-vision/SKILL.md`), plus human review at §6.

The projection rule — one `V-###` per selected `OBJ-###`, distinct, each resolving to an objective the artifact
declares — is asserted over the *template* by `packages/vdd-engine/test/template-grammar.test.ts`, not by
`vdd_check`. A vision artifact whose projection names an objective it does not declare passes the tool; the
template test is what keeps the shape an author copies from being wrong.
