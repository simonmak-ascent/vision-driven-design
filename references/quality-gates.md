# Quality Gates

Seven bi-directional gates — one between each phase pair. Each gate has forward (parent → children) and backward (children → parent) verification, plus 4 S&T assumption validations.

In full-auto mode, AI self-gates all checks and only halts for human intervention if a gate fails self-repair. In gated mode, human approval is required before proceeding past each gate.

---

## Gate 0 — constitution.md Approval

*Run once per project before any vision work.*

| # | Check | Pass Criteria |
|---|-------|--------------|
| 0.1 | Stack coverage | All languages, frameworks, databases listed with locked versions |
| 0.2 | Security constraints | At least 5 explicit, verifiable security rules |
| 0.3 | Banned patterns | Specific and enforceable (not "write good code") |
| 0.4 | File structure | Documented and matches actual project layout |
| 0.5 | Domain declaration | Domain primitives section populated — at least 1 domain declared |
| 0.6 | No blocking [PENDING] | All blocking items resolved; remaining have target dates |

**Fail action:** Complete the constitution before creating any vision.

---

## Gate 1 — Vision → Strategy

*Run after vdd/strategy.md generated, before proceeding to Tactics.*

### Forward Verification (Vision → Strategy)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F1.1 | Goal coverage | Every vision goal has >= 1 strategy pillar addressing it |
| F1.2 | Impact coverage | Every vision impact has a strategic approach documented |
| F1.3 | Stakeholder coverage | Every stakeholder role has a strategic consideration |
| F1.4 | Metric coverage | Every success metric has a strategic mechanism to measure it |
| F1.5 | Domain coverage | Every declared target domain has research coverage |

### Backward Verification (Strategy → Vision)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B1.1 | Pillar authorization | Every strategy pillar traces to >= 1 vision goal |
| B1.2 | Research relevance | Every research finding serves a vision purpose |
| B1.3 | Risk relevance | Every risk in the register threatens a vision goal |
| B1.4 | No scope invention | Nothing in strategy invents scope not in vision |
| B1.5 | Feasibility honesty | Feasibility assessment does not inflate or misrepresent |

### S&T Assumptions (V→S)

| # | Assumption | Validation |
|---|-----------|-----------|
| A1.1 | Necessity | Strategy research was necessary to bridge vision to actionable approach |
| A1.2 | Achievability | Vision is achievable given the researched strategic approach |
| A1.3 | Sufficiency | Strategy pillars collectively cover all vision goals |
| A1.4 | Warnings | Documented risks and mitigations are realistic |

**Fail action:** Return to Phase 2 for the failing check. Do not proceed to Tactics.
**Self-heal:** AI re-runs specific research subagent for the failing area, then regenerates the affected strategy section.

---

## Gate 2 — Strategy → Tactics

*Run after vdd/tactics.md generated, before proceeding to Specs.*

### Forward Verification (Strategy → Tactics)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F2.1 | Pillar coverage | Every strategy pillar has >= 1 [MUST] tactical action item |
| F2.2 | Gap coverage | Every gap identified in audit has a corresponding action item |
| F2.3 | Risk mitigation | Every High-impact strategy risk has a tactical mitigation item |
| F2.4 | Dependency validity | Dependency map is a valid DAG (no cycles) |

### Backward Verification (Tactics → Strategy)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B2.1 | Action item authorization | Every action item traces to >= 1 strategy pillar |
| B2.2 | No gold-plating | Every action item serves a strategy purpose |
| B2.3 | No scope invention | No action item invents work outside strategy scope |
| B2.4 | Infrastructure relevance | Every infrastructure requirement serves a strategy pillar |
| B2.5 | Audit accuracy | Codebase audit findings are evidenced in repository files |

### S&T Assumptions (S→T)

| # | Assumption | Validation |
|---|-----------|-----------|
| A2.1 | Necessity | Tactical action-item breakdown was necessary to execute the strategy |
| A2.2 | Achievability | Strategy is achievable given the planned tactical items |
| A2.3 | Sufficiency | Tactical items collectively cover all strategy pillars |
| A2.4 | Warnings | Dependency risks and ordering constraints are realistic |

**Fail action:** Return to Phase 3 for the failing check. Do not proceed to Specs.
**Self-heal:** AI re-runs gap analysis or repo audit for the failing area.

---

## Gate 3 — Tactics → Specs

*Run after each spec.md generated, before proceeding to Plan.*

### Forward Verification (Tactics → Specs)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F3.1 | MUST coverage | Every [MUST] tactical action item has a spec.md |
| F3.2 | Scope coverage | Spec ACs collectively cover the action item's described scope |
| F3.3 | Impact trace | Spec's Impact Verification section references correct vision metrics |
| F3.4 | Testability | Every [MUST] AC can have an automated test written for it |
| F3.5 | Implementation-free | No technology names, function names, or database terms in spec |
| F3.6 | Error coverage | Error/edge case ACs exist for every happy-path [MUST] AC |
| F3.7 | MoSCoW labels | Every AC has a [MUST]/[SHOULD]/[COULD]/[WONT] label |
| F3.8 | No vague terms | No "fast", "secure", "works correctly" without measurable thresholds |
| F3.9 | Clarification resolved | All [NEEDS CLARIFICATION] items resolved |
| F3.10 | Non-functional requirements | Performance, security, and accessibility requirements stated with specific values |

### Backward Verification (Specs → Tactics)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B3.1 | Tactical origin | Every spec has an explicit Tactical Origin reference |
| B3.2 | No scope invention | Nothing in spec invents scope not in its tactical action item |
| B3.3 | Action item coverage | Every AC traces to the tactical action item's scope |
| B3.4 | Cross-spec consistency | No spec conflicts with another active spec (endpoint, entity, behavior) |

### S&T Assumptions (T→SP)

| # | Assumption | Validation |
|---|-----------|-----------|
| A3.1 | Necessity | Spec-level requirements were necessary to define what to build |
| A3.2 | Achievability | Tactical items are achievable given the planned specs |
| A3.3 | Sufficiency | Spec ACs are sufficient to implement the tactical item |
| A3.4 | Warnings | Edge cases and error scenarios are adequately covered |

**Fail action:** Return to Phase 4 for the failing check. Do not proceed to Plan.
**Self-heal:** AI runs clarify pass, adds missing ACs, or splits oversized action items.

---

## Gate 4 — Specs → Plan

*Run after plan.md + contracts/ generated, before proceeding to Tasks.*

### Forward Verification (Specs → Plan)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F4.1 | AC traceability | Every [MUST] AC maps to >= 1 component in plan.md |
| F4.2 | Contract completeness | Every component exposing an API has a contract file |
| F4.3 | Error code coverage | Contracts define all error responses (not just 200) |
| F4.4 | Data model completeness | All entities from spec appear in data-model.md |
| F4.5 | Migration defined | Schema changes have migration blocks with rollback |
| F4.6 | Index justification | Indexes justified by specific query patterns |
| F4.7 | Risks identified | Risks table present; every High-impact risk has a mitigation |

### Backward Verification (Plan → Specs)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B4.1 | Component authorization | Every component traces to >= 1 AC |
| B4.2 | Contract authorization | Every contract endpoint traces to >= 1 AC |
| B4.3 | Entity authorization | Every entity in data-model.md references a spec requirement |
| B4.4 | Constitution compliance | Plan uses only stack items in constitution.md; no banned patterns |
| B4.5 | No over-engineering | No abstractions that could be replaced with direct framework usage |
| B4.6 | Technology fit | Technology choices use existing stack unless justified |

### S&T Assumptions (SP→PL)

| # | Assumption | Validation |
|---|-----------|-----------|
| A4.1 | Necessity | Technical plan was necessary to translate specs into architecture |
| A4.2 | Achievability | Specs are achievable with the planned architecture |
| A4.3 | Sufficiency | Plan components collectively satisfy all spec ACs |
| A4.4 | Warnings | Technical risks are identified and mitigated |

**Fail action:** Return to Phase 5 for the failing check. Do not proceed to Tasks.
**Self-heal:** AI regenerates affected plan sections or adds missing contracts.

---

## Gate 5 — Plan → Tasks

*Run after tasks.md generated, before proceeding to Implementation.*

### Forward Verification (Plan → Tasks)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F5.1 | Component coverage | Every plan component has >= 1 task |
| F5.2 | Contract coverage | Every contract endpoint has implementation task coverage |
| F5.3 | Entity coverage | Every data model entity has migration + repository tasks |
| F5.4 | AC references | Test tasks cite specific ACs from spec.md |
| F5.5 | Contract references | Implementation tasks cite specific contracts/ files |
| F5.6 | Satisfies declaration | Implementation tasks explicitly declare which ACs they satisfy |

### Backward Verification (Tasks → Plan)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B5.1 | Task authorization | Every task references a plan component or contract |
| B5.2 | Test-first order | Every implementation task has a preceding test task |
| B5.3 | Task size | No task touches > 3 files or estimated at L without justification |
| B5.4 | Dependency validity | Task dependencies form a valid DAG (no cycles) |
| B5.5 | Parallelism accuracy | [P] tasks have no shared write dependencies |
| B5.6 | No scope invention | No task invents work outside the plan |

### S&T Assumptions (PL→TK)

| # | Assumption | Validation |
|---|-----------|-----------|
| A5.1 | Necessity | Task breakdown was necessary to execute the plan |
| A5.2 | Achievability | Plan is achievable with the given task decomposition |
| A5.3 | Sufficiency | Tasks collectively implement all plan components |
| A5.4 | Warnings | Task ordering risks and parallelism risks are documented |

**Fail action:** Fix tasks.md. Do not begin implementation.
**Self-heal:** AI splits oversized tasks, re-orders test-first, resolves dependency cycles.

---

## Gate 6 — Tasks → Implementation

*Run per-task, before marking task complete and committing.*

### Forward Verification (Task → Implementation)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F6.1 | Tests pass | All new tests pass; no existing tests regressed |
| F6.2 | Task complete | Code covers the task's stated scope |
| F6.3 | AC satisfaction | Task's referenced ACs are satisfied by the code |
| F6.4 | Task marked | Task marked `[x]` in tasks.md |

### Backward Verification (Implementation → Task)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B6.1 | Scope adherence | No files modified outside the task's stated scope |
| B6.2 | Signature match | Implemented API signatures match contracts/ exactly |
| B6.3 | Schema match | Database schema matches data-model.md |
| B6.4 | Commit format | Commit message includes task ID and traceability |
| B6.5 | No silent failures | Error cases are handled, not swallowed |
| B6.6 | Constitution check | No banned patterns introduced; security constraints respected |
| B6.7 | Boundaries check | Spec's Boundaries rules followed (Always do / Never do) |

### S&T Assumptions (TK→IM)

| # | Assumption | Validation |
|---|-----------|-----------|
| A6.1 | Necessity | Implementation was necessary to complete the task |
| A6.2 | Achievability | Task was achievable within estimated size |
| A6.3 | Sufficiency | Implementation is sufficient to satisfy the task's requirements |
| A6.4 | Warnings | Implementation risks were managed; no unexpected side effects |

**Fail action:** Fix before committing. Do not mark task complete.
**Self-heal:** AI corrects the implementation to match contracts and spec.

---

## Gate 7 — Implementation → Validation

*Run after all tasks complete, before considering the feature done.*

### Forward Verification (Implementation → Validation)

| # | Check | Pass Criteria |
|---|-------|--------------|
| F7.1 | Full AC coverage | Every [MUST] AC has test coverage AND passing tests |
| F7.2 | Traceability matrix | Full chain traceable: Vision → Code (every level) |
| F7.3 | Contract audit | All contract error codes have implementation and tests |
| F7.4 | Impact instrumentation | Success metrics have measurement mechanisms deployed |
| F7.5 | Drift report | Zero drift items found (spec vs. implementation) |
| F7.6 | User story walkthrough | Each user story from spec.md verified in the running application |

### Backward Verification (Validation → Implementation → Vision)

| # | Check | Pass Criteria |
|---|-------|--------------|
| B7.1 | Full chain authorization | Every code artifact traces back to a vision goal |
| B7.2 | No orphans | No code without an authorized upstream parent |
| B7.3 | No uncovered vision | No vision goal with zero implementation |
| B7.4 | Constitution audit | No constitution violations detected in new code |
| B7.5 | Impact verification | Built product's behavior aligns with vision's impact model |

### S&T Assumptions (IM→VS) — Full Chain

| # | Assumption | Validation |
|---|-----------|-----------|
| A7.1 | Necessity | Each level in the chain was necessary to reach the level above |
| A7.2 | Achievability | The vision was achievable given the full implementation |
| A7.3 | Sufficiency | The implementation is sufficient to create the intended impact |
| A7.4 | Warnings | All documented warnings were monitored; any that materialized were handled |

**Fail action:** Fix drift, add missing coverage, or run `/vdd:amend` before merge.
**Self-heal:** AI generates the remaining work items to close gaps.

---

## Substance Enforcement

Every gate includes a substance check. Cosmetic-only contributions fail the gate regardless of traceability coverage.

| Gate | Substance Check | Fail Condition |
|------|----------------|---------------|
| G1 (V→S) | Every strategy pillar cites ≥1 research finding | Pillar with no citation = rejected |
| G2 (S→T) | Every [MUST] action item describes a concrete behavior change | "Improve UX" without measurable target = rejected |
| G3 (T→SP) | Every spec has ≥1 [MUST] AC that changes observable behavior | Spec with zero MUST ACs = rejected |
| G4 (SP→PL) | Every plan component describes a specific technical decision | "Add component" with no design detail = rejected |
| G5 (PL→TK) | Every task description is concrete enough for a fresh AI context to execute | Task that says "Fix things" = rejected |
| G6 (TK→IM) | Every commit changes behavior, not just comments or formatting | Comment-only or whitespace-only commit = rejected |
| G7 (IM→VS) | Full chain substance audit — no phase produced purely ceremonial output | Any artifact flagged as "no substance" by G1-G6 = chain tainted |

## Gate Summary Table

| Gate | Junction | Forward Checks | Backward Checks | S&T Assumptions |
|------|----------|---------------|-----------------|-----------------|
| G0 | (pre-chain) | — | — | — |
| G1 | Vision → Strategy | 5 | 5 | 4 |
| G2 | Strategy → Tactics | 4 | 5 | 4 |
| G3 | Tactics → Specs | 10 | 4 | 4 |
| G4 | Specs → Plan | 7 | 6 | 4 |
| G5 | Plan → Tasks | 6 | 6 | 4 |
| G6 | Tasks → Implement | 4 | 7 | 4 |
| G7 | Implement → Validate | 6 | 5 | 4 |

**Total checks across all gates: 108** (42 forward + 38 backward + 28 S&T assumptions)

---

## Confidence-Based Review Thresholds

| Confidence | Conditions | Gate Behavior (Full-Auto Mode) |
|-----------|------------|-------------------------------|
| **High (>90%)** | All checks pass with no warnings. Simple CRUD, no auth changes, no schema changes. | Auto-pass. Skip human review. |
| **Medium (70-90%)** | Most checks pass. Minor warnings. Cross-service integration, new API, UI component. | Auto-pass with warnings logged. |
| **Low (<70%)** | Multiple checks fail or have warnings. Auth logic, schema migration, external API. | Halt for human review before proceeding. |
| **Critical** | Payment flows, auth core, data encryption. Any High-impact risk with no mitigation. | Mandatory halt. Human required. |

---

## CI/CD Integration

```yaml
# .github/workflows/vdd-gates.yml
name: VDD Gate Validation
on:
  pull_request:
    paths:
      - 'vdd/**'
      - 'src/**'

jobs:
  trace-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Verify impact chain headers
        run: |
          for file in $(find vdd/ -name '*.md' -type f); do
            if ! grep -q "Impact Chain:" "$file"; then
              echo "FAIL: $file missing Impact Chain header"
              exit 1
            fi
          done

      - name: Detect orphans
        run: |
          # List all referenced IDs
          refs=$(grep -rohP 'Impact Chain:.*' vdd/ | grep -oP '[VS][TSP]-?\d+' | sort -u)
          for ref in $refs; do
            if ! grep -rq "$ref" vdd/; then
              echo "WARN: $ref referenced but not found as artifact header"
            fi
          done

      - name: Check Gates G6-G7 (requires code)
        if: contains(github.event.pull_request.changed_files, 'src/')
        run: |
          # Verify task IDs referenced in commit messages
          # PROJECT-SPECIFIC: implement based on your task tracking
          echo "[PROJECT-SPECIFIC] Implement commit-to-task traceability check"

      - name: Drift detection (AC to test coverage)
        run: |
          # Verify every AC from spec.md appears in a test file
          # PROJECT-SPECIFIC: implement based on your test framework
          echo "[PROJECT-SPECIFIC] Implement AC-to-test coverage check"
```
