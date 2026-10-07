# Reference Index

Navigation map for all VDD reference files.

## By Topic

### Getting Started
- SKILL.md — Overview, commands, workflow
- README.md — GitHub landing page
- quick-reference.md — One-page cheat sheet
- Quick start — README.md

### Templates
- All 11 artifact templates — artifact-templates.md

### Prompts
- All phase prompts + gate verification — prompt-patterns.md
- Multi-agent review pattern — prompt-patterns.md

### Phase Details
- Step-by-step — workflow-phases.md
- S&T mapping — workflow-phases.md

### Clone
- Website cloning pipeline (crawl → dataset → dynamic site) — clone-workflow.md

### Quality & Gates
- 7 bidirectional gate checklists — quality-gates.md
- CI/CD integration — quality-gates.md

### AI & Agent Patterns
- Recursive S&T, context management — ai-agent-patterns.md
- Parallel research subagents, bidirectional verification pairs — ai-agent-patterns.md
- Auto-mode execution — ai-agent-patterns.md

### Anti-Patterns (24)
- All 24 failure modes and fixes — anti-patterns.md

### Traceability
- RTM structure, generation, CI/CD — traceability-matrix.md

### Compliance
- DO-178C/IEC 62304/CMMI/ISO 29148 evidence maps — compliance-evidence.md

### Domain Primers (7)
- WebApp — domain-primers/webapp.md
- Data Storage — domain-primers/data-storage.md
- ETL — domain-primers/etl.md
- Infrastructure — domain-primers/infrastructure.md
- Human Factors (unconditional) — domain-primers/human-factors.md
- Verification Toolchain (unconditional) — domain-primers/verification-toolchain.md
- Safety-Critical — domain-primers/safety-critical.md

## By Phase

| Phase | Templates | Prompts | Details | Quality |
|-------|-----------|---------|---------|---------|
| 0 — Constitution | constitution.md | constitution-prompts | workflow-phases#phase-0 | Gate 0 |
| 1 — Vision | vision.md | vision-prompts | workflow-phases#phase-1 | self-check |
| 2 — Strategy | strategy.md | strategy-prompts + G1 | workflow-phases#phase-2 | Gate 1 |
| 3 — Tactics | tactics.md | tactics-prompts + G2 | workflow-phases#phase-3 | Gate 2 |
| 4 — Specs | spec.md | specs-prompts + G3 | workflow-phases#phase-4 | Gate 3 |
| 5 — Plan | plan.md, data-model.md, contracts | plan-prompts + G4 | workflow-phases#phase-5 | Gate 4 |
| 6 — Tasks | tasks.md | tasks-prompts + G5 | workflow-phases#phase-6 | Gate 5 |
| 7 — Implement | — | implement-prompts + G6 | workflow-phases#phase-7 | Gate 6 |
| 8 — Validate | impact-report.md | validate-prompts + G7 | workflow-phases#phase-8 | Gate 7 |

## File List

| File | Purpose |
|------|---------|
| quick-reference.md | One-page cheat sheet |
| workflow-phases.md | Phase order and steps (authoritative) |
| artifact-templates.md | 11 artifact templates (authoritative) |
| prompt-patterns.md | AI prompts (authoritative) |
| quality-gates.md | 7 gates with 108 checks (authoritative) |
| ai-agent-patterns.md | Agent orchestration (authoritative) |
| anti-patterns.md | 24 failure modes (authoritative) |
| traceability-matrix.md | RTM format + CI/CD |
| compliance-evidence.md | Evidence maps |
| INDEX.md | This file |
