# VDD Quick Reference

One-page cheat sheet. For full details, see referenced files.

## The VDD Chain (9 Phases)

```
[CONSTITUTION] ── (once per project)
       ↓
[VISION] → [STRATEGY] → [TACTICS] → [SPECS] → [PLAN] → [TASKS] → [IMPLEMENT] → [VALIDATE]
 vision.md  strategy.md  tactics.md  spec.md   plan.md   tasks.md   per-task     full-chain
              + research   + repo audit           data-model           commit       drift report
              + domain                               contracts/         after each   impact verify
              primers

   L1 S     L1 T → L2 S  L2 T → L3 S  L3 T → L4 S  ...  (Goldratt recursive S&T pattern)
```

## Phase Commands

| Command | Phase | Creates |
|---------|-------|---------|
| `/vdd:init` | 0 | `constitution.md` |
| `/vdd:vision "statement"` | 1 | `vdd/vision.md` |
| `/vdd:strategize` | 2 | `vdd/strategy.md` |
| `/vdd:tactics` | 3 | `vdd/tactics.md` |
| `/vdd:specify [action-item \| "description"]` | 4 | `vdd/specs/[feature]/spec.md` |
| `/vdd:clarify [feature]` | 4 | delta of resolutions and edge cases |
| `/vdd:plan [feature]` | 5 | `plan.md`, `data-model.md`, `contracts/` |
| `/vdd:tasks [feature]` | 6 | `tasks.md` |
| `/vdd:get-next-task [feature]` | 7 | next uncompleted task |
| `/vdd:implement [task-id]` | 7 | code commit |
| `/vdd:validate` | 8 | `impact-report.md`, drift report |
| `/vdd:trace` | any | traceability matrix |
| `/vdd:analyze [feature]` | any | cross-artifact analysis |
| `/vdd:amend [what changed]` | any | updated chain from change point down |
| `/vdd:detect-environment` | any | per-phase tool/MCP requirements + available capabilities |
| `/vdd:e2e [vision statement]` | 0–8 | full 8-phase chain in one call, writes 10+ template files |
| `/vdd:e2e -clone [domain]` | 7 | clone pipeline: capture → evidence → schema → backend → AI tools |

## 7 Bi-Directional Gates

```
G1: V↔S  ───  G2: S↔T  ───  G3: T↔SP  ───  G4: SP↔PL  ───  G5: PL↔TK  ───  G6: TK↔IM  ───  G7: IM↔VS
```

Each gate: Forward check (parent→children coverage) + Backward check (children→parent authorization) + 4 S&T assumptions (Necessity, Achievability, Sufficiency, Warnings). **Total: 108 checks across 7 gates.**

## Impact Chain Format

```
> Impact Chain: V-001 → S-002 → T-003 → SP-004 → PL-005 → TK-006
```

## ID Prefixes

| Prefix | Level | Example |
|--------|-------|---------|
| V- | Vision | V-001 |
| S- | Strategy | S-002 |
| T- | Tactics | T-003 |
| A- | Action Item | A-001 |
| SP- | Spec | SP-004 |
| PL- | Plan | PL-005 |
| TK- | Tasks | TK-006 |
| I- | Impact | I-001 |
| R- | Risk | R-001 |
| AC- | Acceptance Criterion | AC-1 |

## MoSCoW Labels

| Label | Meaning | Gate Impact |
|-------|---------|-------------|
| `[MUST]` | Required for vision | Fails gate if uncovered |
| `[SHOULD]` | Important, not blocking | Warning if uncovered |
| `[COULD]` | Nice to have | No gate impact |
| `[WONT]` | Explicitly excluded | Documents decision |

## Domain Primers (7)

| Domain | File | Key Patterns |
|--------|------|-------------|
| WebApp | `domain-primers/webapp.md` | UX, accessibility, performance |
| Data Storage | `domain-primers/data-storage.md` | Schema design, indexing, data governance |
| ETL | `domain-primers/etl.md` | Pipeline architecture, data quality |
| Infrastructure | `domain-primers/infrastructure.md` | Deployment, CI/CD, observability |
| Human Factors | `domain-primers/human-factors.md` | Behavioral economics, cognitive load (unconditional) |
| Verification Toolchain | `domain-primers/verification-toolchain.md` | Playwright, Browserless, Sentry (unconditional) |
| Safety-Critical | `domain-primers/safety-critical.md` | FMEA/FTA, DO-178C/IEC 62304 |

## MCP API

**Endpoint**: `https://vdd.simonmak.com/api/mcp` (Streamable HTTP)
- POST: JSON-RPC 2.0 — `initialize` / `tools/list` / `tools/call` (15 tools)
- POST: Phase result (validate: substantive drift/orphan/uncovered detection — a placeholder template does NOT pass)
- Packages: `packages/vdd-engine` · `packages/vdd-mcp` · `packages/vdd-cli`
- `vdd_inspect` — read-only: `scope=project` (traceability matrix) or `scope=feature` (spec metrics)
- `vdd_detect_environment` — report per-phase tool/MCP requirements + available capabilities
- Hosted is **stateless (no filesystem)**: artifact phases return `persisted:false` + `writeTargets`; filesystem-dependent phases return a `delegation` envelope. Re-call the same tool with `artifactFiles` (and `codebaseAudit` for `vdd_tactics`), or run the local stdio server `npx -y @simonmak-ascent/mcp` for direct read/write.

## When NOT to Use VDD

- Bug fix under 30 minutes
- Refactor with no behavior change
- Trivial config change
- Throwaway prototype
- Change unrelated to any vision goal

## When to Require VDD

- Work that advances a vision goal
- Auth logic, DB schema changes, new API endpoints
- Features touching security, compliance, or data integrity
- Cross-cutting changes affecting multiple components
- New product or major feature launch
