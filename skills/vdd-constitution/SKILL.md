---
name: vdd-constitution
description: Write constitution.md — the immutable stack, conventions, security constraints and banned patterns every later VDD phase obeys. Use when starting a project with VDD, before any vision work.
---

# VDD: Constitution (phase 0)

## Step 0 — Declare nothing yet

There is no prior artifact and no parent. Read the repository: manifests, lockfiles, existing
directories, test runner, linter configuration. The constitution records what is already true or
deliberately chosen, never an aspiration.

## Step 1 — Write the template's sections

The constitution template in `references/artifact-templates.md` has eight sections; reproduce them, in
its order and with its headings:

`Architecture Principles` · `Technology Stack` · `Security Constraints` · `Naming Conventions` ·
`Banned Patterns` · `File Structure Rules` · `Domain Primitives` · `Open Questions / Deferred Decisions`

`Open Questions / Deferred Decisions` is how an undecided question stays visible instead of becoming an
invented answer: write the question, who decides it, and what it blocks. An empty section there is a
claim that nothing is undecided.

## Step 2 — Self-verify before submitting

Count the eight sections. Read every convention and ask whether a new contributor could comply with it
or whether it is a preference; rewrite the preferences as rules or delete them.


## Step 3 — Submit

Call `vdd_check` once. It is the only tool this phase needs:

```json
{"phase": "constitution", "content": "<constitution.md>"}
```

## Step 4 — Handle the result

- `status: "PASS"` — nothing was verified: 2.0.0 runs no automated constitution check (see Gate
  criteria). A human reads the result before `vdd-vision` starts; the PASS is not a certificate.
- `status: "FAIL"` — read `coverage.matrix`. An empty row is a parent with no child; a child missing
  from every row is an orphan; `reasons` names each one in the order to fix them. Regenerate and
  resubmit, at most three times. After the third failure, show `reasons` to the human and stop.

## Gate criteria

**2.0.0 checks no constitution content.** `vdd_check` with `phase: "constitution"` returns PASS
with an empty matrix, because the six content checks the old engine ran are not part of the coverage
invariants. The eight names, the `[PENDING]` discipline in `Open Questions / Deferred Decisions` and the banned-pattern list are yours to check
here, and a human should read the result before any later phase starts.
