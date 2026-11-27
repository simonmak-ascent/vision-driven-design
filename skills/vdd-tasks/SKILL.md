---
name: vdd-tasks
description: Write tasks.md for a plan — atomic tasks that each serve one component, one dedicated task per component, each with its files, dependencies and acceptance criteria. Use for VDD phase 6.
---

# VDD: Tasks (phase 6)

## Step 0 — Declare counts

Read `priorArtifacts.plan` and list every `PL-###`. Set `declaredCounts.tasks` to the number of tasks you
will write, and `declaredCounts.components` to the number of components you read.

## Step 1 — Generate one task per component, in ascending order

1. Open the task with a checkbox and its id: `- [ ] **TK-001** [S] <title>`.
2. Give it exactly one parent: `- serves_component: PL-001`.
3. State the files it creates or changes, its dependencies and the acceptance criteria it satisfies.
4. The **first** task written for a component must serve only that component. A task that touches two
   components is two tasks.

## Step 2 — Self-verify before submitting

Rows are `PL-###`, columns are `TK-###`.

- Every component has a task (A).
- Every task's `serves_component` names a component that exists (B).
- Every component has a task that serves only it (C).
- Tasks ≥ components.


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "tasks", "content": "<tasks.md>", "declaredCounts": { "tasks": 5, "components": 2 }, "priorArtifacts": { "plan": "<plan.md>" }}
```

## Step 4 — Handle the result

- `status: "PASS"` — the artifact satisfies A, B and C. Move on to `vdd-implement`.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- **A** every `PL-###` has at least one `TK-###`.
- **B** every `TK-###`'s `serves_component` names a component that exists.
- **C** every `PL-###` has a task no other component shares.
- Tasks ≥ components.
