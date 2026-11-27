# VDD Quick Reference

One-page cheat sheet. For full details, see referenced files.

## The VDD Chain (9 Phases)

```
[CONSTITUTION] ── (once per project)
       ↓
[VISION] → [STRATEGY] → [TACTICS] → [SPECS] → [PLAN] → [TASKS] → [IMPLEMENT] → [VALIDATE]
 vision.md  strategy.md  tactics.md  spec.md   plan.md   tasks.md   per-task     chain result
              + research   + repo audit           data-model           commit
              + domain                               contracts/         after each
              primers

   L1 S     L1 T → L2 S  L2 T → L3 S  L3 T → L4 S  ...  (Goldratt recursive S&T pattern)
```

## Tools

| Tool | Input | Returns |
|---|---|---|
| `vdd_check` | `{phase, content, declaredCounts?, priorArtifacts?}` | `{status, reasons, coverage}` |
| `vdd_chain_validate` | `{artifacts, declaredCounts?}` | the same, plus `phases[]` |
| `vdd_amend` | `{content, priorArtifacts, changeDescription?}` | the same, plus `impactedArtifacts[]` |

Nine skills carry the procedures, served as `skill://<name>/SKILL.md`. `prompts/list` returns `[]`.

## Coverage Invariants

- **A** every parent has at least one child.
- **B** every child names a parent the artifact declares.
- **C** every parent has a child no other parent shares.

The check returns the matrix it built, so a gap is an empty row rather than a number.

## Impact Chain Format

```
> Impact Chain: V-001 → S-001 → A-001 → SP-001 → PL-001 → TK-001
```

## ID Prefixes

| Prefix | Level | Example |
|--------|-------|---------|
| V- | Vision | V-001 |
| S- | Strategy | S-002 |
| A- | Tactics (action item) | A-001 |
| SP- | Spec | SP-004 |
| PL- | Plan | PL-005 |
| TK- | Tasks | TK-006 |
| I- | Impact | I-001 |
| R- | Risk | R-001 |
| AC- | Acceptance Criterion | AC-1 |

## MoSCoW Labels

| Label | Meaning | Effect on the check |
|-------|---------|---------------------|
| `[MUST]` | Required for vision | An action item with no `MUST` priority is not a spec parent — and that is silent |
| `[SHOULD]` | Important, not blocking | Not a spec parent; a spec serving one is an orphan (invariant B) |
| `[COULD]` | Nice to have | Not a spec parent |
| `[WONT]` | Explicitly excluded | Documents the decision; no effect |

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
- POST: JSON-RPC 2.0 — `server/discover` / `tools/list` / `tools/call` / `skills/list` (3 tools, 9 skills), stateless
- POST: a verdict — `{status, reasons, coverage}`; the matrix shows an empty row for every uncovered parent
- Packages: `packages/vdd-engine` · `packages/vdd-mcp` · `packages/vdd-cli`
- Hosted is **stateless**: no session, no filesystem; every tool takes the artifact text and returns a verdict.

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
