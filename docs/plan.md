# Plan v4 — from 15 tools to four capabilities

v4 grounds the plan in the operator's constraint and the estate's ship gate:

- **All work runs on localhost** (operator, 2026-11-25): no `cs`, no Cloud Assistant, no cloud calls.
- **Nothing can ship without `TASKS.md`.** The estate plan gate refuses every shipping command unless
  `<repo>/TASKS.md` validates with ≥1 row and no actionable row. This repository has none.
- **`TASKS.md` is a per-commit record, not a backlog** — measured: `ready` → exit 1, stale blocker → exit 2.
- **A test that has never been red is not proof.** A harness failure is not a reproduction.

v1–v3 were reviewed three times and never reached `ship`. v4's first review returned `ship-with-changes`;
its seven findings are applied below, and **this plan remains uncertified** until a reviewer sees these bytes.

## 0. Proof path

```bash
GATE = pnpm -r build && pnpm check && pnpm test        # in the checkout — green 2026-11-25 (18 files, 137 tests)
FILTERED = pnpm --filter @simonmak-ascent/engine test <token>   # no "--": pnpm drops it and vitest runs everything
```

In the task tables, `-- <token>` is shorthand for `FILTERED`. Measured 2026-11-25:
`pnpm --filter … test -- server-surface` ran every file; `… test server-surface` ran 1.

- **All work runs on localhost.** Operator instruction, 2026-11-25: no remote machine use for this
  repository. Repo tests run **in the checkout**; node-side work, `cs`, Cloud Assistant (`apg-root`)
  and cloud API calls are all out of scope for this plan.
- An increment's evidence is **both** `$GATE` and its filtered command, both green, both after the
  last edit. Record which path ran; never claim a run you did not observe.

## 0.1 Ship gate — `TASKS.md` (prerequisite, tracked)

The estate plan rule (`~/.config/opencode/plugins/_lib/gates/policies/plan.ts`, checker
`~/.config/opencode/bin/plan-state.py`) runs on every shipping command — `git commit`,
`gh pr create`, `vercel deploy`. It reads `<repo>/TASKS.md` and refuses unless the list validates
with ≥1 row and **no actionable row**.

- Table with a `#` header and a `status` column; ids `N.N`.
- Legend, verbatim: `done` · `applied` · `ready` · `blocked by <row>` · `awaiting you` · `yours`.
  Any other word is a row in no queue.
- At commit time every row is `done`/`applied`/operator-owned (`awaiting you`, `yours`), or
  `blocked by` a row that is itself open. Measured against the checker on 2026-11-25:
  a `ready` row exits **1**; a row `blocked by` a completed row exits **2 (STALE)**; all-done and
  a chain ending in `awaiting you` exit **0**.
- **`TASKS.md` is a per-commit record, not a backlog.** It may only contain work that commit
  delivers (marked `done — <command> → <output>`) or work the operator owns. A backlog of `ready`
  rows cannot be committed by construction. The backlog for this repository lives in
  `docs/plan.md` (proposal); `TASKS.md` records what shipped.
- Each increment marks its row in the same commit as the work.
- Check: `python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete`.
- `TASKS.md` is **tracked** (unlike `AGENTS.md`); it is the execution list, not a second issue queue.

## Objective / non-goals

Skill owns knowledge, engine owns determinism, one definition per concern. Non-goals: new methodology
content; gate semantics beyond honesty; UI redesign; `skills/*` before a non-partial client exists.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | `verify` reports, never heals | A check that repairs its arguments is the "check judges itself" failure. Green→red on `e2e`-green projects is documented breaking change. |
| D2 | `env` moves to the skill | Static data already owned by `references/ai-agent-patterns.md`. |
| D3 | Hosted = resources + `skill_get` | Tools 24/24 vs resources 15/24; a model cannot pull a resource. |
| D4 | `skills/*` forward-compat only, only if conformant | SEP-2640 Final, extension Beta. |
| D5 | Three releases | Security first; 1.10.x is the deprecation window. |
| D6 | npm package carries the skill via a `prepack` copy | `files` cannot escape the package directory. |
| D7 | **All work on localhost** — no remote machine use (operator, 2026-11-25) | Repo tests in the checkout; no `cs`, no Cloud Assistant, no cloud calls. |
| D8 | URI space `skill://vision-driven-design/...` | SEP final segment = `name` = loader directory. |
| D9 | `api/mcp.js` reads its version from `server.json` | No build step for the function; a static JSON read is not engine code. |
| D10 | `TASKS.md` is a per-commit record, not a backlog | Measured 2026-11-25: `ready` → exit 1, stale blocker → exit 2. Only delivered or operator-gated work can be committed; the backlog stays in `docs/plan.md`. |
| D11 | `compliance.json` is declared in 1.9.6 | The estate audits how a change reaches production; the repo declares none today. |
| D12 | Adopting `estate-ci.yml` is **deferred**, not assumed | It runs on `ubuntu-latest` (so a public repo could use it), but its probe job checks out `apg-infra` at `job.workflow_sha`; that is a decision with an access question, not a mechanical edit. |
| D13 | **`clone` is removed**, so the surface is four capabilities | It is a URL-to-app generator unrelated to the chain (2,057 LOC) and the only network surface. Operator decision 2026-11-25; A3/A4 below are superseded. |

## Review loop (per increment)

1. **Red first.** The increment authors `<name>.test.ts`. The red run must show a **named assertion
   failure**. `No test files found` and a missing script both exit 1 and are **not** a reproduction.
2. **Minimal fix.**
3. **Prove.** `$GATE` **and** the filtered command, after the last edit.
4. **Dispatch `reviewer`** with files, the red output, and both green commands.
5. **Apply, re-dispatch** — at most **three rounds**.
6. **Ship the increment last.** Only after `ship`: write the `TASKS.md` row (`done — <command> → <output>`)
   and commit. `TASKS.md` is `.md`, so editing it does not void the byte-bound verdict; a code edit would.
   **One increment = one commit** — if it needs more, split the task into sub-rows up front.
7. **Stop.** Round 3 without `ship` ⇒ the increment is **blocked**: not merged, not shrunk. Record
   `blocked: <id> — <findings>`; the release drops it with a recorded scope change or slips, and the
   operator is told which.

The gate reads `<repo>/TASKS.md` from the working tree (the checker is invoked with `--path`), so the
first commit can introduce the file; the row describing that commit is `done`.

Verdict binds to bytes; any code edit after `ship` voids it; one shipping action per command.

## Preconditions

| id | Task | verify |
|---|---|---|
| A0 | *Withdrawn.* A second `test` script makes `pnpm -r test` run the whole suite twice; the engine filter covers the mcp tests | — |
| A00 | Widen `.github/workflows/vdd-quality-gates.yml` `pull_request.paths` to `packages/**`, `api/**`, `scripts/**`, `docs/**`, `package.json`, `server.json`, `vitest.config.ts` | `grep -q 'packages/\*\*' .github/workflows/vdd-quality-gates.yml`; `gh pr checks <pr>` on the first PR |
| A01 | **Author `TASKS.md` for the first change-set only** — the rows that commit actually delivers, each `done — <command> → <output>` — and commit it with that work. It is a per-commit record, not the backlog; a `ready` row exits 1 and a stale blocker exits 2 (measured 2026-11-25) | `python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete` exits 0 |
| A02 | Add `compliance.json` via `compliance-propose`, resolving both TODOs: `verify` = `["pnpm -r build","pnpm -r check","pnpm -r test"]`; `deploy` = `{kind, reason}` naming Vercel (`main` → vdd.simonmak.com) and recording npm-on-`v*`-tag in `reason` | `test -f compliance.json && ! grep -q TODO compliance.json` |

## Release 1.9.6 — live vulnerabilities + shipment

| id | Task | Depends | verify |
|---|---|---|---|
| A1 | `feature` rule `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$` — one path segment, admitting the documented `A-###` form and kebab-case — at the engine choke point, the schema and the hosted twin. **Landed 2026-11-25**: `engine.ts:49-56` (validator), `:82` (choke point), `:636` (validate); `server.ts:16-18` (pattern) | A01 | `-- feature-arg` (engine) **and** `-- feature-schema` (mcp) |
| A2 | Confine `projectRoot`; `writeArtifact` is `mkdir -p` anywhere. **Landed 2026-11-25**: `project-root.ts:33-39`, wired in `server.ts` and `cli.ts` | A1 | `-- project-root` **and** the HTTP surface case in `http-transport.test.ts` |
| A3 | *Superseded (D13): `clone` removed, so the SSRF gate has no subject.* Original scope: New `assert-public-target` module + `assert-public-target.test.ts`: reject localhost/private/link-local/`100.100.100.200`/IPv6 equivalents; `dns.lookup({all:true})`, refuse if **any** answer is private; return the addresses for pinning. **Landed 2026-11-25**: `assert-public-target.ts`, gate in `runClone` and `crawlSite`, `redirect:'manual'` with a per-hop guard including sitemap discovery. `normalize-domain` stays a permissive normalizer — the gate is the control. **Residual:** IP pinning (validate-then-fetch is still TOCTOU, so DNS rebinding can reach a private address), `capture`'s redirects **and its stylesheet fetch**, `evidence`'s `page.goto`, the browserless service (its initial URL is gated; redirects and subresources inside the service are not), hosted `projectRoot` (its `writeTargets` are executed by the caller's agent and are not confined), token/host (A4) | — | `-- assert-public-target`; `-- crawl` (refusal + redirect cases) |
| A4 | *Superseded (D13): `clone` removed.* Browserless token as a header (`crawl.ts:146`, `capture.ts:201`); host explicitly configured, non-loopback | A3 | `-- crawl` (the browserless request case) asserts the header and that no token appears in the query |
| A5 | `artifactFiles` caps (64 / 256 KiB) in the engine choke point | A1 | `-- artifact-files` |
| A6 | Ship 1.9.6: engine/cli 1.9.0→1.9.1, mcp 1.9.5→1.9.6, `SERVER_VERSION` (`api/_vdd-rpc.js:892`), `server.json`, CHANGELOG, tag `v1.9.6`, global re-patch. `scripts/copy-skill.mjs` copies root `SKILL.md`/`references/`/`domain-primers/` into `packages/vdd-mcp/`, `files` gains them, `"prepack"` runs it, copied paths added to `.gitignore` | A1–A5, A02 | `(cd packages/vdd-mcp && npm pack --dry-run 2>&1 \| grep -q 'references/')`; version-parity test; `git describe --tags --exact-match HEAD` after tagging |

**Delivered 2026-11-25 (unreviewed code, uncommitted):** A1, A2, A3. Evidence: `feature-arg` 8,
`feature-schema` 16, `project-root` 10, `http-transport` 3, `assert-public-target` 27 and the crawl
refusal/redirect cases; `$GATE` 18 files / 137 tests. The red runs are in the session log — the
traversal test failed twice for the wrong reason, and the redirect test exposed a bypass
(`discoverSitemap` called `fetchText` without the guard) before it passed. A0 is withdrawn.
They land as **one combined `TASKS.md` row** because they were proven together; later increments keep
one commit each.

**Rollback:** `npm deprecate "@simonmak-ascent/mcp@1.9.6" "…"`; `npm dist-tag add @simonmak-ascent/mcp@1.9.5 latest`; `npm dist-tag add @simonmak-ascent/engine@1.9.0 latest`; `npm dist-tag add @simonmak-ascent/cli@1.9.0 latest`.

## Release 1.10.0 — expose verification (additive)

| id | Task | Depends | verify |
|---|---|---|---|
| B1 | Extract `runGates`; add `PHASES.verify = validate() + runGates()` | A6 | `-- verify-equiv` |
| B2 | One verdict rule and denominator (`gateSummary` `:1346-1360`; `makeGateFail` `:1331`); no `allPassed` with zero features | B1 | `-- verify-shape` |
| B3 | G7 reads hand-authored `impact-report.md`, else `.generated.md`; stop 6/15 duplicate predicates | B1 | `-- verify-g7` |
| B4+B5 | One increment: conformance test (red recorded) then fix `references/artifact-templates.md` | B1 | `-- template-conformance` |
| B6 | Verification stamp | B2 | `-- verify-stamp` |
| B7 | Coexistence: full `tools/list` JSON, `resources/list == []`, `verify` as `after = before ∪ {verify}`, version triplet, stdio **and** hosted | B1 | `-- surface-snapshot` |
| B8 | 1.10.0 publishes **21** prompts; state it in CHANGELOG and README | B7 | `-- surface-snapshot` asserts 21 on both; `grep -q "prompts (21)" README.md` |
| B9 | Release 1.10.0 (engine/cli 1.9.2, mcp 1.10.0, `SERVER_VERSION`, `server.json`, tag `v1.10.0`, global re-patch) | B1–B8 | version-parity test; `git describe --tags --exact-match HEAD` after tagging |

**Rollback:** `npm dist-tag add '@simonmak-ascent/mcp@1.9.6' latest`; `npm deprecate '@simonmak-ascent/mcp@1.10.0' '…'`; engine/cli `1.9.1`.

## Release 2.0.0 — shrink the surface

| id | Task | Depends | verify |
|---|---|---|---|
| C1 | Registry (5) with per-surface affordances. Verify: every registry `phase` ∈ `PHASES` (subset, length asserted) | B9 | `-- registry` |
| C2 | Generate `server.ts`; delete `PHASE_INPUT_SCHEMAS`/`TOOL_ANNOTATIONS`/`MCP_TOOL_PHASES`; rewrite `server-surface.test.ts`, `http-transport.test.ts`, `feature-schema.test.ts` (imports `PHASE_INPUT_SCHEMAS`), `surface-snapshot`; delete `api-surface.test.ts` | C1 | `-- surface-registry`; `$GATE`; `! grep -rq PHASE_INPUT_SCHEMAS packages/*/src packages/*/test` |
| C3 | Generate `cli.ts`; author `scripts/fixtures/cli-help.txt` | C1 | `diff <(node packages/vdd-cli/dist/cli.js --help) scripts/fixtures/cli-help.txt` |
| C4 | Delete `prompts.ts`; `prompts/list` → `[]`; retract every 21-prompt claim — `llms.txt:27`, `llms.txt:32` ("serve all 21"), and the README line B8 adds | C2 | `-- prompts-empty`; `! grep -rqE 'prompts \(21\)|serve all 21' llms.txt README.md` |
| C6 | Add the `env` table to `references/ai-agent-patterns.md`, and assert each surviving phase's `required`/`optional` equals `TOOL_REQUIREMENTS[phase]` **before** C5 deletes the source | C4 | `-- env-doc` (table matches the captured rows) |
| C5 | One increment: delete the 14 non-registry `PHASES` keys (incl. `validate`; the registry's `verify.phase` is `verify`, composing `validate` + gates), `strategize`'s `detectEnvironment` block, `detectEnvironmentPhase`, `detectEnvironment`, `TOOL_REQUIREMENTS`, `PHASE_NAMES`/`PhaseName`/`TOOL_KEYS`/`WRITE_PHASE_NAMES` and the `index.ts` re-exports they feed; prune `PHASE_META`; rewrite `verify-equiv` and the `env-doc` test (switch it to C6's captured rows once `TOOL_REQUIREMENTS` is gone) | C6, C3 | `-- registry` set-equality (5); `$GATE`; `! grep -rqE 'detectEnvironment|detect-environment|TOOL_KEYS|WRITE_PHASE_NAMES|PHASE_NAMES|PhaseName|TOOL_REQUIREMENTS' packages/vdd-engine/src`; `node packages/vdd-cli/dist/cli.js init; test $? -ne 0` |
| C7 | Manifest resolver in `packages/`: allowlist, no path from URI, reject `%`/`\`/`:`/empty/`.`/`..`, `lstat` symlink refusal, `realpath` via `path.relative`, `.md`, 256 KiB | C1 | `-- resource-uri` |
| C8 | Build-time manifest (20 files, `sha256:`+size, atomic, ≤512/16 MiB); `SKILL.md` frontmatter `name: vision-driven-design`; assert `uri` set = on-disk set | C7 | `-- skill-manifest`; digest recomputed independently |
| C9 | `api/mcp.js`: `resources/*`, `skill_get`, `skills/*`, version from `server.json`; delete `api/_vdd-rpc.js`; rewrite `surface-snapshot`'s `resources/list` assertion; **drop the `node --check api/_vdd-rpc.js` step at `vdd-quality-gates.yml:96` in this commit** (otherwise C9's own PR and the merge to `main` are red) | C2, C7, C8 | `-- hosted-resources`; `$GATE`; `! grep -q '_vdd-rpc' .github/workflows/vdd-quality-gates.yml` |
| C10 | `vercel.json includeFiles` generated from `manifest ∪ {server.json}` | C8, C13 | `node scripts/check-contract.mjs --include-files` |
| C11 | Body/batch caps: root handler test requiring `../../../api/mcp.js` | C9 | `-- resource-limits` |
| C12 | *Withdrawn — folded into C2 and C5.* | — | — |
| C13 | Contract check, fail-closed: built registry, length first, empty-extraction failure, `/vdd:[a-z-]+` and `vdd_*`, anchors, `_vdd-rpc.js` absent, `includeFiles == manifest ∪ {server.json}`; four fixtures | C9 | `node scripts/check-contract.mjs --root fixtures/<f>; test $? -eq 1` ×4 |
| C14 | Generate-and-diff for generated surfaces; drift fixture must exit 1 | C13 | `node scripts/check-contract.mjs --diff --root fixtures/contract-drift; test $? -eq 1` |
| C15a | **Rewrite the live surface copy**: `README.md` (`:13` badge, `:233` §MCP API, `:259` `### MCP Tools (15)`, `:415-418` §Repository Structure), `SKILL.md` (`:249-252`, §MCP & Packages), `llms.txt`, `references/quick-reference.md`, `docs/deployment.md`, `context7.json`, `glama.json`, the `packages/vdd-mcp`, `packages/vdd-engine` **and `packages/vdd-cli`** `package.json` descriptions; edit **all six** `15` claims in `scripts/gen-landing.py` — stat cards `:38`, `:81`, `:124` and caps `:45`, `:88`, `:131` — **then** regenerate the three `index.html` | C5 | `! grep -rqE '15|17 subcommands|17 phase' scripts/gen-landing.py packages/*/package.json`; `python3 scripts/gen-landing.py && git add index.html zh/index.html hk/index.html && python3 scripts/gen-landing.py && git diff --exit-code -- index.html zh/index.html hk/index.html` (idempotency: a second run changes nothing); C15 is the sweep that proves the result |
| C15 | Surface-text sweep (`scripts/check-surface-text.mjs --root <dir>`): authors `fixtures/surface-stale`; explicit live list, excludes `docs/plan.md`, `docs/architecture.md`, `CHANGELOG`, `AGENTS.md`, `constitution.md`, `TASKS.md`; **reject** (case-insensitive) `15 tools`, `mcp tools \(15\)`, `15%20tools`, `15 \`vdd_\*\` tools`, `15 个工具`, `15 個工具`, `17 subcommands`, `17 phase`, `<dt>tools</dt><dd>15</dd>`, `<dt>个工具</dt><dd>15</dd>`, `<dt>個工具</dt><dd>15</dd>`; **equality assertion** on `108` — still present and unchanged (113 fails), not a reject pattern; runs after C9 so `api/_vdd-rpc.js` is gone | C15a, C9 | `--root fixtures/surface-stale; test $? -eq 1` **and** repo run `test $? -eq 0` |
| C16 | 2.0.0 across the workspace; `SERVER_VERSION` owner (`packages/vdd-mcp/src/version.ts`); extend `scripts/verify-publish.mjs` to assert the tarball has `references/`; migration doc; tag `v2.0.0` | C9 | `-- version-parity`; `(cd packages/vdd-mcp && npm pack --dry-run 2>&1 \| grep -q 'references/')`; `pnpm verify:publish`; `git describe --tags --exact-match HEAD` after tagging |
| C17 | CI: add contract + surface-text checks to a failing step (the `node --check` removal already landed in C9) | C9, C13 | `gh pr checks <pr>` on the 2.0.0 PR |
| C18 | Post-publish only: production test, then `npm deprecate` 1.x with the migration URL | C16, C17 | `curl` `resources/list`, one `resources/read`, `skill_get`; `npm view` |

**Rollback (2.0.0):** `npm dist-tag add '@simonmak-ascent/mcp@1.10.0' latest`; `npm deprecate '@simonmak-ascent/mcp@2.0.0' '…'`; engine/cli `dist-tag` to 1.9.2; `vercel rollback`.

## Dependency graph

```
A01 → A1 → A2, A5
A01 (TASKS.md) — must land first; every commit updates its row
A00, A02 (independent)
A3 → A4
A1–A5, A02 → A6                             (1.9.6)
B1 → B2 → B3, B6
 ├→ B4+B5
 └→ B7 → B8 → B9                            (1.10.0)
C1 → C2 → C4 → C6 → C5
 ├→ C3 → C5
 └→ C7 → C8 → C9 → C11
        └→ C13 (needs C9) → C10 (needs C8 + C13)
C5 → C15a
C13 → C14
C9, C15a, C14 → C15
C13 → C16 → C17 → C18                       (2.0.0)
```

A release ships only when every task passed the loop **and** `TASKS.md` is complete.

## Proof strategy — unprovable locally

| Claim | Proof | If unprovable |
|---|---|---|
| Template conformance | engine test on a temp project from the doc | — |
| URI traversal | `resource-uri`, all vectors | — |
| SSRF | `assert-public-target` (A3) | removed with `clone` (D13) — no VDD surface fetches |
| Vercel bundle | post-deploy `curl` | merge gate, not local |
| CI gates the PR | first PR's `gh pr checks` | yaml assertion before that |

## Risk register

| Risk | Mitigation |
|---|---|
| Plan gate blocks every commit | Each commit carries only delivered rows (measured semantics); the backlog never enters `TASKS.md` |
| Green→red under `verify` | Intended (D1); migration note; `verify` names the failing gate id |
| Deleting fourteen keys breaks CLI users | 1.10.0 keeps them; 2.0.0 major; migration note |
| `includeFiles` misconfigured → 500 | C10 generated from the manifest; C13 asserts equality |
| Contract check vacuous | four must-fail fixtures; length first; exit-code assertion |
| `prepack` copy stale | copied dirs gitignored; `npm pack --dry-run` is the guard |
| Estate CI conformance gap | D12: deferred, recorded, not silently claimed |

## Review log

| Round | Scope | Verdict | Applied | Evidence |
|---|---|---|---|---|
| 1 | architecture + plan v1 | `ship-with-changes` | runner (A0), C1 subset, test rewrites, CI paths, release/rollback, 108 inventory, D7/D8, loop | `pnpm -r build && pnpm check && pnpm test` → 14 files, 73 tests |
| 2 | plan v2 | `ship-with-changes` | C5 deletion set, env before equality, rewrites moved into breaking tasks, C15 scoped, prepack, version locators | same command, same result |
| 3 | plan v3 | `ship-with-changes` — budget exhausted | C5+C6 merged, `includeFiles = manifest ∪ {server.json}`, C9 rewrites `resources/list`, C15 `--root`, `grep -rq`, 1.10 rollback, graph edges | document-only |
| 4.1 | plan v4 | `ship-with-changes` | loop reordered (review before commit), `TASKS.md` bootstrap recorded, A0 withdrawn (double-run), probe rule made operational, A02 shape, A3 rewritten, C5 deletion set + `PHASE_NAMES`, C6 equality check, C15a added, sweep exclusions | review evidence document-only |
| 4.2 | plan v4.1 | `ship-with-changes` | A02 `test -f`, C2 `feature-schema` + scoped grep, C4 `llms.txt:32` + README, C5 `env-doc` rewrite + full grep + real CLI path, C15a generator edit, A1/A2 reconciled to landed bytes, architecture status/phase/V8/§6 | 18/137 |
| 4.3 | plan v4.2 | `ship-with-changes` | C15a all six `gen-landing.py` claims + `vdd-cli` description, C15 stat-card/localised patterns, C4 `serve all 21`, A4 verify → `-- crawl`, graph `C5 → C15a → C15`, counts 18/137 | 18/137 |
| 4.4 | plan v4.3 | `ship-with-changes` | C15 full localised cards + `108` equality + badge pattern, C16 pack inside the package, architecture A3/V7 annotations, combined first row | 18/137 |
| 4.5 | plan v4.4 | `ship-with-changes` | C15a `README:415-418` / `SKILL:249-252`, fixture ownership | 18/137 |
| 4.6 | plan v4.5 | `ship-with-changes` | `README:259`, `api/_vdd-rpc.js` ordering (`C9 → C15`), `17 subcommands`/`17 phase` patterns, scoped `git diff`, this log | 18/137 |
| 4.7 | plan v4.6 | `ship-with-changes` | `npm pack \| grep -q 'references/'` (the bare `npm pack` exited 0 regardless), C9 drops the CI `node --check` line in its own commit, C15 rejects `15 \`vdd_*\` tools` / `15 个工具` / `15 個工具`, C15a idempotency check, architecture `package.json` ×3, log renumbered | 18/137 |
| 4.8 | plan v4.7 | **`ship`** | — (certified; no blockers in (a)–(d)) | 18/137 |

> **Certified 2026-11-25.** Seven review rounds on v4 — four beyond the three-round budget, all under
> the operator's "certify the plan" instruction. The plan's control is C15 (surface-text sweep); it
> is authored by C15 and cannot be observed before implementation, which is a limit of reviewing a
> plan, not a defect in it. Implementation notes from the final round are recorded below, not acted on:
> `README.md:419` is one line past C15a's range; `architecture.md:210-213` attributes a frontmatter
> rule to `scripts/install.sh` that the script does not have (the URI space holds on SEP-2640 alone);
> C17's Depends cell omits C15/C16 while its step invokes C15's script (the graph orders it safely).

## Definition of done

Per release: every task passed the loop (≤3 rounds, verdict bound to tested bytes), `$GATE` green
after the last edit, the `TASKS.md` row marked `done — <command> → <output>` in the same commit, PR
merged on green checks, branch deleted, deploy through the repo's own path, production URL returns
the expected status. A pending check is reported as pending.
