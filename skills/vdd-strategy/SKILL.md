---
name: vdd-strategy
description: Turn a validated vision into strategy.md — pillars that each serve one vision goal, with one dedicated pillar per goal. Use for VDD phase 2, after the vision passes vdd_check.
---

# VDD: Strategy (phase 2)

## Step 0 — Declare counts

Read `priorArtifacts.vision` and list every `V-###` it declares. Those are the parents; every one needs a
pillar. Set `declaredCounts.pillars` to the number of pillars you will write.

## Step 1 — Generate one pillar per goal, in ascending order

1. Open the pillar with its own id on its own line: `### S-001: <name>`.
2. Give it exactly one parent: `- serves_goal: V-001`.
3. The **first** pillar written for a goal must serve only that goal. A pillar shared by two goals
   leaves both without a dedicated child, which is invariant C's failure — the one the whole matrix
   exists to catch.

## Step 2 — Self-verify before submitting

Draw the matrix: rows are `V-###`, columns are `S-###`, a cell is set where a pillar names the goal.

- No row empty (A) — every goal has a pillar.
- No pillar naming a goal the vision does not declare (B).
- Every row has a pillar with a column sum of exactly 1 (C).


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "strategy", "content": "<strategy.md>", "declaredCounts": { "pillars": 3 }, "priorArtifacts": { "vision": "<vision.md>" }}
```

## Step 4 — Handle the result

- `status: "PASS"` — the artifact satisfies A, B and C. Move on to `vdd-tactics`.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- **A** every `V-###` has at least one `S-###` whose `serves_goal` names it.
- **B** every `S-###`'s `serves_goal` names a goal the vision declares.
- **C** every `V-###` has a pillar no other goal shares.
- The declared pillar count equals the number of pillar blocks.
