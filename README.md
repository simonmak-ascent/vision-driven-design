# Vision Driven Design

<!-- mcp-name: com.ascent-partners/vision-driven-design -->

> **From vision to verified impact** — an AI-native, fully autonomous software development methodology.

[![VDD Quality Gates](https://github.com/simonmak-ascent/vision-driven-design/actions/workflows/vdd-quality-gates.yml/badge.svg)](https://github.com/simonmak-ascent/vision-driven-design/actions/workflows/vdd-quality-gates.yml)
[![MCP Tool Definition Quality](https://github.com/simonmak-ascent/vision-driven-design/actions/workflows/tdqs.yml/badge.svg)](https://github.com/simonmak-ascent/vision-driven-design/actions/workflows/tdqs.yml)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-com.ascent-partners%2Fvision-driven-design-4CAF50)](https://registry.modelcontextprotocol.io/v0/servers?search=com.ascent-partners/vision-driven-design)
[![Glama MCP](https://glama.ai/mcp/connectors/com.ascent-partners/vision-driven-design/badges/score.svg)](https://glama.ai/mcp/connectors/com.ascent-partners/vision-driven-design)
[![Agent Status](https://wdmisgfkoimdpvvduebj.supabase.co/functions/v1/mcp-badge?slug=vdd)](https://agentstatus.dev/mcp-index/vdd)
[![Version](https://img.shields.io/badge/version-2.0.0-blue)](https://github.com/simonmak-ascent/vision-driven-design/releases)
[![MCP tools](https://img.shields.io/badge/MCP-3%20tools-4CAF50)](https://vdd.simonmak.com/api/mcp)
[![API](https://img.shields.io/badge/API-vdd.simonmak.com-006b7d)](https://vdd.simonmak.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Overview

Provide a human vision statement. The AI autonomously researches, audits your codebase, generates specs and plans, implements, and validates — with **bi-directional verification** at every junction to ensure nothing is missed or invented.

---

```mermaid
graph LR
    V[1. Vision<br/>Human Input] -->|<-->| S[2. Strategy<br/>AI Research]
    S -->|<-->| T[3. Tactics<br/>AI Audit]
    T -->|<-->| SP[4. Specs<br/>SDD]
    SP -->|<-->| PL[5. Plan]
    PL -->|<-->| TK[6. Tasks]
    TK -->|<-->| IM[7. Implement]
    IM -->|<-->| VS[8. Validate<br/>Impact Verified]

    style V fill:#4CAF50,color:#fff
    style S fill:#2196F3,color:#fff
    style T fill:#FF9800,color:#fff
    style SP fill:#9C27B0,color:#fff
    style VS fill:#4CAF50,color:#fff
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [How It Works](#how-it-works)
- [Commands](#commands)
- [Installation](#installation)
- [MCP API](#mcp-api)
- [Domains Covered](#domains-covered)
- [Best-Practice Benchmark](#best-practice-benchmark)
- [Documentation](#documentation)
- [Repository Structure](#repository-structure)
- [Credits](#credits)
- [License](#license)

---

## Quick Start (≤ 5 minutes)

**Fastest path:** no install — connect an MCP client to the hosted endpoint
`https://vdd.simonmak.com/api/mcp` (Streamable HTTP); or run the one-line install below.

```bash
# One-line install
curl -sSL https://raw.githubusercontent.com/simonmak-ascent/vision-driven-design/main/scripts/install.sh | bash
```

Then in your project, the agent follows the nine skills — `vdd-constitution`, `vdd-vision`,
`vdd-strategy`, `vdd-tactics`, `vdd-specs`, `vdd-plan`, `vdd-tasks`, `vdd-implement`,
`vdd-validate` — and calls `vdd_check` after each artifact. The tools judge; the skills instruct.
Nothing writes to your filesystem on your behalf.

```json
{"phase": "tactics", "content": "<tactics.md>", "priorArtifacts": {"strategy": "<strategy.md>"}}
```

The AI researches, audits and writes; **three coverage invariants** — A forward completeness, B
backward soundness, C a dedicated child per parent — decide whether an artifact is complete, and
the matrix that produced the verdict comes back with it.

**[Skill reference →](SKILL.md)** — the eight phases and the nine procedures.

---

## How It Works

VDD follows Goldratt's **recursive Strategy-Tactic decomposition**: every phase is simultaneously the **Tactic** for its parent and the **Strategy** for its child.

| Phase | S&T Role | Output |
|-------|----------|--------|
| **0. Constitution** | (pre-chain) | `constitution.md` — Immutable project rules |
| **1. Vision** | L1 Strategy: What impact? | `vision.md` — Impact model, success metrics |
| **2. Strategy** | L1 Tactic → L2 Strategy | `strategy.md` — Research, 12 pillars, risk register |
| **3. Tactics** | L2 Tactic → L3 Strategy | `tactics.md` — Codebase audit, 38 action items |
| **4. Specs** | L3 Tactic → L4 Strategy | `spec.md` — MoSCoW acceptance criteria |
| **5. Plan** | L4 Tactic → L5 Strategy | `plan.md`, `data-model.md`, `contracts/` |
| **6. Tasks** | L5 Tactic → L6 Strategy | `tasks.md` — Test-first atomic tasks |
| **7. Implement** | L6 Tactic → L7 Strategy | Code — Per-task commits with full traceability |
| **8. Validate** | the whole chain — did every goal reach a task? | `vdd_chain_validate` — the chain result |

**Three coverage invariants** verify every junction: A forward completeness, B backward soundness, C a dedicated child per parent. The tool returns the matrix it built.

Every code commit traces back to the original vision statement:
```
V-001 → S-001 → A-001 → SP-001 → PL-001 → TK-001 → commit
```

### The pipeline and its coverage invariants

```mermaid
flowchart TB
    C["Phase 0 · Constitution<br/>constitution.md"] --> V["Phase 1 · Vision<br/>vision.md"]
    V -.->|check| S["Phase 2 · Strategy<br/>strategy.md"]
    S -.->|check| T["Phase 3 · Tactics<br/>tactics.md"]
    T -.->|check| SP["Phase 4 · Specs<br/>spec.md"]
    SP -.->|check| PL["Phase 5 · Plan<br/>plan.md · data-model · contracts"]
    PL -.->|check| TK["Phase 6 · Tasks<br/>tasks.md"]
    TK -.->|check| I["Phase 7 · Implement<br/>code + per-task commits"]
    I -.->|check| VA["Phase 8 · Validate<br/>chain result"]
```

### Bi-directional traceability

Each check compares **forward** (parent → children) and **backward** (children → parent), over **three invariants** at every junction — and it returns the matrix that shows why.

```mermaid
flowchart LR
    subgraph F["Forward: intent → code"]
      direction LR
      V1["Vision V-*"] --> S1["Strategy S-*"] --> T1["Tactics T-*"] --> SP1["Spec SP-*"] --> PL1["Plan PL-*"] --> TK1["Tasks TK-*"] --> C1["Commit"]
    end
    subgraph B["Backward: code → intent"]
      direction LR
      C2["Commit"] --> TK2["Tasks TK-*"] --> PL2["Plan PL-*"] --> SP2["Spec SP-*"] --> T2["Tactics T-*"] --> S2["Strategy S-*"] --> V2["Vision V-*"]
    end
```

### Change cascade

```mermaid
flowchart TB
    CH["Requirement change<br/>vdd_amend"] --> FIND["Find the highest affected level"]
    FIND --> U1["Update Vision"] --> U2["Update Strategy"] --> U3["Update Tactics"] --> U4["Update Specs"] --> U5["Update Plan"] --> U6["Update Tasks"]
    U6 --> REG["Re-run the invariants over the affected artifacts"]
    REG --> IMPL["Re-implement only the changed tasks"]
```

---

## Commands

Three, because there are three tools:

```bash
vdd check <phase> <file> [--prior <phase=file>] [--counts '<json>']
vdd chain <vision> <strategy> <tactics> <specs> <plan> <tasks>
vdd amend <file> --prior <phase=file>
```

Each prints the JSON result the tool returns and exits 1 on `FAIL`. Over MCP, the same three tools
are `vdd_check`, `vdd_chain_validate` and `vdd_amend`, and the nine skills tell the agent what to
write before it calls one.

## Installation

```bash
# OpenCode
git clone https://github.com/simonmak-ascent/vision-driven-design.git \
  ~/.config/opencode/skills/vision-driven-design/

# Claude Code
git clone https://github.com/simonmak-ascent/vision-driven-design.git \
  ~/.claude/skills/vision-driven-design/

# Cursor
git clone https://github.com/simonmak-ascent/vision-driven-design.git \
  .cursor/skills/vision-driven-design/
```

### Local MCP (from source)

To run the MCP server locally (stdio) instead of the hosted endpoint:

```bash
# 1. Clone the repo
git clone https://github.com/simonmak-ascent/vision-driven-design.git

# 2. Install deps + build the TypeScript packages
cd vision-driven-design
pnpm install
pnpm -r build

# 3. Point your agent at the built stdio entry point
```

**OpenCode** (`opencode.json`):
```json
"vdd": {
  "type": "local",
  "command": ["node", "<repo>/packages/vdd-mcp/dist/stdio.js"],
  "enabled": true
}
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
"vdd": {
  "command": "node",
  "args": ["<repo>/packages/vdd-mcp/dist/stdio.js"],
  "type": "stdio"
}
```

---

## MCP API

VDD is available as a public MCP server at `https://vdd.simonmak.com` — 3 tools, no API key required — over the MCP **Streamable HTTP** transport at `https://vdd.simonmak.com/api/mcp` (also reachable at `/mcp`). The legacy SSE endpoint is retired: `https://vdd.simonmak.com/api/sse` now returns an HTTP 308 redirect to `/api/mcp`.

### Agent Configuration

**OpenCode** — add to `opencode.json`:
```json
"vdd": {
  "type": "remote",
  "url": "https://vdd.simonmak.com/api/mcp",
  "timeout": 120000
}
```

**Claude Desktop** — add to `claude_desktop_config.json`:
```json
"vdd": {
  "command": "npx",
  "args": ["-y", "@simonmak-ascent/mcp"],
  "type": "stdio"
}
```

**Cursor** — add MCP server URL: `https://vdd.simonmak.com/api/mcp`

**Any Streamable HTTP client** (Smithery, Claude Code, …) — MCP server URL: `https://vdd.simonmak.com/api/mcp`

### Tools and skills (3 + 9)

| Tool | Input | Returns |
|---|---|---|
| `vdd_check` | `{phase, content, declaredCounts?, priorArtifacts?}` | `{status, reasons, coverage}` |
| `vdd_chain_validate` | `{artifacts, declaredCounts?}` | the same, plus `phases[]` and a reason for every goal that reaches no task |
| `vdd_amend` | `{content, priorArtifacts, changeDescription?}` | the same, plus `phase` and `impactedArtifacts[]` |

Nine skills carry the procedures, served as `skill://<name>/SKILL.md` through `skills/list`
and `skills/get`. `prompts/list` answers `{prompts: []}` — 2.0.0 ships none.

Both surfaces are pure: the artifact text is an argument, the verdict is the return value, and no session state exists.
`docs/migration-2.0.md` names the successor for every removed tool and prompt.

### MCP Registry (Glama)

The server is listed on [Glama](https://glama.ai/mcp/connectors/com.ascent-partners/vision-driven-design), which builds it from source and publishes a hosted remote endpoint plus a **Tool Definition Quality Score** and maintenance rating:

<a href="https://glama.ai/mcp/connectors/com.ascent-partners/vision-driven-design"><img src="https://glama.ai/mcp/connectors/com.ascent-partners/vision-driven-design/badges/card.svg" alt="Glama quality and maintenance score"></a>

Maintainer notes:

- `glama.json` (repo root) is Glama's registry file. Its [schema](https://glama.ai/mcp/schemas/server.json) consumes exactly one field — `maintainers`. Build/transport/description metadata belongs in `package.json` and this README, **not** here; Glama ignores it.
- Glama generates its own container build from the stdio entrypoint (`packages/vdd-mcp/dist/stdio.js`), wrapped with `mcp-proxy`. The root `Dockerfile` is for **self-hosting** the Streamable HTTP server, not for Glama.
- After tool-definition changes: sync the repository and run **Build & Release** in the Glama admin. Tool-level scores refresh on the next sweep; the server-level *coherence* score re-runs less often.
- Also published to the [**Official MCP Registry**](https://registry.modelcontextprotocol.io) as `com.ascent-partners/vision-driven-design` (manifest: `server.json`) — PulseMCP and other directories ingest from there.
- Listed in the [`awesome-mcp-servers`](https://github.com/punkpeye/awesome-mcp-servers) community list under Developer Tools.
- Listed on [**Agent Status**](https://agentstatus.dev/mcp-index/vdd) — an outside-in MCP reliability index that probes reach, catalog, and tool calls from real hosts (Cursor, Claude, VS Code, ChatGPT). The submission created the Free dashboard account; the score populates after the first probe.

  <a href="https://agentstatus.dev/mcp-index/vdd"><img src="https://wdmisgfkoimdpvvduebj.supabase.co/functions/v1/mcp-badge?slug=vdd" alt="Agent Status MCP reliability score"></a>

### API Reference

| Method | Description |
|--------|-------------|
| POST `/api/mcp` | Streamable HTTP — `server/discover`, `tools/list`, `tools/call`, `skills/list` (stateless) |
| GET `/api/mcp` | HTML docs page for browsers; 405 for MCP clients (no server-initiated stream) |
| DELETE `/api/mcp` | 204 — no session state to terminate |
| `/api/sse` | Retired — HTTP 308 redirect to `/api/mcp` |

```bash
# Streamable HTTP call example
curl -X POST https://vdd.simonmak.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

```bash
# tools/call example
curl -X POST https://vdd.simonmak.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"vdd_check","arguments":{"phase":"vision","content":"<vision.md>"}},"id":1}'
```

The full TypeScript engine (`packages/vdd-engine`, `packages/vdd-mcp`, `packages/vdd-cli`) is included in this repo.

---

## Domains Covered

VDD loads domain-specific research patterns during the Strategy phase based on your vision:

| Domain | What it covers |
|--------|---------------|
| **WebApp** | UX, accessibility (WCAG 2.2), performance budgets, framework evaluation |
| **Data Storage** | Schema design, indexing strategy, data governance, ACID vs eventual |
| **ETL** | Pipeline architecture, data quality, batch vs streaming |
| **Infrastructure** | CI/CD, observability, security, scaling, disaster recovery |
| **Human Factors** | Behavioral economics, cognitive load, habit formation, accessibility cognition |
| **Verification Toolchain** | Playwright, Browserless, Sentry, CI/CD quality pipeline |
| **Safety-Critical** | FMEA/FTA, DO-178C/IEC 62304 safety integrity levels |

`human-factors.md` and `verification-toolchain.md` are loaded unconditionally for every project.

---

## Best-Practice Benchmark

VDD is benchmarked against NASA SE, CMMI REQM, DO-178C, IEC 62304, DORA, ISO 29148, and GitHub Spec Kit:

**47/47 criteria matched (100%), 11 exceeded, 0 gaps.**

[Standards & compliance evidence →](references/compliance-evidence.md)

---

## Documentation

| File | Contents |
|------|----------|
| [`SKILL.md`](SKILL.md) | Full command reference and workflow |
| [`docs/deployment.md`](docs/deployment.md) | Local stdio and Streamable HTTP — the same pure server over two transports |
| [`references/workflow-phases.md`](references/workflow-phases.md) | Step-by-step phase instructions (authoritative) |
| [`references/artifact-templates.md`](references/artifact-templates.md) | Copy-paste templates for all 11 artifacts |
| [`references/coverage-invariants.md`](references/coverage-invariants.md) | invariants A–C, the count rules, the fixture |
| [`references/anti-patterns.md`](references/anti-patterns.md) | 24 failure modes and fixes |
| [`references/compliance-evidence.md`](references/compliance-evidence.md) | DO-178C/IEC 62304/CMMI/ISO 29148 evidence maps |
| [`references/quick-reference.md`](references/quick-reference.md) | One-page cheat sheet |

---

## Repository Structure

```
├── SKILL.md                         # Entry point — loaded by OpenCode
├── README.md                        # This file
├── AGENTS.md                        # Instructions for AI agents
├── constitution.md                  # Project constitution (dogfooded)
├── CHANGELOG.md                     # Versioned change history
├── CONTRIBUTING.md                  # Contribution guidelines
├── LICENSE                         # MIT
├── index.html                       # Vercel landing page (en / zh / hk)
├── pnpm-workspace.yaml              # Workspace config
├── package.json                     # Root package (Vercel + workspace)
├── vercel.json                      # Vercel deployment config
├── Dockerfile                       # Self-host build — Streamable HTTP MCP server
├── glama.json                       # Glama registry file (maintainers only)
├── server.json                      # Official MCP Registry manifest
├── domain-primers/                  # 7 domain research patterns
│   ├── webapp.md
│   ├── data-storage.md
│   ├── etl.md
│   ├── infrastructure.md
│   ├── human-factors.md             # Loaded unconditionally
│   ├── verification-toolchain.md    # Loaded unconditionally
│   └── safety-critical.md           # FMEA/FTA, DO-178C/IEC 62304
├── skills/                          # the nine SKILL.md procedures
├── references/                      # 8 authoritative reference docs
│   ├── INDEX.md                     # Navigation map
│   ├── quick-reference.md           # 1-page cheat sheet
│   ├── workflow-phases.md           # Phase order (authoritative)
│   ├── artifact-templates.md        # 11 artifact templates (authoritative)
│   ├── coverage-invariants.md      # invariants A–C, count rules (authoritative)
│   ├── anti-patterns.md             # 24 failure modes (authoritative)
│   ├── traceability-matrix.md       # RTM format + CI/CD
│   └── compliance-evidence.md       # Evidence maps
├── vdd/                             # artifacts a project accumulates
│   ├── vision.md                    # Vision, impact model, 17 impacts
│   ├── strategy.md                  # 12 strategic pillars
│   ├── tactics.md                   # 38 action items (all DONE)
│   ├── impact-report.md             # authored by the agent in phase 8
│   ├── docs/                        # 16 guides and references
│   └── specs/                       # 3 feature specs
├── packages/                        # TypeScript monorepo
│   ├── vdd-engine/                  # Shared core — the coverage engine
│   ├── vdd-mcp/                     # MCP server — 3 tools + 9 skills
│   └── vdd-cli/                     # CLI binary — check, chain, amend
├── api/                             # Vercel MCP endpoint
│   ├── mcp.js                       # Streamable HTTP MCP endpoint (3 tools)
│   └── _vdd-rpc.cjs                 # Transport adapter + browser docs page (not routed)
├── scripts/                         # seven installer, landing and manifest helpers
└── .github/                         # GitHub config
    ├── CODEOWNERS
    ├── ISSUE_TEMPLATE/
    └── workflows/
```

## Acknowledgements

Built on:
- **Goldratt's Strategy-and-Tactic Tree** — recursive decomposition at every phase
- **Impact Mapping** (Gojko Adzic) — goal → actors → impacts → deliverables
- **GitHub Spec Kit** — spec-driven development with AI agents
- **NASA Systems Engineering** — bidirectional traceability and verification chains
- **CMMI Requirements Management** — bidirectional traceability of requirements

## Use with Context7

Up-to-date Vision Driven Design documentation is indexed on [Context7](https://context7.com/simonmak-ascent/vision-driven-design), so coding agents can pull it into context on demand. With the Context7 MCP server or `ctx7` CLI installed, name the library in your prompt:

```text
use library /simonmak-ascent/vision-driven-design for API and docs
```

## License

MIT — see [LICENSE](LICENSE).

---

By [Simon Mak](https://github.com/simonmak-ascent).

If this saves you time, a ⭐ on GitHub helps others find it.
