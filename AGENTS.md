# AGENTS.md — Vision Driven Design Skill

This is an **OpenCode AI skill repository** — primarily static documentation with a thin MCP API layer.

## Directory Map

```
SKILL.md                 ← Entry point loaded by OpenCode.
README.md                ← GitHub landing page.
constitution.md          ← Project constitution (dogfooded).
index.html               ← GitHub Pages landing page at simonplmak-cloud.github.io/vision-driven-design.
api/                     ← Vercel MCP endpoint (deployed at vdd.simonmak.com).
  mcp.js                 ← Streamable HTTP MCP endpoint — POST handles JSON-RPC 2.0 (initialize, tools/list, tools/call); GET serves the browser docs page. 16 tools.
  _vdd-rpc.js            ← Shared JSON-RPC core + browser docs page (underscore = not a Vercel route).
vercel.json              ← Vercel deploy config (Framework: Other).
Dockerfile               ← Self-host build — Streamable HTTP MCP server. (Glama generates its own; it ignores this file.)
glama.json               ← Glama registry file — `maintainers` only (the sole field Glama's schema consumes).
server.json              ← Official MCP Registry manifest (`io.github.simonplmak-cloud/vision-driven-design`).
package.json             ← Root workspace + Vercel runtime config.
pnpm-workspace.yaml      ← Monorepo workspace config.
packages/                ← TypeScript monorepo.
  vdd-engine/            ← Shared core: 17 phase functions (incl. e2e) + Zod types.
  vdd-mcp/               ← MCP server: 16 tools, stdio + Streamable HTTP transports.
  vdd-cli/               ← CLI binary: 17 subcommands (incl. e2e), --json mode.
domain-primers/           ← 7 domain research patterns (loaded during Phase 2).
  webapp.md, data-storage.md, etl.md, infrastructure.md  ← Conditional (per vision targets).
  human-factors.md, verification-toolchain.md             ← Unconditional (always loaded).
  safety-critical.md                                      ← FMEA/FTA, DO-178C/IEC 62304.
references/               ← 10 authoritative reference docs.
  INDEX.md                ← Navigation map.
  workflow-phases.md      ← Phase order (authoritative).
  artifact-templates.md   ← 11 artifact templates (authoritative).
  prompt-patterns.md      ← AI prompts (authoritative).
  quality-gates.md        ← 7 gates + 108 checks (authoritative).
  ai-agent-patterns.md    ← Agent orchestration (authoritative).
  anti-patterns.md        ← 24 failure modes (authoritative).
  traceability-matrix.md  ← RTM format + CI/CD.
  quick-reference.md      ← Derived cheat sheet.
  compliance-evidence.md  ← DO-178C/IEC 62304/CMMI/ISO 29148 evidence maps.
scripts/                  ← 4 installer/helper scripts.
```

## File Roles — Authoritative Sources

Each concept has one canonical source. Update the source, then propagate.

| Concept | Canonical Source | Derived Copies |
|---------|-----------------|----------------|
| Artifact structures | `artifact-templates.md` | SKILL.md directory structure section |
| Phase steps | `workflow-phases.md` | SKILL.md phase summary |
| Prompts | `prompt-patterns.md` | ai-agent-patterns.md |
| Gate checks and counts | `quality-gates.md` | SKILL.md, README.md, quick-reference.md |
| Anti-patterns | `anti-patterns.md` | INDEX.md troubleshooting section |
| Commands | SKILL.md | README.md, quick-reference.md |

## Conventions

### Impact Chain Headers
Every artifact template includes: `> Impact Chain: V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006`
Prefixes: `V-` (Vision), `S-` (Strategy), `T-` (Tactics), `A-` (Action Item), `SP-` (Spec), `PL-` (Plan), `TK-` (Tasks), `I-` (Impact), `R-` (Risk), `AC-` (Acceptance Criterion).

### Bi-Directional Gates
Each gate has forward checks (parent→children), backward checks (children→parent), and 4 S&T assumptions (Necessity, Achievability, Sufficiency, Warnings). Total check count (108) must stay consistent across SKILL.md, README.md, quick-reference.md, and quality-gates.md.

### Anti-Patterns
Numbered sequentially from AP1 upward. Append new ones at the end — do not renumber existing. Update INDEX.md's troubleshooting section.

## Editing Gotchas

- **SKILL.md's YAML frontmatter** uses the OpenCode skill format. Do not change the format without checking the OpenCode skill spec.
- **Command tables** appear in 3 files (SKILL.md, README.md, quick-reference.md). Add new commands to all three.
- **Phase numbering** (0–8) is stable. Phase 0 is Constitution. Phases 1–3 are VDD additions. Phases 4–8 are the SDD chain. Never renumber.
- **Gate check counts** in `quality-gates.md` Gate Summary Table must match actual checklist items. Total (108) = sum of F/B/A columns across G1–G7.
- **Domain primers** — the original 4 (webapp, data-storage, etl, infrastructure) are loaded per-domain based on vision targets. `human-factors.md` and `verification-toolchain.md` are loaded unconditionally. `safety-critical.md` is loaded when the vision involves regulated domains.
- **API and packages** — `api/` contains the Vercel MCP endpoint. `packages/` contains the TypeScript monorepo. Build configuration is scoped to these directories; core documentation (SKILL.md, references/, domain-primers/) remains build-free.

## Superset Relationship

VDD absorbs SDD. Every SDD command, feature, gate check, and anti-pattern must have an equivalent in VDD:
- `/vdd:specify "freeform description"` must work without a V/S/T chain.
- All SDD artifact paths (`constitution.md`, `specs/`, `plan.md`, `data-model.md`, `contracts/`, `tasks.md`) are preserved under `vdd/`.
- SDD's Boundaries section, MoSCoW labels, Clarify step, and Assumptions Surface prompt must exist in VDD's Phase 4.
