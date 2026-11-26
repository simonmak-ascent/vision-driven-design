# Compliance Evidence Templates

> Impact Chain: V-001 → S-001 → A-001 → SP-001

Templates enabling VDD adopters to produce DO-178C, CMMI, IEC 62304, and ISO 29148 audit evidence directly from VDD artifacts. VDD's bidirectional traceability chain already generates the evidence — these templates show auditors where to find it.

## DO-178C (Airborne Software) Evidence Map

| DO-178C Objective | VDD Artifact | Evidence Location |
|------------------|-------------|-------------------|
| High-level requirements traceable to system requirements | `vdd/specs/[feature]/spec.md` | Impact Chain: V-XXX → S-XXX → A-XXX → SP-XXX |
| Low-level requirements derived from high-level | `vdd/specs/[feature]/plan.md` | AC Coverage Map: every AC → component |
| Source code traceable to low-level requirements | Commit history | `feat(scope): TK-XXX → AC-ID → A-YYY` |
| Test cases verify requirements | `vdd/specs/[feature]/tasks.md` | Test-first ordering; Satisfies Declaration |
| Test results linked to requirements | `tasks.md` + the chain result | AC → test → implementation, checked by the plan and tasks artifacts |
| MC/DC coverage for DAL A/B | `domain-primers/safety-critical.md` | Safety checklist; RPN register |
| Configuration management | `constitution.md` + git history | Immutable constitution; every commit traces to task |

### Evidence Generation Command
```bash
# Generate DO-178C compliance bundle from VDD artifacts
vdd chain …    # produces the full-chain matrix and the goal→task path check
vdd_chain_validate      # produces bidirectional traceability matrix
```

## IEC 62304 (Medical Device Software) Evidence Map

| IEC 62304 Clause | VDD Artifact | Evidence Location |
|-----------------|-------------|-------------------|
| Software development planning | `constitution.md` + `vdd/plan.md` | Phase 0 + Phase 5 |
| Software requirements with risk controls | `vdd/specs/[feature]/spec.md` | `[SAFETY]` ACs; error ACs (AC-E*) |
| Architecture with safety mechanisms | `vdd/specs/[feature]/plan.md` | Safety architecture: redundancy, isolation |
| Software unit verification | Per-task commits + the goal→task path check | Tests pass; signatures match; scope check |
| Software integration testing | the chain result | User-story walkthrough recorded in the spec's acceptance criteria |
| Software system testing | `vdd/impact-report.md` + the chain result | Full-chain traceability; the chain check confirms every goal reaches a task |
| Risk management throughout lifecycle | Full VDD chain | Every phase passes invariants A, B and C |

## CMMI REQM SP 1.4 (Bidirectional Traceability) Evidence Map

| CMMI Practice | VDD Artifact | Evidence Location |
|--------------|-------------|-------------------|
| Maintain bidirectional traceability | All VDD artifacts | Impact Chain headers: V→S→A→SP→PL→TK |
| Identify inconsistencies | `vdd_chain_validate` output | Cross-artifact consistency analysis |
| Track requirement status | `vdd/specs/[feature]/spec.md` | AC status: [MUST], [SHOULD], [COULD], [WONT] |

## ISO/IEC/IEEE 29148 Evidence Map

| ISO 29148 Criteria | VDD Artifact | Evidence Location |
|-------------------|-------------|-------------------|
| Each requirement singular and verifiable | `vdd/specs/[feature]/spec.md` | Given/When/Then ACs |
| Requirements traceable to stakeholders | `vdd/vision.md` | I-XXX impacts → actors → stakeholder roles |
| Requirements prioritized (MoSCoW) | `vdd/specs/[feature]/spec.md` | MoSCoW labels |
| Requirements validated and verified | `vdd/impact-report.md` | The agent's verification section, checked by the chain result |

## Audit Bundle

The chain result returned by `vdd_chain_validate` is the machine-checked evidence. The audit report the agent writes beside it consolidates:

```
vdd/
  impact-report.md                   ← Master: all evidence consolidated
    ├── AC Coverage Matrix            ← DO-178C §6.4.3, IEC 62304 §5.7
    ├── Bidirectional Traceability    ← CMMI REQM SP 1.4
    ├── Goal → task path check        ← ISO 29148 §8.4
    ├── Coverage invariants (A–C) and per-key counts  ← All standards
    ├── Safety coverage per criterion ← DO-178C Annex A, IEC 62304 Annex C
    └── Impact Verification           ← ISO 29148 §9.4
```

## Auditor Quick Reference

| Auditor Asks | VDD Answers With |
|-------------|-----------------|
| "Show me traceability from requirements to code" | Impact Chain headers + `vdd_chain_validate` output |
| "Prove every requirement was tested" | AC Coverage table in impact-report.md |
| "How do you handle requirement changes?" | `vdd_amend` — cascading change log |
| "Where are your risk controls?" | `[SAFETY]` ACs + safety checklist |
| "How do you know the code matches the spec?" | The task→goal path check in `vdd_chain_validate` |
| "What's your peer review process?" | Critic agents (Phase 4–6) + PR review (Phase 7) + human sign-off (gated mode) |
| "How do you manage configuration?" | `constitution.md` (immutable rules) + git (versioned artifacts) |
