---
name: vdd-plan
description: Write plan.md for a spec — components that each serve the spec, one dedicated component per spec, plus the data model and the interface contracts. Use for VDD phase 5.
---

# VDD: Plan (phase 5)

## Step 0 — Declare counts

Read `priorArtifacts.specs` and list every `SP-###`. Set `declaredCounts.components` to the number of
components you will write, and `declaredCounts.specs` to the number of specs you read.

## Step 1 — Generate one component per spec, in ascending order

1. Open the component with its id on its own line: `### PL-001: <name>`.
2. Give it exactly one parent: `- serves_spec: SP-001`.
3. State what it accepts, what it returns and which acceptance criteria it covers.
4. Write `data-model.md` and `contracts/` beside it. Those are views of a plan component: they carry no
   `serves_*` field of their own and are linked from the component that owns them.

## Step 2 — Self-verify before submitting

Rows are `SP-###`, columns are `PL-###`.

- Every spec has a component (A).
- Every component's `serves_spec` names a spec that exists (B).
- Every spec has a component that serves only it (C).
- Components ≥ specs.


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "plan", "content": "<plan.md>", "declaredCounts": { "components": 2, "specs": 1 }, "priorArtifacts": { "specs": "<spec.md>" }}
```

## Step 4 — Handle the result

- `status: "PASS"` — the artifact satisfies A, B and C. Move on to `vdd-tasks`.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- **A** every `SP-###` has at least one `PL-###`.
- **B** every `PL-###`'s `serves_spec` names a spec that exists.
- **C** every `SP-###` has a component no other spec shares.
- Components ≥ specs.
