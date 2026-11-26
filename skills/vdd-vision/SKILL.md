---
name: vdd-vision
description: Turn a freeform intent into the vision artifact of the v16 framework — observations with locators, problems, objectives with metrics, the 5Ws, the software possibility space, the decision, and the chain projection that gives each selected objective a V-### id. Use for VDD phase 1.
---

# VDD: Vision (phase 1)

## Step 0 — Declare counts

Read the human's intent and the research you gathered. Decide how many objectives the preset allows:
Product 3–5, Feature 2–3, Lean 1. Set `declaredCounts.goals` to that number before writing.

## Step 1 — Fill the artifact, then project it

Write the v16 artifact: §0 Input, §1 Observations (1–5), §2 Problems (1–5), §3 Vision/goal/objectives,
§4 5Ws, §5 Software possibility space, §6 Decision. Every objective is an `OBJ-###` carrying its
metric, its baseline → target and its horizon, stated once.

## Step 1a — Hold the evidence discipline

The framework's rules are not optional prose, and the tool checks none of them:

- Every observation carries a **quote**, a **locator**, a source and a date, and says whether it is
  triangulated — and states its limitation when it is not.
- Every problem states its baseline or the plan to measure it, its unit, and whether it is a hypothesis.
  A hypothesis states why.
- The claim ledger accounts for every claim: represented, deferred with a trigger, rejected with a
  reason, or out of scope with a reason. A ledger entry in no outcome is an unexamined claim.
- The coverage grid is problems × material actors × approaches; every cell holds a candidate or
  `excused + reason`. An empty cell is a gap, not a decision.
- No scores, ranks, buckets or confidence levels anywhere in the artifact.

Then write `## Chain projection` — one line per selected objective, and nothing else on the line:

```
- V-001 → OBJ-001
- V-002 → OBJ-002
```

The objective is authoritative. The projection carries the two ids; it never restates a metric. Every
selected objective gets a `V-###`, and every `V-###` resolves to an objective the artifact declares.

## Step 2 — Self-verify before submitting

Count the projection lines, not the objectives you intended. Compare to `declaredCounts.goals`. Check
that no two lines share a `V-###` or an `OBJ-###`, and that every objective named on a line exists in §3.


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "vision", "content": "<vision.md>", "declaredCounts": { "goals": 3 }}
```

## Step 4 — Handle the result

- `status: "PASS"` — with `declaredCounts.goals` sent, the declared count matches the number of
  `V-###` blocks. If it was omitted, nothing was checked: for the vision that count is the only
  automated rule. A, B and C do not apply — the vision has no parent, so there is no junction.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- The declared goal count equals the number of `V-###` blocks the artifact declares.
- The projection binds one `V-###` to one `OBJ-###`, and no metric appears on a projection line.
- A, B and C do not apply: the vision has no parent, so there is no junction to check.
