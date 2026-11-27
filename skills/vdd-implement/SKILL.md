---
name: vdd-implement
description: Implement one task from tasks.md against its acceptance criteria, with a commit that names the chain. Use when a task is ready to build; this phase has no MCP tool and uses the host agent's own tools.
---

# VDD: Implement (phase 7)

## Step 0 — Pick the task, not the next idea

Read `tasks.md` and take the first task whose dependencies are all complete. Its `serves_component`
names the plan component, and through it the spec, the action, the pillar and the goal.

## Step 1 — Implement against the acceptance criteria

Write the code the task describes and the tests its acceptance criteria require. The criterion is the
contract: if the implementation needs a different behaviour, the spec changes first — through
`vdd_amend` — and the task follows.

## Step 2 — Commit with the chain in the message

```
feat(<scope>): TK-001 serve PL-001

V-001 → S-001 → A-001 → SP-001 → PL-001 → TK-001
```

## Step 3 — There is no tool for this phase

2.0.0 ships no implementation tool: the host agent's own file, shell and test tools do the work. Do not
look for a `vdd_implement` — it was removed in 2.0.0, and `docs/migration-2.0.md` records what replaced
it and why.

## Gate criteria

- The task's tests pass, and each acceptance criterion it claims has a test that would fail without
  the change.
- The commit message names the task id and the chain.
- No file outside the task's stated scope changed without the task saying so.
