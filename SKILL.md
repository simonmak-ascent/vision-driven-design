# Skill: vision-driven-design

# Vision Driven Design

## Overview

VDD makes **vision the source of all traceability**. Instead of starting at the spec level
and hoping the resulting code advances the business impact, VDD starts with a human's
broad vision statement and drives the entire chain — research, strategy, repository audit,
specification, planning, implementation, and validation — through AI agents with
bi-directional verification at every junction.

Core principle: *"Every line of code must be able to answer two questions: 'What vision
goal do I serve?' and 'Why am I necessary to achieve it?'"*

VDD extends and absorbs Spec-Driven Development (SDD). SDD's `Specs → Plan → Tasks →
Implement → Validate` chain is preserved and enhanced, but VDD adds three upstream phases
(Vision, Strategy, Tactics) that ground every spec in measurable real-world impact.
The combined 8-phase chain is governed by Goldratt's recursive Strategy-Tactic
decomposition: every phase's Tactic is the next phase's Strategy, creating a natural
recursive chain with built-in bidirectional verification.

### Spec Levels

VDD inherits SDD's three spec posture levels, extended to apply at every chain level:

| Level | What it means | Best for |
|-------|--------------|---------|
| **Spec-first** | Write spec upfront, implement immediately | Most features with clear requirements |
| **Strategy-first** | Research strategy upfront, then derive specs | New domains, uncertain markets |
| **Vision-first** | Define vision upfront, then research+spec | New products, major pivots |
| **Spec-anchored** | Maintain artifact alongside code as it evolves | Long-lived features |
| **Spec-as-source** | Artifact is primary; code is generated, never hand-edited | High-compliance, safety-critical |

Start with vision-first for new products. Use spec-first for features within an established vision.

### The Bi-Directional Difference

Traditional SDD verifies forward (does the code match the spec?). VDD verifies in both
directions at every level:

| Direction | Question | Detects |
|-----------|----------|---------|
| **Forward** (parent → children) | "Does every parent goal have children that collectively cover it?" | Uncovered goals, incomplete decomposition |
| **Backward** (children → parent) | "Does every child artifact trace back to an authorized parent?" | Scope creep, gold-plating, orphan code |

Without backward verification: code ships that nobody asked for.
Without forward verification: vision goals ship with no implementation.

---

## Quick Start

1. **Write the vision.** The `vdd-vision` skill walks the v18 framework — v16 as amended by v17 and
   v18: observations with locators, problems, objectives with metrics and an instrument, the 5Ws, the
   possibility space, the decision — then the chain projection that gives each objective a `V-###` id.
2. **Check it.** `vdd_check` with `{phase: "vision", content}` returns PASS or FAIL and the matrix.
   A FAIL names the line or id to fix; the check validates the chain projection and the declared goal
   count, and the skill says what to write.
3. **Continue with the next skill** — `vdd-strategy`, `vdd-tactics`, `vdd-specs`, `vdd-plan`,
   `vdd-tasks` — passing the artifact you just wrote as `priorArtifacts`, until `vdd-tasks` passes.
4. **Implement** with `vdd-implement`: the host agent's own tools, one commit per task, the chain in
   the message.
5. **Validate** the whole chain with `vdd_chain_validate`: every phase's invariants, plus every goal
   reaching a task.

Nothing in steps 1–5 writes a file on your behalf. The agent owns every edit; the tools judge.

## When to Use

### Use VDD when:
- Starting a new product or major feature from a vision/impact goal
- You want AI to fully autonomously drive development from vision to code
- The project touches webapp, data storage, ETL, or infrastructure domains
- You need auditable traceability from business goals to shipped code
- Previous "just build it" attempts produced features that didn't advance impact
- You need to onboard new team members to WHY the code exists (not just WHAT it does)

### Skip VDD for:
- Bug fixes under 30 minutes
- Configuration changes or typo fixes
- Throwaway prototypes where requirements will immediately change
- Changes unrelated to any vision goal

### Key Practice: Reframe Vague Requirements

Before writing any AC, convert vague requirements into measurable targets:

| Vague | Concrete |
|-------|---------|
| "make it faster" | "LCP < 2.5s on a 4G connection" |
| "it should be secure" | "requires authenticated session; all inputs validated before processing" |
| "handle errors properly" | "returns 4xx with structured error code, never exposes stack traces" |
| "should scale" | "handles 1000 concurrent users at < 500ms p95" |
| "works correctly" | "Given X, When Y, Then Z — independently verifiable" |
| "good UX" | "WCAG 2.2 AA compliant; task completion rate > 80%" |

If you cannot write a passing test for an AC, the AC is not concrete enough.
This applies at every level: vision metrics must be measurable, strategy pillars
must be verifiable, tactical items must be actionable, and ACs must be testable.

---

## The 8-Phase Chain

```
                     Bi-Directional Traceability Matrix
┌────────────────────────────────────────────────────────────────────────────┐
│                                                                            │
│  Vision ←──→ Strategy ←──→ Tactics ←──→ Specs ←──→ Plan ←──→ Tasks ←──→ Implement ←──→ Validate  │
│    │           │            │          │        │         │           │            │       │
│  vision.md  strategy.md  tactics.md  spec.md  plan.md  tasks.md    code    chain result   │
│  (human      (research    (repo       (SDD     (SDD     (SDD        (SDD        (full-chain    │
│   input)     + domain     audit)      absorb)  absorb)  absorb)     absorb)     chain result)  │
│              primers)                                                            │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Phase Summary

| # | Phase | Human Role | AI Role |
|---|-------|-----------|---------|
| 0 | Constitution | Provide tech stack, conventions | Generate immutable project rules |
| 1 | Vision | Write 1-3 paragraph impact statement | Expand into structured vision.md |
| 2 | Strategy | (optional: redirect) | Spawn 5 parallel research subagents, synthesize findings |
| 3 | Tactics | (optional: re-prioritize) | Full repo audit → gap analysis → prioritized action items |
| 4 | Specs | (optional: clarify ambiguities) | Generate precise acceptance criteria per action item. A freeform description skips the chain for simple cases. |
| 5 | Plan | (optional: review architecture) | Technical design, data models, API contracts |
| 6 | Tasks | (optional: adjust ordering) | Break plan into test-first atomic tasks |
| 7 | Implement | (optional: review PRs) | Execute tasks one by one, fresh context per task |
| 8 | Validate | Run the chain check | Every phase's invariants, plus every goal reaching a task |

**In full-auto mode (default):** the human provides only the vision; the agent handles everything else.

**End to end:** the nine skills in order, with `vdd_check` after each artifact and `vdd_chain_validate` at the end.

---

## The Coverage Invariants

Every junction is judged by three invariants over a parent→child matrix:

- **A — forward completeness.** Every parent has at least one child.
- **B — backward soundness.** Every child names a parent the artifact declares.
- **C — dedicated chain.** Every parent has a child no other parent shares — the structural
  answer to an "A-001-only" artifact.

`vdd_check` returns `PASS` only when all three hold, and returns the matrix either way. The
authoritative statement, with the two count rules and the reference fixture, is
[`references/coverage-invariants.md`](references/coverage-invariants.md).

## Commands

Three, because there are three tools:

```bash
vdd check <phase> <file> [--prior <phase=file>] [--counts '<json>']
vdd chain <vision> <strategy> <tactics> <specs> <plan> <tasks>
vdd amend <file> --prior <phase=file>
```

Each prints the JSON result the tool returns and exits 1 on `FAIL`.

## Domain Primers

VDD is domain-aware. During Phase 2 (Strategy), domain-specific research patterns are loaded based on the vision's target domains:

| Primer | When Loaded | Contains |
|--------|------------|----------|
| `domain-primers/human-factors.md` | Every project (unconditional) | Behavioral economics, cognitive load, habit formation |
| `domain-primers/verification-toolchain.md` | Every project (unconditional) | Playwright, Browserless, Sentry, CI/CD quality pipeline |
| `domain-primers/webapp.md` | Vision targets web applications | UX, accessibility, performance, framework evaluation |
| `domain-primers/data-storage.md` | Vision involves persistent data | Schema design, indexing, data governance |
| `domain-primers/etl.md` | Vision involves data pipelines | Pipeline architecture, data quality, streaming vs batch |
| `domain-primers/infrastructure.md` | Vision involves deployment/platform | CI/CD, observability, security, scaling, disaster recovery |
| `domain-primers/safety-critical.md` | Vision involves aerospace/medical/automotive | FMEA/FTA, safety integrity levels (DO-178C/IEC 62304) |

---

## Directory Structure

```
constitution.md                    # Project-level immutable rules (Phase 0)

vdd/
  vision.md                        # Phase 1 — Vision statement, impact model, 17 impacts
  strategy.md                      # Phase 2 — Research synthesis, 12 strategic pillars, risk register
  tactics.md                       # Phase 3 — Codebase audit, gap analysis, 38 action items
  (no file)                        # Phase 8 — vdd_chain_validate returns the chain result
  specs/
    [feature]/
      spec.md                      # Phase 4 — Requirements with MoSCoW priorities
      plan.md                      # Phase 5 — Technical architecture and component breakdown
      data-model.md                # Phase 5 — Entities, fields, relationships, migrations
      contracts/                   # Phase 5 — API contracts
      tasks.md                     # Phase 6 — Atomic test-first task list
```

---

## Reference Index

| Need | File |
|------|------|
| Templates for all 11 artifact types | `references/artifact-templates.md` |
| Step-by-step phase instructions | `references/workflow-phases.md` |
| Invariants A–C and the two count rules | `references/coverage-invariants.md` |
| 24 common failure modes and fixes | `references/anti-patterns.md` |
| RTM format, generation, and CI/CD integration | `references/traceability-matrix.md` |
| One-page cheat sheet | `references/quick-reference.md` |
| Topic navigation | `references/INDEX.md` |
| Compliance evidence templates | `references/compliance-evidence.md` |
| Domain-specific research patterns | `domain-primers/*.md` |

## MCP & Packages

The public MCP server at `vdd.simonmak.com/api/mcp` and the TypeScript packages are in this repo:
- `packages/vdd-engine/` — shared core (the coverage engine: matrix, invariants, phase table)

**Capability contract:** the MCP is the *verification* layer — it builds a parent→child matrix and
returns a verdict with the reasons that produced it. It generates nothing, calls no model, and reads
no filesystem. The **host agent** does the research, the audit and the implementation with its own
environment tools (Brave Search, Perplexity, Context7, gh_grep, Playwright, filesystem), writing each
artifact from its skill and calling `vdd_check` before moving on.

**Local vs hosted.** The stdio server (`npx -y @simonmak-ascent/mcp`) and the hosted endpoint
(`vdd.simonmak.com/api/mcp`) run the same `createVddMcpServer()`: three tools, nine skills, no
filesystem, no session. The only difference is the transport. Details: `docs/deployment.md`.
