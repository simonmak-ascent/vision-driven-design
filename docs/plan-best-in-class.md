# Plan — best-in-class target across the 25-aspect matrix

Status: **proposed**. This is the long-range plan. `docs/plan.md` remains the record of the certified
v4 and the executed security work (A1–A3, clone removal); this document absorbs its remaining items
(A5, the B-series and C-series) and extends them to cover the whole matrix.

Baseline: `main` @ `1cd2302` — 14 MCP tools, 20 prompts, 16 CLI subcommands, 17 phases, no outbound
network. Suite 8 files / 79 tests. Gates `gate0–gate7` exist but are only reachable through `e2e`;
`validate` reports drift without an exit code; `api/_vdd-rpc.js` is a hand-maintained duplicate.

Standing gates for every task:

```
$GATE      = pnpm -r build && pnpm check && pnpm test
$PLAN      = python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete
```

One increment = one commit; the `TASKS.md` row is written after the `ship` verdict and before the
commit. Column format: task — depends — verify.

---

## WP0 — Hold the wins (matrix rows 8, 11, 22, 23, 24)

| id | task | depends | verify |
|---|---|---|---|
| 0.1 | Guard the no-network, no-exec guarantee: a test that greps the shipped path for `fetch(`, `child_process`, dynamic `import(` and `eval(` | — | `-- package-boundary` fails on an injected `fetch(` |
| 0.2 | Guard determinism: assert every check in `verify` is code, not prompt text (no check id sourced from a markdown file) | 1.1 | `-- check-provenance` |

## WP1 — Validation becomes real (rows 9, 10, 12, 14, 15, 16, 17, 25)

This is the first project: it is the differentiator, and every later claim depends on it.

| id | task | depends | verify |
|---|---|---|---|
| 1.1 | `verify --strict`: compose `validate()` + `runGates()` into one op; JSON output; exit **0** pass / **1** findings / **2** could-not-check | — | `-- verify-contract` covers all three exit codes; a no-artifacts project exits 2, not 0 |
| 1.2 | Declared severity: `INFO` never changes the exit code, `WARN` fails under `--strict`, `FAIL` always fails; schema published | 1.1 | `-- verify-severity` |
| 1.3 | Known-bad fixture per check class (G1–G7), plus a mutation run that removes each fix and requires the check to fail | 1.1 | `-- fixtures` red on a mutated fixture |
| 1.4 | CI: run `verify --strict` on any PR touching `vdd/**` or `references/**`; required check | 1.1 | PR with a broken chain is blocked |
| 1.5 | `converge`: append `TK-` rows for unmet `AC-`, re-run `verify`, stop at `Converged` with a bounded iteration cap | 1.1 | `-- converge` turns one unmet AC into one task, then converges |
| 1.6 | AC evidence: `verify` reports `AC- → test → commit`; a missing link fails | 1.1 | `-- ac-evidence` red for an untested AC |
| 1.7 | `inspect --waves`: compute parallel sets from the task dependency graph; `[P]` becomes derived, not asserted | 1.1 | `-- waves` refuses two tasks touching one file |
| 1.8 | Drift ownership: detect code changed without spec change; archive superseded specs | 1.1 | `-- drift` red when code moves and the spec does not |

## WP2 — Single source, installable (rows 1, 2, 3, 6, 18, 19, 20, 21)

| id | task | depends | verify |
|---|---|---|---|
| 2.1 | `capabilities.ts` registry (4 ops) + artifact inventory (`produced-by` / `checked-by`); generate tool defs, CLI help, docs table and prompt list | 1.1 | `-- registry` set equality; `grep` shows no hand-written tool list |
| 2.2 | Delete `api/_vdd-rpc.js`; hosted serves resources + `skill_get` + `verify(artifactFiles)`; no hard-coded pass | 2.1 | handler test + post-deploy `curl` |
| 2.3 | `vdd install --agent <k>`: skill + CLI + MCP config; idempotent, `--dry-run` | 2.1 | install twice ⇒ identical bytes; `vdd doctor` |
| 2.4 | `vdd upgrade`: detect skill/CLI/package drift, update in place, preserve project overrides; `--check` for CI | 2.3 | `--check` exits 1 on a drifted install |
| 2.5 | Inclusion modes per reference (`always / glob / manual`) + a token-budget assertion | 1.1 | `-- context-budget` (metadata ≤100 tokens, body ≤5k) |
| 2.6 | `inspect --artifact <path>` → layer, source, overrides (project > preset > core) | 2.1 | `-- resolve` names the winning layer |
| 2.7 | Declarative presets: `vision-first` and `spec-first`; no executable code | 2.1 | `-- presets`; no `import`/`exec` in the preset path |
| 2.8 | Generate per-agent installs (Claude, Cursor, Codex, OpenCode) from the registry | 2.3 | diff two installed agents: only the adapter differs |

## WP3 — Methodology depth (rows 4, 5, 7, 8, 13)

| id | task | depends | verify |
|---|---|---|---|
| 3.1 | Assessment phase before vision with `go / clarify / kill`; `kill` ends the chain cleanly | 2.7 | `-- assessment` |
| 3.2 | Constitution versioning: amend → diff → cascade; `inspect --constitution` | 1.1 | `-- constitution` flags dependent artifacts |
| 3.3 | Bounded clarification (≤5 questions), answers written back and re-verified | 1.1 | `clarify --strict` exits non-zero while markers remain |
| 3.4 | Add `research.md` and `quickstart.md` to the artifact set, with producer/checker entries | 2.1 | `-- inventory` |
| 3.5 | Phase composition: a preset may skip V/S/T, and the skip is recorded | 2.7 | `-- phases` shows the active chain |

## WP4 — Surface shrink to four (row 22)

| id | task | depends | verify |
|---|---|---|---|
| 4.1 | 2.0.0: four tools (`verify`, `inspect`, `clarify`, `next-task`); prompts retired; resources + `skill_get` | 2.1, 2.2 | `tools/list` = 4; parity generated |
| 4.2 | Release: version bump, tag, npm deprecation of 1.x, global re-patch, production probe | 4.1 | `curl` + `npm view` |

---

## Sequence and releases

```
WP1 (verify) ──┬── WP1.5 converge ── WP1.6 AC evidence
               └── WP2.1 registry ──┬── WP2.2 hosted ── WP4 (2.0 surface)
                                    ├── WP2.3 install/upgrade ── WP2.8 per-agent
                                    └── WP2.5/2.6/2.7 ── WP3
```

| Release | Contents | Rationale |
|---|---|---|
| **1.10.0** | WP1.1–1.4, WP0.2 | `verify` as a fail-closed verb; the product claim becomes true |
| **2.0.0** | WP2.1–2.2, WP4 | four capabilities, generated surfaces, hosted resources |
| **2.1.0** | WP1.5–1.8, WP1.3 fixtures | convergence + evidence; the loop closes |
| **2.2.0** | WP2.3–2.8 | install/upgrade/generation; the cheapest adoption win |
| **2.3.0** | WP3 | assessment, constitution, bounded clarification, presets |

## Risks

| Risk | Mitigation |
|---|---|
| Verification becomes ceremony | presets (2.7) let small work skip V/S/T; `verify` stays one command |
| Registry becomes a framework | it is data only; no hooks, no DSL, no dynamic dispatch |
| Hosted `verify` payload limits | `artifactFiles` cap re-homed (A5); refuse with exit 2 rather than delegate |
| Two adapters diverge | both generated from 2.1; the parity test becomes a construction guarantee |
| Counts drift again | every count is generated by 2.1; a surface sweep is a CI check |
| Plan gate stalls work | `TASKS.md` is completed per commit; the backlog stays here |

## Decisions the operator must make

1. **Extension boundary**: declarative knowledge only (presets/primers), never executable — confirm.
2. **Hosted MCP**: keep as resources + `skill_get`, or drop entirely once 2.0 lands.
3. **`[P]` semantics**: computed from the dependency graph (recommended) or removed as a concept.
4. **Convergence cap**: the iteration limit before `converge` refuses to continue.

## Definition of done

Per release: every task passed the review loop (≤3 rounds, verdict bound to tested bytes), `$GATE`
green after the last edit, `$PLAN` exits 0, a `ship` verdict over unchanged bytes, PR merged on green
checks, branch deleted, deploy through the repo's own path, and a production probe that observes the
new behaviour (for 2.0: `tools/list` = 4).
