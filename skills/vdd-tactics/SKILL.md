---
name: vdd-tactics
description: Turn a validated strategy into tactics.md — action items that each serve one strategic pillar, with one dedicated action per pillar. Use for VDD phase 3, after the strategy passes vdd_check.
---

# VDD: Tactics (phase 3)

## Step 0 — Declare counts

Read `priorArtifacts.strategy` and list every `S-###`. Set `declaredCounts.actions` to the number of
action items you will write, and `declaredCounts.pillars` to the number of pillars you read.

## Step 1 — Generate one action per pillar, in ascending order

1. Open the item with its id on its own line: `- A-001 **name**` or a table row beginning `| A-001 |`.
2. Give it exactly one parent: `serves_pillar: S-001`.
3. Give it a priority (`MUST` / `SHOULD` / `COULD`). The specs phase binds to MUST actions only, so the
   priority has to be in a form the engine parses: the line `priority: MUST`, a whole `| MUST |` cell on
   the row that opens the item, or `[MUST]` on that row. `**Priority:** MUST` parses as none of them —
   the item is then not a MUST parent; a spec serving it is reported as
   `SP-### serves no known parent`, and an action left without a spec is not reported at all.
4. The **first** action written for a pillar must serve only that pillar.

## Step 2 — Self-verify before submitting

Rows are `S-###`, columns are `A-###`.

- No pillar without an action (A).
- No action whose `serves_pillar` names a pillar the strategy does not declare (B).
- Every pillar has an action that serves only it (C).
- Actions ≥ pillars, and the declared count matches the items you wrote.


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "tactics", "content": "<tactics.md>", "declaredCounts": { "actions": 4, "pillars": 3 }, "priorArtifacts": { "strategy": "<strategy.md>" }}
```

## Step 4 — Handle the result

- `status: "PASS"` — the artifact satisfies A, B and C. Move on to `vdd-specs`.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- **A** every `S-###` has at least one `A-###`.
- **B** every `A-###`'s `serves_pillar` names a pillar the strategy declares.
- **C** every `S-###` has an action no other pillar shares.
- Actions ≥ pillars; the tool reports `action_count=<n> < pillar_count=<m>` when they are not.
