---
name: vdd-specs
description: Write spec.md covering every MUST action item — user stories, Always/Ask/Never boundaries, acceptance criteria, and the serves_action link. Use for VDD phase 4, submitting the whole specs set in one call.
---

# VDD: Specs (phase 4)

## Step 0 — Declare counts

Read `priorArtifacts.tactics` and list the **MUST** action ids — those are the parents, and every one of
them needs a spec in `content`. Only MUST actions are parents of the
specs phase: a SHOULD or COULD item is not required to have a spec, and a spec that serves one is an
orphan. Set `declaredCounts.specs` to the number of specs you are writing.

## Step 1 — Generate one spec per MUST action

`content` is the **whole specs set** — every `SP-###` block, in one string. The engine reads
`priorArtifacts.tactics` and reports an empty row for every MUST action no spec covers, so checking one
spec at a time fails on the second action.

1. Open the file with its own id in the title: `# SP-001: <feature name>`.
2. Give it exactly one parent: `- serves_action: A-001`.
3. Write the acceptance criteria as measurable statements — each one names the behaviour, the input and
   the observable outcome. Edge-case criteria (`AC-E*`) accompany every happy-path MUST criterion.

A spec serves one action. Two actions needing the same capability get two specs, each serving its own.

## Step 2 — Self-verify before submitting

Rows are MUST `A-###`, columns are `SP-###`.

- Every MUST action has a spec (A).
- Every spec's `serves_action` names a MUST action, not a SHOULD (B).
- Every MUST action has a spec that serves only it (C).


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "specs", "content": "<spec.md>", "declaredCounts": { "specs": 1 }, "priorArtifacts": { "tactics": "<tactics.md>" }}
```

## Step 4 — Handle the result

- `status: "PASS"` — the artifact satisfies A, B and C. Move on to `vdd-plan`.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

- **A** every MUST `A-###` has at least one `SP-###`.
- **B** every `SP-###`'s `serves_action` names an action that exists **and is MUST**.
- **C** every MUST action has a spec no other action shares.
- The declared spec count equals the number of `SP-###` blocks you wrote.
