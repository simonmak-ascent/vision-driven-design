# TASKS — the execution list, not the issue queue

This file is the input to the estate's plan gate: `~/.config/opencode/plugins/_lib/gates/policies/plan.ts`
runs `plan-state.py --require-complete` over it before any shipping command. It records what a commit
delivers; it is **not** a backlog. The backlog lives in `docs/plan.md`.

Legend — **done** · **applied** · **ready** (no blocker, no approval needed) · **blocked by** `<row>`
· **awaiting you** · **yours** (needs the operator).

| # | task | gate that was run | status |
|---|---|---|---|
| 1.1 | Remove the `clone` capability at the source: its engine modules, tests, scaffold script and two references | `rm` of 11 engine modules + 11 test files + `scripts/vdd-clone-scaffold.mjs` + 2 references; `pnpm -r build` from a clean `dist` | **done — build clean; no clone artifacts in the rebuilt `dist`; suite 8 files / 79 tests** |
| 1.2 | Remove `clone` from every surface: MCP tools, prompts, CLI, hosted twin, schemas and annotations | `grep -ri clone` over `packages/*/src`, `api/`, `scripts/` | **done — 14 tools, 20 prompts; no `-c/--clone`; hosted handler/fields removed; parity tests pass** |
| 1.3 | Update counts and copy: 15→14 tools, 21→20 prompts, remove clone rows/links, regenerate the landing pages | `grep` for the old counts; `python3 scripts/gen-landing.py` | **done — README, SKILL, llms, context7, deployment, quick-reference, INDEX, package.json descriptions; `index.html`/`zh`/`hk` regenerated at 14** |
| 1.4 | Full gate over the change-set | `pnpm -r build && pnpm check && pnpm test` | **done — 8 files, 79 tests passed** |
