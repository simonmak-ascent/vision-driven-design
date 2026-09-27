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

1. **Write your vision** (2 minutes):
   Type 1-3 paragraphs describing the impact you want to create. Be broad. Be ambitious.
   The AI handles the rest.

2. **Let the chain run**:
   `/vdd:vision "I want to build a platform that..."` → AI expands, researches, audits
   your codebase, generates specs, plans, tasks, and implements — all with bidirectional
   verification at every gate.

   **Or run end-to-end**:
   `/vdd:e2e "your vision"` → executes the full 8-phase chain (init→vision→strategize→
   tactics→specify→clarify→plan→tasks→get-next-task→validate) in a single command, writing all 10+
   template files to your project.

3. **Review at the end**:
   `/vdd:validate` produces a full-chain traceability matrix and impact verification
   report. Every line of code traces back to your original vision statement.

---

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
│  vision.md  strategy.md  tactics.md  spec.md  plan.md  tasks.md    code       impact-report  │
│  (human      (research    (repo       (SDD     (SDD     (SDD        (SDD        (full-chain    │
│   input)     + domain     audit)      absorb)  absorb)  absorb)     absorb)     drift report)  │
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
| 4 | Specs | (optional: clarify ambiguities) | Generate precise acceptance criteria per action item. Can also accept freeform description directly via `/vdd:specify "description"` — skips V/S/T for simple cases. |
| 5 | Plan | (optional: review architecture) | Technical design, data models, API contracts |
| 6 | Tasks | (optional: adjust ordering) | Break plan into test-first atomic tasks |
| 7 | Implement | (optional: review PRs) | Execute tasks one by one, fresh context per task |
| 8 | Validate | Review impact report | Full-chain traceability matrix, drift detection, impact verification |

**In full-auto mode (default):** human provides only the Vision. AI handles everything else,
including self-gating all 7 bidirectional verification gates.

**E2E shortcut:** `/vdd:e2e "vision"` runs the entire chain in one call.

---

## 7 Bi-Directional Gates

Each gate verifies both directions and validates 4 S&T assumptions:

| Gate | Forward Check | Backward Check |
|------|--------------|----------------|
| **G1 (V→S)** | Every vision goal has ≥1 strategy pillar | Every pillar traces to a vision goal |
| **G2 (S→T)** | Every pillar has ≥1 tactical action item | Every action item traces to a pillar |
| **G3 (T→SP)** | Every MUST action item has a spec | Every AC traces to an action item |
| **G4 (SP→PL)** | Every AC has ≥1 plan component | Every component traces to an AC |
| **G5 (PL→TK)** | Every component has ≥1 task | Every task traces to a component |
| **G6 (TK→IM)** | Every task produces passing code | Every commit traces to a task |
| **G7 (IM→VS)** | Every MUST AC has passing tests | Every code artifact traces to vision. User story walkthrough complete. |

**108 total checks** (42 forward + 38 backward + 28 S&T assumptions).

---

## Command Reference

| Command | Phase | Action |
|---------|-------|--------|
| `/vdd:init` | 0 | Generate `constitution.md` from project context |
| `/vdd:vision "statement"` | 1 | Expand freeform vision → structured `vision.md` |
| `/vdd:strategize` | 2 | Load domain primers, spawn research subagents, synthesize `strategy.md` |
| `/vdd:tactics` | 3 | Audit repo, gap analysis, generate `tactics.md` |
| `/vdd:specify <action-item-id \| "freeform description">` | 4 | Generate `spec.md` from tactical action item or freeform |
| `/vdd:clarify <feature>` | 4 | Standalone clarification pass on a spec |
| `/vdd:plan <feature>` | 5 | Generate `plan.md`, `data-model.md`, `contracts/` |
| `/vdd:tasks <feature>` | 6 | Generate `tasks.md` with test-first ordering |
| `/vdd:get-next-task <feature>` | 7 | Extract next uncompleted task from tasks.md |
| `/vdd:implement <task-id>` | 7 | Execute a single task, verify, commit |
| `/vdd:validate` | 8 | Full-chain traceability, drift detection, impact verification |
| `/vdd:trace` | any | Generate bidirectional traceability matrix |
| `/vdd:analyze <feature>` | any | Cross-artifact consistency and conflict analysis |
| `/vdd:amend "what changed"` | any | Cascade a requirement change through the full chain |
| `/vdd:detect-environment` | any | Report per-phase tool/MCP requirements + available capabilities |
| `/vdd:e2e "vision statement"` | 0–8 | **End-to-end**: execute full chain init→vision→strategize→tactics→specify→clarify→plan→tasks→get-next-task→validate in one call. Writes all 10+ template files. Accept optional `--actionItemId` / `--feature` to customize feature name (default: "feature-1"). |
| `/vdd:e2e -clone <domain>` | 7 | **Clone**: crawl the site (browserless/fetch) into a full dataset, capture exact UI/UX, rebuild backend, generate DB schema, emit AI tools, and generate a deployable **dynamic** site (`vdd/clone-site/`) that renders every crawled page. Accepts https/http/www/bare domain (e.g. `https://www.ascent-partners.com` or `ascent-partners.com`). |

---

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
  impact-report.md                 # Phase 8 — Full-chain traceability and impact verification
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
| Prompts for every phase + bidirectional gates | `references/prompt-patterns.md` |
| Step-by-step phase instructions | `references/workflow-phases.md` |
| 7 bidirectional gates with 108 total checks | `references/quality-gates.md` |
| Multi-agent patterns and auto-mode execution | `references/ai-agent-patterns.md` |
| 24 common failure modes and fixes | `references/anti-patterns.md` |
| RTM format, generation, and CI/CD integration | `references/traceability-matrix.md` |
| One-page cheat sheet | `references/quick-reference.md` |
| Topic navigation | `references/INDEX.md` |
| Compliance evidence templates | `references/compliance-evidence.md` |
| Clone pipeline → live site playbook | `references/clone-playbook.md` |
| Domain-specific research patterns | `domain-primers/*.md` |

## MCP & Packages

The public MCP server at `vdd.simonmak.com/api/mcp` and the TypeScript packages are in this repo:
- `api/mcp.js` — deployed Vercel Streamable HTTP handler (15 tools); `api/_vdd-rpc.js` — shared JSON-RPC core + browser docs page
- `packages/vdd-engine/` — shared core (18 phase functions + `meta.ts`: phase metadata, tool requirements, research subagents, domain primers)
- `packages/vdd-mcp/` — MCP server (15 tools, stdio + Streamable HTTP)
- `packages/vdd-cli/` — CLI binary (17 subcommands, `--json`)

**Capability contract:** the MCP is the *structured orchestration + verification* layer — it emits
research-subagent dispatch specs, per-phase tool requirements (`/vdd:detect-environment`), domain-primer
lists, and enforces substantive (non-placeholder) gates. The **host agent** executes research, codebase
audit, and implementation using its own environment MCP tools (Brave Search, Perplexity, Context7,
gh_grep, Playwright, filesystem). A freshly generated template is marked NOT-ready (gates report
placeholders) until the host agent fills it in and re-runs `/vdd:validate`.
