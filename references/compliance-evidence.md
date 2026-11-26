# Compliance Evidence Templates

> Impact Chain: V-001 → S-001 → A-001 → SP-001

Templates enabling VDD adopters to produce DO-178C, CMMI, IEC 62304, and ISO 29148 audit evidence directly from VDD artifacts. VDD's bidirectional traceability chain already generates the evidence — these templates show auditors where to find it.

## DO-178C (Airborne Software) Evidence Map

| DO-178C Objective | VDD Artifact | Evidence Location |
|------------------|-------------|-------------------|
| High-level requirements traceable to system requirements | `vdd/specs/[feature]/spec.md` | Impact Chain: V-XXX → S-XXX → A-XXX → SP-XXX |
| Low-level requirements derived from high-level | `vdd/specs/[feature]/plan.md` | AC Coverage Map: every AC → component |
| Source code traceable to low-level requirements | Commit history | `feat(scope): TASK-XXX → AC-ID → Tactical-ID` |
| Test cases verify requirements | `vdd/specs/[feature]/tasks.md` | Test-first ordering; Satisfies Declaration |
| Test results linked to requirements | `vdd/impact-report.md` | AC Coverage table: AC → test → impl → pass/fail |
| MC/DC coverage for DAL A/B | `domain-primers/safety-critical.md` | Safety gate checklist; RPN register |
| Configuration management | `constitution.md` + git history | Immutable constitution; every commit traces to task |

### Evidence Generation Command
```bash
# Generate DO-178C compliance bundle from VDD artifacts
/vdd:validate   # produces impact-report.md with full AC coverage matrix
/vdd:trace      # produces bidirectional traceability matrix
```

## IEC 62304 (Medical Device Software) Evidence Map

| IEC 62304 Clause | VDD Artifact | Evidence Location |
|-----------------|-------------|-------------------|
| Software development planning | `constitution.md` + `vdd/plan.md` | Phase 0 + Phase 5 |
| Software requirements with risk controls | `vdd/specs/[feature]/spec.md` | `[SAFETY]` ACs; error ACs (AC-E*) |
| Architecture with safety mechanisms | `vdd/specs/[feature]/plan.md` | Safety architecture: redundancy, isolation |
| Software unit verification | Per-task commits + Gate G6 | Tests pass; signatures match; scope check |
| Software integration testing | `vdd/impact-report.md` | User story walkthrough (G7 F7.6) |
| Software system testing | `vdd/impact-report.md` | Full-chain traceability + drift detection |
| Risk management throughout lifecycle | Full VDD chain | Every phase passes bidirectional gate with 4 S&T assumptions |

## CMMI REQM SP 1.4 (Bidirectional Traceability) Evidence Map

| CMMI Practice | VDD Artifact | Evidence Location |
|--------------|-------------|-------------------|
| Maintain bidirectional traceability | All VDD artifacts | Impact Chain headers: V→S→T→SP→PL→TK |
| Identify inconsistencies | `/vdd:analyze` output | Cross-artifact consistency analysis |
| Track requirement status | `vdd/specs/[feature]/spec.md` | AC status: [MUST], [SHOULD], [COULD], [WONT] |

## ISO/IEC/IEEE 29148 Evidence Map

| ISO 29148 Criteria | VDD Artifact | Evidence Location |
|-------------------|-------------|-------------------|
| Each requirement singular and verifiable | `vdd/specs/[feature]/spec.md` | Given/When/Then ACs |
| Requirements traceable to stakeholders | `vdd/vision.md` | I-XXX impacts → actors → stakeholder roles |
| Requirements prioritized (MoSCoW) | `vdd/specs/[feature]/spec.md` | MoSCoW labels |
| Requirements validated and verified | `vdd/impact-report.md` | Impact Verification section |

## Auto-Generated Audit Bundle

The `vdd/impact-report.md` produced by `/vdd:validate` serves as the master evidence document:

```
vdd/
  impact-report.md                   ← Master: all evidence consolidated
    ├── AC Coverage Matrix            ← DO-178C §6.4.3, IEC 62304 §5.7
    ├── Bidirectional Traceability    ← CMMI REQM SP 1.4
    ├── Drift Detection Report        ← ISO 29148 §8.4
    ├── Gate Results (G1–G7)          ← All standards
    ├── Safety Coverage Matrix        ← DO-178C Annex A, IEC 62304 Annex C
    └── Impact Verification           ← ISO 29148 §9.4
```

## Auditor Quick Reference

| Auditor Asks | VDD Answers With |
|-------------|-----------------|
| "Show me traceability from requirements to code" | Impact Chain headers + `/vdd:trace` output |
| "Prove every requirement was tested" | AC Coverage table in impact-report.md |
| "How do you handle requirement changes?" | `/vdd:amend` — cascading change log |
| "Where are your risk controls?" | `[SAFETY]` ACs + safety gate checklist |
| "How do you know the code matches the spec?" | Gate G6 bidirectional check (commit→task→AC) |
| "What's your peer review process?" | Critic agents (Phase 4–6) + PR review (Phase 7) + human sign-off (gated mode) |
| "How do you manage configuration?" | `constitution.md` (immutable rules) + git (versioned artifacts) |
