# Traceability Matrix

The bi-directional traceability matrix (RTM) is the audit mechanism that proves the VDD chain is complete. It can be generated at any time with `/vdd:trace` and is automatically generated during Phase 8 (Validate).

---

## RTM Structure

### Full Chain

```
Vision (V-XXX) ──→ Strategy (S-XXX) ──→ Tactics (T-XXX) ──→ Spec (SP-XXX)
                                                                  ↓
Validate ←── Implementation ←── Tasks (TK-XXX) ←── Plan (PL-XXX)
```

### Matrix Format

```markdown
# Bi-Directional Traceability Matrix

Generated: [YYYY-MM-DD] | Command: /vdd:trace

## Forward Coverage (Parent → Children)

| Parent ID | Parent Artifact | Child IDs | All Covered? | Gaps |
|-----------|----------------|-----------|-------------|------|
| V-001 | vision.md | S-002 | Yes | — |
| S-002 | strategy.md | T-003 | Yes | — |
| T-003 | tactics.md | SP-004, SP-005 | Yes | — |
| SP-004 | spec.md (Feature A) | PL-006 | Yes | — |
| SP-005 | spec.md (Feature B) | PL-007 | Yes | — |
| PL-006 | plan.md (Feature A) | TK-008..TK-012 | Yes | — |
| PL-007 | plan.md (Feature B) | TK-013..TK-015 | Partial | TK-014 missing test task |
| TK-008..TK-015 | tasks.md | commits a1b2c3d..f9e8d7c | Yes | — |

## Backward Authorization (Child → Parent)

| Child ID | Child Artifact | Parent ID | Authorized? | Issue |
|----------|---------------|-----------|-------------|-------|
| S-002 | strategy.md | V-001 | Yes | — |
| T-003 | tactics.md | S-002 | Yes | — |
| SP-004 | spec.md (Feature A) | T-003, A-001 | Yes | — |
| SP-005 | spec.md (Feature B) | T-003, A-002 | Yes | — |
| PL-006 | plan.md (Feature A) | SP-004 | Yes | — |
| PL-007 | plan.md (Feature B) | SP-005 | Yes | — |
| TK-008 | tasks.md TASK-001 | PL-006 | Yes | — |
| commit a1b2c3d | feat(Feature A): TASK-008 | TK-008 | Yes | — |

## Orphan Detection

| Artifact ID | Artifact | Status | Action |
|-------------|----------|--------|--------|
| commit x9y8z7 | Unreferenced file change | ORPHAN | Remove or add task to cover it |
| (none found) | — | — | — |

## Uncovered Detection

| Parent ID | Parent Artifact | Status | Action |
|-----------|----------------|--------|--------|
| V-001 (impact I-003) | vision.md → Impact I-003 | UNCOVERED | No spec addresses this impact |
| (none found) | — | — | — |

## AC Coverage Matrix

| AC ID | Priority | Test File | Implementation File | Status |
|-------|----------|-----------|-------------------|--------|
| AC-1 | MUST | user.test.ts → test_createUser | user-repo.ts → createUser | PASS |
| AC-2 | MUST | user.test.ts → test_duplicate | user-repo.ts → createUser | PASS |
| AC-E1 | MUST | user.test.ts → test_invalidEmail | user-repo.ts → validateEmail | PASS |
| AC-3 | SHOULD | — | — | NOT IMPLEMENTED |

## S&T Assumption Status (All Gates)

| Gate | Assumption | Status | Evidence |
|------|-----------|--------|----------|
| G1 (V→S) | Necessity | VALID | Strategy research was required to identify viable approaches |
| G1 (V→S) | Achievability | VALID | All vision goals have implementation paths |
| G1 (V→S) | Sufficiency | VALID | Strategy covers all vision goals |
| G1 (V→S) | Warnings | MONITORED | 2/3 identified risks did not materialize; 1 monitored |
| ... | ... | ... | ... |

## Drift Detection Summary

| Type | Count | Details |
|------|-------|---------|
| Signature Drift | 0 | — |
| Schema Drift | 0 | — |
| Behavior Drift | 0 | — |
| Scope Drift | 1 | Extra endpoint /api/export not in spec SP-005 |
| Constitution Violation | 0 | — |
| Boundaries Violation | 0 | — |

## Release Readiness

**Status:** [GO / NO-GO / GO WITH CONDITIONS]

**Blockers:**
- (none / [list])

**Conditions:**
- [Condition 1]
```

---

## Automated RTM Generation

The `/vdd:trace` command reads all VDD artifacts and generates the matrix automatically.

### Algorithm

```
1. Walk vdd/ directory for all .md files
2. Extract Impact Chain headers from each file
3. Build parent → child map from chain headers
4. Build child → parent map (reverse of above)
5. Detect orphans: files modified in git that have no task coverage
6. Detect uncovered: parent artifacts with no children
7. Scan test files for AC references
8. Scan implementation files for contract references
9. Run drift checks (API signatures vs contracts, DB schema vs data-model)
10. Validate S&T assumptions from each gate's documentation
11. Output RTM markdown
```

### CI/CD Integration

```yaml
# .github/workflows/vdd-traceability.yml
name: VDD Traceability Check
on:
  push:
    branches: [main]
  pull_request:

jobs:
  traceability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Verify all artifacts have impact chains
        run: |
          errors=0
          for f in $(find vdd/ -name "*.md" -type f); do
            if echo "$f" | grep -q "domain-primers\|README\|decision_log\|research"; then
              continue  # Skip files that don't require impact chains
            fi
            if ! grep -q "^> Impact Chain:" "$f"; then
              echo "MISSING: $f has no Impact Chain header"
              errors=$((errors+1))
            fi
          done
          if [ $errors -gt 0 ]; then
            echo "FAIL: $errors files missing impact chain headers"
            exit 1
          fi

      - name: Detect broken chain references
        run: |
          # Extract all chain IDs
          chains=$(grep -rohP '^> Impact Chain:.*' vdd/ | sed 's/> Impact Chain: //')
          # Project-specific validation
          echo "[VERIFY] All chain references resolve to existing artifacts"

      - name: Check for orphaned files
        run: |
          # Files changed in this PR that don't appear in any task
          changed=$(git diff --name-only origin/main..HEAD -- src/)
          for f in $changed; do
            if ! grep -rq "$f" vdd/specs/*/tasks.md; then
              echo "ORPHAN: $f changed but not referenced in any tasks.md"
            fi
          done
```

---

## Traceability ID Format

| Level | Prefix | Example | Defined In |
|-------|--------|---------|-----------|
| Vision | V- | V-001 | vision.md header |
| Strategy | S- | S-002 | strategy.md header |
| Tactics | T- | T-003 | tactics.md header |
| Spec | SP- | SP-004 | spec.md header |
| Plan | PL- | PL-005 | plan.md header |
| Tasks | TK- | TK-006 | tasks.md header |
| Action Item | A- | A-001 | tactics.md action items table |
| Impact | I- | I-001 | vision.md impact model |
| Risk | R- | R-001 | strategy.md risk register |
| Acceptance Criterion | AC- | AC-1 | spec.md acceptance criteria |

---

## Quick Trace Query Patterns

| Question | How to Answer |
|----------|--------------|
| "Why does this code exist?" | Follow the chain upward: commit → task → plan → spec → tactics → strategy → vision |
| "Is every vision goal implemented?" | Forward coverage table — check every V-XXX has children |
| "What code changed outside specs?" | Orphan detection — files modified without task coverage |
| "Is any spec AC untested?" | AC Coverage Matrix — ACs with no test file |
| "Did we build the right thing?" | Impact Verification — compare built features against vision impact model |
| "What's blocking release?" | RTM → Release Readiness section |
