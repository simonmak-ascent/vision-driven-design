---
name: vdd-validate
description: Validate a finished chain — every vision goal has a dedicated descendant path down to a task, and every task traces back to a goal. Use at the end of a VDD cycle, over all six artifacts at once.
---

# VDD: Validate (phase 8)

## Step 0 — Collect every artifact

You need the vision, strategy, tactics, specs, plan and tasks text. `vdd_chain_validate` takes them
together; a single-artifact judgement is `vdd_check` and answers a different question.

## Step 1 — Submit the whole chain

```json
{"artifacts": {"vision": "<vision.md>", "strategy": "<strategy.md>", "tactics": "<tactics.md>", "specs": "<spec.md>", "plan": "<plan.md>", "tasks": "<tasks.md>"}, "declaredCounts": {"goals": 2, "pillars": 3, "actions": 4, "specs": 1, "components": 2, "tasks": 5}}
```

`vdd_chain_validate` runs the phase checks in order and adds the cross-phase check: every `V-###` must
reach a `TK-###` through the serves links the artifacts declare.

`declaredCounts` is optional, and omitting it disables every declared-count comparison — the
invariants still run, and so does the tactics `action_count < pillar_count` diagnostic, which is
derived from the text. What stops is the check that a phase's artifact has the number of children the
caller intended. Send it.

## Step 2 — Read the per-phase breakdown

Every failure names its phase. Fix the earliest one first: a broken junction invalidates everything
below it, so repairing a later artifact is wasted work until the earlier one holds.

## Gate criteria

- Every phase present passes its own invariants (A, B, C) and its count rule.
- Every `V-###` has a dedicated descendant path to a task, and every task traces back to a goal.
- `status: "PASS"` over the whole chain — not per artifact.

Hand the result to the human. No later phase follows this one.
