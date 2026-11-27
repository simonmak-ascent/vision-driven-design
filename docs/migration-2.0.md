# Migrating to 2.0.0

2.0.0 removes the generation surface. Fourteen tools and twenty prompts become **three tools that
judge an artifact** and **nine skills that tell an agent how to write one**. Nothing generates content,
calls a model or writes a file: you pass the text in, and the answer is a matrix.

The endpoint is stateless — no `initialize` handshake, no `Mcp-Session-Id` — and speaks MCP revision
`2026-07-28`. Old clients that open with the 2025 handshake still work; nothing resumes.

## The three tools

| Tool | Input | Returns |
|---|---|---|
| `vdd_check` | `{phase, content, declaredCounts?, priorArtifacts?}` | `{status, reasons, declared_counts, actual_counts, coverage{forward_covered, backward_sound, dedicated, matrix}}` |
| `vdd_chain_validate` | `{artifacts, declaredCounts?}` | the same, plus `phases[]` and the goal→task path check |
| `vdd_amend` | `{content, priorArtifacts, declaredCounts?, changeDescription?}` | the same, plus `phase` and `impactedArtifacts[]` |

`status` is `PASS` only when invariants A (every parent has a child), B (every child names a known
parent) and C (every parent has a dedicated child) hold together, and every declared count the phase
consumes matches the text.

## Removed tools, and what replaces each

| Removed | Successor |
|---|---|
| `vdd_init` | skill `vdd-constitution`; judged by `vdd_check{phase:'constitution'}` |
| `vdd_vision` | skill `vdd-vision`; judged by `vdd_check{phase:'vision'}` |
| `vdd_strategize` | skill `vdd-strategy`; judged by `vdd_check{phase:'strategy'}` |
| `vdd_tactics` | skill `vdd-tactics`; judged by `vdd_check{phase:'tactics'}` |
| `vdd_specify` | skill `vdd-specs`; judged by `vdd_check{phase:'specs'}` |
| `vdd_clarify` | **no successor** — a spec is authored and judged in one pass |
| `vdd_plan` | skill `vdd-plan`; judged by `vdd_check{phase:'plan'}` |
| `vdd_tasks` | skill `vdd-tasks`; judged by `vdd_check{phase:'tasks'}` |
| `vdd_get_next_task` | **no successor** — task order is prose in the tasks artifact |
| `vdd_implement` | skill `vdd-implement` |
| `vdd_validate` | skill `vdd-validate`; judged by `vdd_chain_validate` |
| `vdd_inspect` | `vdd_chain_validate` (the matrix half); there is no project scan — the tool is pure |
| `vdd_amend` | `vdd_amend` — same name, new input `{content, priorArtifacts, changeDescription}` |
| `vdd_detect_environment` | **no successor** — the host's tool list is the agent's own context |

## Removed prompts, and what replaces each

| Removed | Successor |
|---|---|
| `start_vdd_project` | skill `vdd-constitution`, opening section |
| `implement_next_task` | skill `vdd-implement`, opening section |
| `change_requirement` | `vdd_amend` + the skill of the phase the change lands in |
| `init` | skill `vdd-constitution` |
| `vision` | skill `vdd-vision` |
| `strategize` | skill `vdd-strategy` |
| `tactics` | skill `vdd-tactics` |
| `specify` | skill `vdd-specs` |
| `clarify` | **no successor** |
| `plan` | skill `vdd-plan` |
| `tasks` | skill `vdd-tasks` |
| `get-next-task` | **no successor** |
| `implement` | skill `vdd-implement` |
| `validate` | skill `vdd-validate` |
| `inspect` | `vdd_chain_validate` (no prompt) |
| `trace` | `vdd_chain_validate`'s goal→task path check |
| `analyze` | `vdd_chain_validate`'s per-phase breakdown |
| `amend` | `vdd_amend` (no prompt) |
| `detect-environment` | **no successor** |
| `e2e` | **no successor** — it was CLI-only, and the sequence it duplicated no longer exists |

`prompts/list` answers `{prompts: []}` rather than an error, so a client that asks is told "none".

## Where the skills come from

They are served over MCP as `skill://<name>/SKILL.md` resources through the Skills extension
(SEP-2640): `skills/list` and `skills/get`. A host that does not implement the extension sees the three
tools and can read the same nine files from `skills/` in the
[repository](https://github.com/simonmak-ascent/vision-driven-design). Nothing in this server assumes a
host implements it.

## If you call a removed tool

You get JSON-RPC `-32602` naming this document and the removed name's successor — or the literal words
`no successor` where the tables above say so.
