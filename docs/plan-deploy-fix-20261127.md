# Plan — restore the hosted endpoint at 2.0.0 (deploy repair) — v4

> **Mode note and destination.** Plan mode declares `/home/simonmak/.opencode/plan` as its plan directory,
> but `write` refuses every target inside it, reporting the path as "outside the Plan directory" (measured
> 2026-11-27, and recorded in v1 for the same reason). The requesting session named
> `docs/plan-deploy-fix-20261127.md`, so the artefact lives there. If the plan directory becomes writable,
> this file is a move, not a re-authoring. Nothing below is an implementation edit.
>
> **v4.** The decision is unchanged: A′, a committed generated bundle. Two HIGH were found in v3's own
> controls, both mechanical. **H8** — v3's M10 fix added `! grep -n 'dynamic import' api/_vdd-rpc.cjs` in
> three places, but the sentence it targets is split across `api/_vdd-rpc.cjs:7-8`, so a line-oriented
> `grep` matches nothing; the fragment `'reaches both by dynamic'` is what matches. **H9** — T9 completes
> when its two preview lines are "in row 5.3", but row 5.3 is written by T11, which recorded only T10's
> output, the Q8 result and the §6 decision, so T9's evidence had no landing place. Both are answered in
> §10 as H8–H9, with the sections each changed. No finding re-opens the decision.
>
> **v3.** The decision is unchanged: A′, a committed generated bundle. A second review round raised 2 HIGH,
> 4 MEDIUM and 4 LOW; all four HIGH/MEDIUM classes are ordering, baseline or wording, and none re-opens the
> decision. The two HIGH were tasks that could not execute: T5 restored an untracked file with
> `git checkout --` (exit 128, the `&&` chain stops, the injected drift stays), and T11 forbade the only
> commit it can make. Each finding is answered in §10 as H6–H7, M9–M12, L7–L10, with the section it changed.
> v2's note is kept below verbatim: it is the record of the earlier round.
>
> **v2.** The decision is unchanged: A′, a committed generated bundle. The review's 5 HIGH, 8 MEDIUM and
> 6 LOW findings are answered one by one in §10, with the section each one changed. No finding re-opens
> the decision.
>
> **Relationship to prior plans.** `docs/plan-restructure-v5.md:1` is the plan that produced 2.0.0; this
> plan repairs one delivery assumption of it and supersedes none of its decisions. It does **retire one of
> its fallbacks**: v5 names `vercel.json` `includeFiles` as the remedy if the deploy 500s (`:64`), as the
> rollback (`:622`) and as Q2's resolution (`:707`). The property was already present when production
> 500'd — `vercel.json:5` at `abc8ed1` carries the glob and the file was still absent from the function —
> so the fallback is retired by evidence, not by preference. v5 is not edited; this paragraph and §3 row 4
> are the record.
>
> **The traceability half.** v5 `:656-657` define rows 4.8–4.10; `TASKS.md` carries none of them (the last
> row is 2.4 at `TASKS.md:30`), so row 4.9 — the one that owns the production probe — never existed in the
> execution list. §6 records this. It is why the defect could reach production unprobed.

Depth: **thorough** — cross-cutting (Vercel function packaging, build order, the `api/` runtime, CI, npm
release state). Every locator below was read at plan time against `main` = `abc8ed1`
(`.git/refs/heads/main`, `.git/refs/tags/v2.0.0`), and re-read for v2, again for v3 and again for v4 on
2026-11-27.

---

## 1. Decision

**Adopt A′ — a committed, generated bundle**: add `scripts/bundle-api.mjs`, which runs esbuild over
`packages/vdd-mcp/dist/handler.js` and writes `api/_vdd-core.cjs` (CJS, self-contained, ~1.5 MB), commit
that file, and change `api/_vdd-rpc.cjs` from `corePromise ??= import('../packages/vdd-mcp/dist/handler.js')`
to a lazy, literal `require('./_vdd-core.cjs')`; add `--check` idempotency in the shape this repository
already uses for `packages/vdd-mcp/src/generated/skills.ts` (`scripts/gen-skill-manifest.mjs:2-13`,
asserted at `packages/vdd-mcp/test/skill-manifest.test.ts:106-114`). Nothing is generated at deploy time,
so the undocumented build-order behaviour of the `/api` scan becomes irrelevant rather than merely worked
around; the packaged function then contains three files it owns and a static `require` chain
(`api/mcp.js:12` → `_vdd-rpc.cjs` → `_vdd-core.cjs`) that no tracer can miss.

### 1.1 The evidence the choice rests on

| # | Fact | Evidence | Consequence |
|---|---|---|---|
| 1 | The failing import is a **relative path out of the function directory**: `import('../packages/vdd-mcp/dist/handler.js')` | `api/_vdd-rpc.cjs:31` | The Vercel error names exactly `/var/task/packages/vdd-mcp/dist/handler.js`, which proves the file was **absent from the packaged function**. It does not prove which layout was intended. A fix must not depend on files outside `api/` existing at package time |
| 2 | The build output is not runnable on its own: the SDK, `zod`, `server/ext/skills` and the workspace engine are all bare specifiers | `packages/vdd-mcp/src/handler.ts:1`; `src/server.ts:1-4`; `src/skills.ts:1` | Shipping `dist/` without a `node_modules` tree only moves the error one link down the chain (`Cannot find module '@modelcontextprotocol/server'`) |
| 3 | Root `package.json` declares no `dependencies`, and no `devDependencies` before T1 | `package.json:27-39` (scripts, engines, `packageManager`, version) | Option B moves the **runtime** tree into a file that is a workspace root plus a static-site shim. T1 adds one **build-time** `devDependency` (`esbuild`) — a tool that produces an artefact the deploy does not import — which is a different thing from a runtime tree and is what makes the generator reproducible |
| 4 | `includeFiles` is one root-relative glob string with brace expansion; the schema is `string ≤256` | Vercel project-config schema; Vercel's own PR example `"{api/glib-2.0,api/libmsi-1.0}/**"` | The glob at `vercel.json:5` is syntactically right, so the variable is **when**, not **what** |
| 5 | Build order is undocumented. A user report says `/api` is scanned before `buildCommand`; a 2020 Vercel comment says two builds run concurrently | Neither is current documentation | The prime suspect, and not provable from documents. A′ is correct whichever of them is true |
| 6 | `@vercel/nft` traces literal `import('…')`; `base` is the repo root | Vercel build-output docs / nft README | A **static** `require('./_vdd-core.cjs')` is the strictly easier case: same directory, no resolution |
| 7 | A bundle of that entry point is 1.5 MB and answers correctly (`tools/list` → 3 tools; `skills/list` → 9 URIs) | Parent-verified, `npx esbuild@0.24 … --bundle --platform=node --format=cjs` | Size is irrelevant against the 250 MB uncompressed function limit. The exact version behind the probe was not recorded — M1 closes that with an assertion |
| 8 | The repository already commits a generated artefact with a `--check`, and the suite runs it | `scripts/gen-skill-manifest.mjs:2-13`; `packages/vdd-mcp/test/skill-manifest.test.ts:106-114` | A′ is the existing convention, not a new one |
| 9 | Preview deployments answer **401** with `vercel_auth_callback` (deployment protection); the documented bypass header is `x-vercel-protection-bypass` | Parent probe; the project exposes `update_project_protection_bypass` | The preview-first gate needs an automation bypass (§5.2), held by the operator, not written to disk |
| 10 | `api/` holds exactly two files today, and `_`-prefixed files there are never routes | `api/` listing; `CHANGELOG.md:156` | `api/_vdd-core.cjs` adds no endpoint |

### 1.2 The options, and why each other one lost

| Option | Verdict | Reason |
|---|---|---|
| **A′ committed bundle** | **chosen** | No deploy-time generation ⇒ build order cannot matter (§1.1 #5). One self-contained file ⇒ the static require chain is the only thing to trace (#6). Reuses a tested convention (#8) |
| **A build-time bundle into `api/`** | rejected | Still relies on the same undocumented ordering **and** on an undocumented second fact: that a file created in `api/` during `buildCommand` becomes part of a function. Two unknowns to buy one saved megabyte |
| **B root dependencies + keep the dist glob** | rejected | Does not address the failure. The broken specifier is `../packages/vdd-mcp/dist/handler.js` (`api/_vdd-rpc.cjs:31`), a relative path a root dependency cannot create. And §1.1 #2 says the *next* failure is the transitive SDK import, which `dist/` alone never satisfies |
| **C glob fix only** | rejected | Same root cause as B with less added: if `packages/*/dist` does not exist when the function is packaged, a wider glob matches nothing. This is the lever v5 `:64` named and it was already in place (`vercel.json:5`) when production broke |
| **D `vercel build --standalone` from CI** | **runner-up** | The *documented* lever, and it would work. It loses on cost: it moves deployment out of Vercel's git integration into a job holding `VERCEL_TOKEN` plus project/org identifiers, changes how every future deploy happens, and leaves the dynamic import at `api/_vdd-rpc.cjs:31` — the line at fault — in place. It is the fallback if A′ fails (§7) |

**Cost accepted in A′.** 1.5 MB, committed **unminified and without a sourcemap**. Unminified because a
production stack trace then reads as `/var/task/api/_vdd-core.cjs:<line>` against real module comments,
which is the difference between a five-minute and a one-hour diagnosis at the moment it matters;
minification would add a flag whose determinism nobody here has measured. Review cost is bounded by
`.gitattributes` (`linguist-generated=true`) and the `--check` control, not by reading the file.

**Determinism, which is what makes a committed generated file reviewable at all.**
`scripts/gen-skill-manifest.mjs:41-45` states the rule this repository already holds itself to — a
`--check` that disagrees with itself across machines is worse than no check. The bundle inherits it: the
generator passes an explicit `absWorkingDir` (the repository root, derived from `import.meta.url`, never
`process.cwd()`), `platform:'node'`, `format:'cjs'`, `target:'node22'`, `bundle:true`, `minify:false`,
`sourcemap:false`, and writes one banner line naming `esbuild.version`. Nothing else in the output depends
on the machine. Two consecutive runs must produce byte-identical files, and that is **asserted**
(`sha256sum` before and after), not assumed.

**What the commit costs on an ordinary change — the real diff-noise answer.** Every edit under
`packages/vdd-mcp/src/`, `packages/vdd-engine/src/` or `skills/**/*.md` changes the bundle — a skill file
reaches it through `scripts/gen-skill-manifest.mjs:21-22` → `packages/vdd-mcp/src/generated/skills.ts`
(imported at `src/skills.ts:3`, reached from `src/server.ts:6`), all of which `dist/handler.js` bundles —
and so does a dependency bump. Assertion 1 and the CI step fail until someone runs `pnpm bundle:api` and
commits ~1.5 MB again. That is the same property `generated/skills.ts` already has: a source change owes a
regenerated artefact in the same commit. It is
not free and it is not hidden. `git blame` on the file is not useful and is not meant to be:
`.git-blame-ignore-revs` gains the SHA of the first commit that **regenerates an already-committed**
bundle — not the creating commit, which is the file's only history and should keep owning it — and that
rule is recorded here so the next regeneration does it (`git config blame.ignoreRevsFile
.git-blame-ignore-revs`).

---

## 2. Open questions

| # | Question | Answer / status |
|---|---|---|
| Q1 | Why was `handler.js` absent when the glob names it? | **Build order — unverified.** Undocumented, two contradictory secondary sources (§1.1 #5). **Settled for this plan by making the diagnosis unnecessary**: A′ creates no deploy-time input from `dist/`. The incident is not explained here and does not need to be |
| Q2 | Does a file written into `api/` during `buildCommand` join the function? | **Unknown**, no documentation. This is why A is rejected; A′ never asks. Q2's *remedy* in v5 (`:64`, `:622`, `:707`) is retired: the glob was present at `vercel.json:5` and the file was still missing |
| Q3 | Which esbuild version? | **Pinned by assertion, not verified at plan time.** The version behind the 1.5 MB probe (§1.1 #7) was not recorded. The generator writes `esbuild.version` into the banner and `--check` fails when the running version differs, so a different 0.24.x cannot pass by construction. Settled by T1's `--check` run on a fresh install |
| Q4 | Does nft follow a static `require('./_vdd-core.cjs')`? | Documented only for literal `import()` (§1.1 #6); static CJS `require` is the same static form and is what Vercel's Node runtime assumes, but is not separately documented. **Settled by the preview probe (§5.2), which gates the merge** |
| Q5 | Will gitleaks or the licence/SBOM job object to a 1.5 MB generated file? | **Unverified.** `secret-scan.yml:22-26` runs `gitleaks/gitleaks-action` with `GITLEAKS_CONFIG: .gitleaks.toml`, and `.gitleaks.toml:4-5` extends the default ruleset — so the default rules do cover the new file. Settled by the PR's own checks; mitigation is a path-scoped allowlist **with a reason**, never a disabled scan |
| Q6 | Is `includeFiles` still needed after A′? | **No.** Once the shim requires its sibling, nothing under `api/` reads outside `api/`. Verified over **all three** files, not one: T2's grep covers `api/mcp.js` and `api/_vdd-rpc.cjs`, and a separate machine check covers the generated `api/_vdd-core.cjs` (every `require(…)` specifier is a Node builtin or a relative path; no `../packages/`). The generated file is the one nobody reads by hand, so it gets a check rather than a promise |
| Q7 | Does the estate plan gate allow the commits? | **Yes.** `TASKS.md` carries no `ready` row (every row is `… done — …`; last row at `TASKS.md:30`), so `plan-state.py --require-complete` passes. New rows are written `done — <command and output>` in the commit that owns them — 5.1 and 5.2 in the source commit (T8), 5.3 after the merge (T11) — never `ready`, which would block the commit that introduces it. Their content is fixed in §9's row mapping, not left to the executor |
| Q8 | Is 1.10.1 already deprecated? | **Unverified.** v5 `:336-338` told the 2.0.0 release to `npm deprecate '@simonmak-ascent/mcp@1.10.1'` with the migration pointer. Settled by `npm view @simonmak-ascent/mcp@1.10.1 deprecated` (empty ⇒ not deprecated), which §6.3 requires before its fallback is taken |

---

## 3. File-by-file change list

| # | Path | Change | Why |
|---|---|---|---|
| 1 | `scripts/bundle-api.mjs` | **New.** esbuild `build({entryPoints:['packages/vdd-mcp/dist/handler.js'], bundle:true, platform:'node', format:'cjs', target:'node22', minify:false, sourcemap:false, absWorkingDir:<repo root from import.meta.url>, write:false})`; prepends one banner line naming `esbuild.version`; writes `api/_vdd-core.cjs`; `--check` re-derives into memory, exits 1 on any byte difference **or** when the running `esbuild.version` differs from the banner, printing the size delta | The generator and the idempotency control, in the `gen-skill-manifest.mjs` shape. Root comes from `import.meta.url` (`gen-skill-manifest.mjs:20`), never the cwd |
| 2 | `api/_vdd-core.cjs` | **New, generated, committed.** ~1.5 MB CJS | The deployable core. Committed because deploy time must not depend on `dist/` |
| 3 | `api/_vdd-rpc.cjs` | **Edit** `:1-9`, `:25-33`, `:66`. Header: it is an adapter over the **generated, committed** bundle, not a shim over `dist/`. Body: `let core = null; function getCore() { return (core ??= require('./_vdd-core.cjs')); }` — a lazy but **literal** specifier, so `OPTIONS`/`DELETE`/browser `GET` do not load 1.5 MB and nft still traces the path. `handleJsonRpc` calls `createVddHandler()` on the returned module and stays `async`, so `api/mcp.js:67`, `:76` and `:80` are untouched. `SERVER_VERSION` at `:11` unchanged | Replaces the one relative path that leaves the function directory with a static sibling require, and stops the file's own comments describing a mechanism that no longer exists |
| 4 | `vercel.json` | **Edit** `:5`: delete the `includeFiles` property; `maxDuration: 30` (`:4`) and the redirect/rewrite block stay | The function no longer needs the `dist` trees. Leaving the glob would keep a mechanism known not to have worked, and it is the remedy v5 `:64`/`:622`/`:707` still names — removing it is what retires that fallback |
| 5 | `package.json` | **Edit** `:27-34`: add `"bundle:api": "node scripts/bundle-api.mjs"` and `"bundle:api:check": "node scripts/bundle-api.mjs --check"`; add `devDependencies.esbuild` pinned **exactly** (no caret) to the version that produced the committed bundle | Reproducibility: `npx esbuild@0.24` is not a pin |
| 6 | `packages/vdd-mcp/test/hosted-bundle.test.ts` | **New.** The regression control (§4). Every path resolved from `import.meta.url` | The only test that can fail the way production failed |
| 7 | `packages/vdd-mcp/test/hosted-shim.test.ts` | **Edit** the comment at `:9-12`: "It requires `pnpm -r build` first: the shim imports `packages/vdd-mcp/dist`" becomes false; state that the shim imports the committed bundle and that `hosted-bundle.test.ts` owns the packaging control | A rationale that is wrong about the code beside it is a recorded failure mode here |
| 8 | `.github/workflows/vdd-quality-gates.yml` | **Edit**: one new step after `Test` (`:85-86`) — `node scripts/bundle-api.mjs --check` — and the syntax step (`:88-89`) gains `api/_vdd-core.cjs`. The job **already** builds at `:79-80` and tests at `:85-86`; the step is not a second build | A stale committed bundle fails CI, not production. **The step is deliberate redundancy over assertion 1**, which already runs inside the suite at `:85-86`; it exists so a stale bundle fails with a message naming the bundle rather than an assertion inside a test file, and R4's control is assertion 1, not this step |
| 9 | `.gitattributes` | **New.** `api/_vdd-core.cjs linguist-generated=true` | Bounds review cost. Deliberately **not** `-diff`: the `--check` guards correctness, so hiding an accidental hand-edit buys nothing |
| 10 | `README.md` | **Edit** `:392-394`: add `_vdd-core.cjs` to the `api/` tree with "generated by `scripts/bundle-api.mjs`; do not edit"; and `:395` "seven installer, landing and manifest helpers" → "eight installer, landing, **bundler** and manifest helpers" | The tree claims to list the entry point's files, and the `scripts/` count is real — seven files today, `scripts/*` at `abc8ed1`, eight after this plan |
| 11 | `docs/deployment.md` | **Edit** the hosted section (`:37-53`): one sentence naming the committed bundle and the regenerate command | Where a deployer looks for "how is this function built" |
| 12 | `TASKS.md` | **New** rows 5.1 and 5.2 in the source commit, 5.3 at T11, each `done — <command and output>`; content fixed in §9's row mapping | The plan gate (`TASKS.md:3-8`) |
| 13 | `scripts/gen-skill-manifest.mjs` | **Edit** `:4-6`: the comment justifies compiling the manifest in by naming `includeFiles`, which row 4 deletes. The conclusion is still right — `skills/` is outside the packaged function — so restate the reason without naming a mechanism that no longer exists: "the function package is `api/` and its siblings; `skills/` is not in it" | A rationale that names a removed mechanism is the recorded failure mode of a comment drafted from the diff instead of read against the code (global `AGENTS.md` §13.6). Owned by T6 |
| — | `CHANGELOG.md` | **No edit** | `api/` is not in the published `files` list (`packages/vdd-mcp/package.json:12-14`), so no published artefact changes. A `### Fixed` entry is added only if §6.3 happens |
| — | `docs/architecture.md` | **No edit**, and say why in the PR | `:202-205` states the "V5 `includeFiles`" rule, but the file declares itself a proposal at `:3` and is excluded from the live surface (`TASKS.md:28`). Editing it would restate a proposal as if it had shipped |

---

## 4. Test plan

**The new control** — `packages/vdd-mcp/test/hosted-bundle.test.ts`, three assertions. Every path is
resolved from the test file, exactly as `skill-manifest.test.ts:110` does. The command that runs it starts
vitest from `packages/vdd-engine` (`packages/vdd-engine/package.json:40`), and a relative `scripts/…`
resolves against whatever cwd the runner ends up with — `packages/vdd-engine/scripts/…` in the worst case.
Whether vitest then chdirs to `vitest.config.ts:8`'s `root` is documented nowhere in this repository, which
is precisely why the test must not depend on it:

```ts
const gen = fileURLToPath(new URL('../../../scripts/bundle-api.mjs', import.meta.url));
const dist = fileURLToPath(new URL('../../../packages/vdd-mcp/dist/handler.js', import.meta.url));
```

1. **Not stale.** Assert `existsSync(dist)` first, with the message `run \`pnpm -r build\` first` — a
   missing build is a setup failure and must not be mistaken for a stale bundle — then
   `execFileSync('node', [gen, '--check'], { stdio: 'pipe' })` does not throw. It compares the committed
   file against the `dist/` present on the machine, so it catches a hand-edited bundle; it cannot catch
   `dist/` itself being behind `src/`. The CI job's own build at `:79-80` closes that gap.
2. **Self-sufficient** (the assertion that fails on `abc8ed1`). Copy `api/mcp.js`, `api/_vdd-rpc.cjs` and
   `api/_vdd-core.cjs` into a fresh `mkdtemp` directory whose ancestors hold no `node_modules`, then
   `require(<tmp>/mcp.js)` from a child process and invoke the exported `(req, res)` with a stub `req`
   (`method: 'POST'`, the envelope headers, a `tools/list` body carrying `params._meta` as
   `hosted-shim.test.ts:25-28` does) and a recording `res`. The child prints its status and passes its own
   stderr back; the assertion is `expect(status, child.stderr).toBe(200)` (vitest takes a message as
   `expect`'s second argument) and the expected body names the three tools. **Carrying the stderr in the
   message is what makes the red honest**: on `abc8ed1` it is
   `Cannot find module '<tmp>/../packages/vdd-mcp/dist/handler.js'` — the production error, not a setup
   failure — and T3 quotes that line rather than a status code that could mean anything. This reproduces
   the production packaging: the function directory plus nothing else.
3. **No escape hatch, over all three files.** `api/mcp.js` and `api/_vdd-rpc.cjs` match neither
   `/import\(/` nor `/\.\.\/packages\//`; `api/_vdd-core.cjs` has no `require(…)` specifier that is
   neither a relative path nor a Node builtin (`require('module').builtinModules`, which covers both the
   bare `fs`/`path` form esbuild emits for `platform:'node'` and the `node:`-prefixed form). Stops a future
   edit from reintroducing the failing shape without deleting a test, and covers the generated file nobody
   reads.

**Prove it red first** (repository rule: a test that has never been red proves nothing). Run assertion 2
against the pre-fix `api/` tree — after T1 has produced the bundle, before T2 rewires the shim — and
record the child's stderr line, `Cannot find module '…/packages/vdd-mcp/dist/handler.js'`, in TASKS row
5.2. A harness failure (missing `dist` in the *setup*, runner not found) does not count as the red;
assertion 1's precondition exists to keep the two apart, and assertion 2's message exists to show which
one happened.

**Unchanged and still meaningful**: `hosted-shim.test.ts` exercises `api/_vdd-rpc.cjs` in-repo, where
`packages/vdd-mcp/dist` exists — precisely why it passed while production failed
(`hosted-shim.test.ts:10-14`). It keeps its value as a behaviour test of the adapter; it is no longer
mistaken for a packaging test, and assertion 2 above is.

**Existing suite** (`pnpm -r build && pnpm check && pnpm test`) stays green with its file/test totals
recorded. No test is deleted.

---

## 5. Verification commands

### 5.1 Local, before any push

```bash
pnpm install --no-frozen-lockfile
pnpm -r build                                 # dist/ is gitignored (.gitignore:10)
node scripts/bundle-api.mjs                   # writes api/_vdd-core.cjs
sha256sum api/_vdd-core.cjs > /tmp/vdd-a
node scripts/bundle-api.mjs                   # second run: determinism
sha256sum -c /tmp/vdd-a                       # must print OK
node scripts/bundle-api.mjs --check           # exit 0; also fails on esbuild version drift
node --check api/_vdd-core.cjs && node --check api/_vdd-rpc.cjs && node --check api/mcp.js
! grep -nE "import\(|\.\./packages/" api/_vdd-rpc.cjs api/mcp.js
! grep -n 'reaches both by dynamic' api/_vdd-rpc.cjs   # :7-8 is one sentence split by a newline; the fragment matches
! grep -n 'dist/handler' api/_vdd-rpc.cjs              # :27-31's description of the dist mechanism
! grep -n '\.\./packages/' api/_vdd-core.cjs
node -e "const {builtinModules}=require('module');const s=require('fs').readFileSync('api/_vdd-core.cjs','utf8');const b=[...s.matchAll(/require\(['\"]([^'\"]+)['\"]\)/g)].map(m=>m[1]).filter(x=>!x.startsWith('.')&&!x.startsWith('node:')&&!builtinModules.includes(x.split('/')[0]));if(b.length){console.error('non-builtin requires:',[...new Set(b)]);process.exit(1)}"
node -e "const f=require('./vercel.json').functions['api/mcp.js']; if(f.includeFiles!==undefined||f.maxDuration!==30) process.exit(1)"
pnpm -r build && pnpm check && pnpm test
python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete
```

### 5.2 The preview-first gate — the merge is blocked on this

Deployment protection answers 401 on previews (§1.1 #9), so the probe needs an automation bypass. **The
agent never mints, stores or prints it.** Global `AGENTS.md` §8 places `~/.env.opencode` and
`~/.config/opencode/*.env` among the binary-denied credential stores, and a minting tool's response is
tool output that would land in the transcript.

1. **Operator step, in the operator's own shell.** The operator mints (or rotates) the bypass for project
   `vision-driven-design` and exports it **in the shell that runs the probe**:
   `export VERCEL_AUTOMATION_BYPASS_SECRET=…`. The seam matters and is why T9 is operator-run: an `export`
   in the operator's shell does not reach the agent's shell, the agent cannot read the policy-denied
   credential stores to obtain the value, and nothing in the repository holds it. So the guard below is
   the **operator's** precondition, not the agent's:
   ```bash
   [ -n "$VERCEL_AUTOMATION_BYPASS_SECRET" ] || { echo 'BLOCKED: bypass not in environment (operator step, §5.2)'; exit 1; }
   ```
   An agent that reaches step 3 should hand the block back rather than run it — `BLOCKED` from the agent's
   shell is the designed outcome, not a failure of the fix (R7).
2. Push the branch; Vercel builds a preview; take the URL from the PR's deployment or `vercel ls`.
3. Probe the **preview**, not production. The call shape mirrors the only one proven green here —
   `params._meta` plus the envelope headers (`hosted-shim.test.ts:25-28`) — and the helper prints the
   status and the raw body, so "protocol error", "module not found" and "401" are separable:

```bash
set -euo pipefail      # one gate: the first failing line stops the block (see §5.3's note)
URL="${PREVIEW_URL:?set PREVIEW_URL to the preview deployment}/api/mcp"
META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"vdd-probe","version":"0.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}'
H=(-H 'content-type: application/json' -H 'accept: application/json, text/event-stream'
   -H 'MCP-Protocol-Version: 2026-07-28'
   -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET")

call() {  # call <method> [extra-params-json]  → body in $BODY, prints the status
  BODY=$(mktemp)
  CODE=$(curl -sS -o "$BODY" -w '%{http_code}' "$URL" "${H[@]}" -H "Mcp-Method: $1" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":{$META${2-}}}")
  printf '%s → HTTP %s\n' "$1" "$CODE"
  [ "$CODE" = 200 ] || { echo '--- raw body ---'; cat "$BODY"; echo; return 1; }
}

call tools/list
jq -e '[.result.tools[].name] | sort == ["vdd_amend","vdd_chain_validate","vdd_check"]' "$BODY"
```

Non-zero, or a body naming a missing module ⇒ **do not merge**; go to §7. A 401 means the bypass is
wrong, not that the fix failed.

> `Mcp-Method` mirrors the JSON-RPC method and `Mcp-Name` mirrors the tool name; the envelope is required
> by the SDK for `server/discover` and `tools/call` (`TASKS.md:26`), and `handleJsonRpc` forwards exactly
> those headers (`api/_vdd-rpc.cjs:70-78`).

### 5.3 The production probe — all five criteria, after merge

Same helper, without the bypass header:

```bash
set -euo pipefail      # the block is one gate — see the note below
URL=https://vdd.simonmak.com/api/mcp
META='"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"vdd-probe","version":"0.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}'
H=(-H 'content-type: application/json' -H 'accept: application/json, text/event-stream'
   -H 'MCP-Protocol-Version: 2026-07-28')
# `call` as defined in §5.2, pasted into the same shell — its `H` is the one above, without the bypass header

call tools/list
jq -e '[.result.tools[].name] | sort == ["vdd_amend","vdd_chain_validate","vdd_check"]' "$BODY"

call server/discover
jq -e '.result.supportedVersions == ["2026-07-28"]' "$BODY"

call prompts/list
jq -e '.result.prompts == []' "$BODY"

call skills/list
jq -e '[.. | .uri? // empty] | map(select(startswith("skill://"))) | length == 9' "$BODY"

call tools/list
test "$(curl -sD - -o /dev/null "$URL" "${H[@]}" -H 'Mcp-Method: tools/list' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/list\",\"params\":{$META}}" \
  | grep -ci '^mcp-session-id')" -eq 0
```

With `set -euo pipefail` the block is one gate: the first failing line exits non-zero and the rest do not
run. Without it the claim is false — a failing `tools/list` followed by four passing lines exits 0. Two
lines look wrong and are not, so neither may be "simplified": `grep -ci` inside `test "$(…)"` is
intentional (`grep` exits 1 on zero matches, that status is discarded by the command substitution, and
the count is what the test compares — rewriting it as `! grep -qi` inverts the meaning), and `${2-}` in
§5.2's `call` is required by `set -u` for the no-extra-params form. Any failure leaves the raw body on
stdout. A `jq`-free fallback: `grep -c` on `vdd_check`, `2026-07-28`, `"prompts": []`, `skill://` ×9.

### 5.4 The rewrite still works

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://vdd.simonmak.com/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H 'MCP-Protocol-Version: 2026-07-28' -H 'Mcp-Method: tools/list' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"probe","version":"0"},"io.modelcontextprotocol/clientCapabilities":{}}}}'
```

→ `200` (`vercel.json:15-20`). Cheap, and it is the URL the docs advertise.

---

## 6. Release correction — npm serves 2.0.0, the endpoint serves 1.10.1

**The order: fix forward, and do not touch npm unless the fix cannot land.** The published artefact is
sound — stdio 2.0.0 works; the defect is hosting. `npm deprecate` on 2.0.0 would tell every stdio user that
their working client is broken, show on every `npm i`, and be the first thing a new user reads.

The window closes the moment **§5.3 passes**, and at no earlier moment:

1. Merge and deploy (T10). Probe (§5.3).
2. Probe green ⇒ window closed. Nothing is published, nothing is deprecated, no version moves: the endpoint
   and the registry both serve 2.0.0 with the same 3-tool surface.
3. Probe red after §7's second attempt ⇒ **operator decision (§8 R1)**, and only after the check below.
4. **Never publish 2.0.1 for this.** A version identifies content, and the content did not change. A bump
   would re-run `publish-npm.yml` (`on: push: tags: v*`) and the eight-value release machinery
   (`TASKS.md:29`) for a deployment defect, and would leave the registry and the endpoint mismatched by a
   *third* number.

**Both directions of the window must be checked before any deprecation.** v5 `:336-338` instructed the
2.0.0 release to `npm deprecate '@simonmak-ascent/mcp@1.10.1'` with the migration pointer. Whether that
ran is **unverified** (Q8). If it did, the registry already tells 1.x users they are superseded, and
deprecating 2.0.0 as well would leave **both** versions deprecated with inverted messages. So §6.3's
fallback is conditional:

```bash
npm view @simonmak-ascent/mcp@1.10.1 deprecated   # empty output ⇒ not deprecated
```

- **Empty** ⇒ 1.10.1 was never deprecated and §6.3's fallback is available as written:
  `npm deprecate "@simonmak-ascent/mcp@2.0.0" "the hosted endpoint at vdd.simonmak.com is being redeployed; stdio is unaffected"`,
  then `npm deprecate "@simonmak-ascent/mcp@2.0.0" ""` once the probe passes. Deprecation is reversible; a
  version is not.
- **Non-empty** ⇒ record it in row 5.3 and take no deprecation: the only messages available would be
  mutually contradictory, and a second deprecation is worse than a stale one.

**The dist-tag lever is not taken.** v5 `:624` names
`npm dist-tag add '@simonmak-ascent/mcp@1.10.1' latest`. `latest` is what `npx -y @simonmak-ascent/mcp`
resolves. Moving it back to 1.10.1 would tell every new user that the 14-tool 1.x surface is current while
`CHANGELOG.md`, the `README.md:12` badge and `docs/migration-2.0.md` describe 2.0.0 — the mismatch inverts
rather than disappears — and it would strand working stdio 2.0.0 users on an older client. It stays
un-taken unless the endpoint cannot be restored at all.

**Why the release shipped unprobed — the traceability half.** v5 `:656-657` define rows 4.8 (review and
merge), 4.9 (tag, publish **and the production probe**) and 4.10 (record the release), and v5's definition
of done (`:700`) requires "`TASKS.md` ending with rows 4.1–4.10, all `done`". `TASKS.md` ends at row 2.4
(`TASKS.md:30`) and carries none of 4.8–4.10: row 4.7 (`TASKS.md:29`) is the last release row present. So
no row owned 4.9's probe, and the plan gate — which only reads the rows that exist — had nothing to
refuse. This plan writes its own probe rows **before** the merge (5.1, 5.2) and the probe row after it
(5.3), which is the shape v5's 4.9/4.10 pair was meant to have.

What makes fix-forward mandatory rather than merely preferable: `docs/deployment.md:37-53` (the hosted
section, with the 2.0.0 sentence at `:47`) and the `README.md:12` badge advertise 2.0.0 while the site
serves the 1.10.1 surface — a 2.0.0 remote client calling `vdd_check` against 1.10.1 gets an unknown-tool
error, and the landing page's "3 tools" claim is false against the live endpoint. Only a deployment
changes any of that.

---

## 7. Rollback

- **Preview probe red (§5.2).** Do not merge. Delete the branch. Production is untouched; the cost is one
  unreleased commit set. Re-plan with D (§1.2) — do not iterate on A′ inside the same session.
- **Deploy fails, or the probe fails after merge.** `vercel rollback <deployment>` for the deployment
  currently aliased to `vdd.simonmak.com`, then re-run §5.3 and expect the 1.10.1 behaviour back.
  **The id in v1 (`dpl_5ofCE9`) is not resolvable from this repository** — it came from the parent
  session's own project listing at incident time and may already be stale, so re-resolve it at execution
  (`vercel ls`, or the project's deployment list in the dashboard) and use the id that is aliased to the
  domain. `vercel rollback` with a stale id fails; it does not roll back to something else.
- **After a rollback, `main` still carries the failure.** `vercel rollback` moves the deployment alias, not
  the branch, and `vercel.json:1-22` declares no `ignoreCommand` — so the next push to `main`, a
  docs-only one included, rebuilds the failed tree and re-breaks production. Therefore: **after any
  rollback, open a revert PR of the merge commit before any other push to `main`**, merge it (that
  deployment rebuilds the last-good tree), and wait for READY plus §5.3's 1.10.1 behaviour before T11 or
  any prose commit. Hold T11 until the revert is serving.
- **The estate deploy gate.** `~/.config/opencode/plugins/_lib/gates/policies/deploy-*` refuses a third
  failed deploy-class command in one session until a test passes or the target differs. The rollback and
  the revert deploy are different targets and are the permitted actions after two failures — neither is a
  third attempt at the same one, and each must be issued as its own single command, not compounded with a
  `git` write.
- **npm state is unchanged by any rollback**, so the mismatch persists until §5.3 passes or §6.3 is taken.

---

## 8. Risks, and what is put in front of the operator rather than decided here

| # | Risk | Handling |
|---|---|---|
| **R1** | **Window length — the operator's call.** How long may the registry say 2.0.0 while the endpoint says 1.10.1 before deprecating is the lesser harm? | §6 gives the default (fix forward, no deprecate) and the fallback (deprecate, then un-deprecate), conditional on 1.10.1's own deprecation state. The threshold is a business judgement, not a technical one |
| **R2** | 1.5 MB enters git history, permanently, and every source change regenerates it. | Accepted with reasons (§1.2, including the determinism assertion and the blame rule). If rejected, D is the alternative and its cost is a CI-owned deploy path |
| **R3** | **The root cause stays undiagnosed.** A′ makes build order irrelevant; it does not establish what Vercel does. A future change that reintroduces a deploy-time dependence on `dist/` recreates this incident. | Controls: T2's three-file check (§4 assertion 3), `hosted-bundle.test.ts` assertion 2, and `vercel.json` no longer naming `dist` at all |
| **R4** | The bundle freezes dependency resolution: an SDK or `zod` patch reaches production only when someone re-runs `pnpm bundle:api`. | The CI job builds at `:79-80` and runs the suite at `:85-86`, so a dependency bump without a regenerate fails CI rather than shipping stale. Same property `generated/skills.ts` already has |
| **R5** | gitleaks / licence / SBOM jobs may react to a 1.5 MB generated file. | Settled by the PR's own checks. Any exclusion is a path-scoped allowlist with a stated reason in `.gitleaks.toml`; disabling a scan is not an option |
| **R6** | The bypass secret is a capability: it defeats deployment protection for whoever holds it. | Held by the operator in their own environment, never written by the agent (the credential stores are binary-denied — global `AGENTS.md` §8), never printed, never in a TASKS row. Rotated after the deploy lands (T12), so the value used for the gate is not the live one |
| **R7** | If the environment has no bypass, the preview gate cannot run and the change would ship unprobed. | The §5.2 guard exits with `BLOCKED` rather than silently skipping. Then the operator runs the probe by hand, or authorises a post-merge production probe with §7 primed |
| **R8** | A contributor runs the suite without `pnpm -r build` and reads a setup failure as a stale bundle. | Assertion 1 checks `dist/handler.js` first and fails with `run \`pnpm -r build\` first`. **The two failure classes share one exit code** — both are vitest failures, exit 1 — so the separation is the *message*, not the code: assertion 1's names the missing build, assertion 2's carries the child's stderr (`Cannot find module …`). That is enough for a reader and not enough for a script, so anything automating this must match the message |

---

## 9. Tasks

Each is independently verifiable; "done" means the `verify:` command was run and its output read.

**Row mapping for `TASKS.md` (fixed here; the executor does not invent it).**

| row | owns | written in |
|---|---|---|
| 5.1 | T1–T6: the source change — generator and pin, committed bundle, shim rewire, `vercel.json`, CI step, docs and diff hygiene | the source commit (T8) |
| 5.2 | T3's red-then-green evidence (the quoted `Cannot find module`) and T7's full local gate with file/test totals | the source commit (T8) |
| 5.3 | T9–T11: the preview gate's two lines (`preview: tools/list → HTTP 200` and `preview: jq -e exit 0`), the merge, the production probe (§5.3 + §5.4), the Q8 deprecation check and the §6 decision, then T12's rotation time | the `TASKS.md`-only commit at T11, amended by the `TASKS.md`-only commit at T12 |

**T1 — Add the generator and the pinned esbuild.**
Create `scripts/bundle-api.mjs` (write and `--check` modes, root from `import.meta.url`, version banner and
version assertion); add `devDependencies.esbuild` (exact) and the two scripts to `package.json`; build the
workspace, then generate `api/_vdd-core.cjs`.
`verify:` **(a) before the first edit, on the untouched tree** — `pnpm install --no-frozen-lockfile && pnpm -r build && pnpm test`, and record the file/test totals: that is the baseline T7 compares against (the repository's own figures at `TASKS.md:27-28` are historical and cannot serve). **(b) after the generator** — `pnpm -r build && node scripts/bundle-api.mjs && sha256sum api/_vdd-core.cjs > /tmp/vdd-a && node scripts/bundle-api.mjs && sha256sum -c /tmp/vdd-a && node scripts/bundle-api.mjs --check && node -e "const {createVddHandler}=require('./api/_vdd-core.cjs'); if(typeof createVddHandler!=='function') process.exit(1)"` — exits 0, `sha256sum -c` prints `OK`, and the file size is reported.

**T2 — Rewire the shim to a static sibling require, and fix its header.**
Rewrite `api/_vdd-rpc.cjs:1-9` (the header must stop saying "reaches both by dynamic import" at `:7-8` and
stop describing the `dist` mechanism at `:27-31`), replace `:25-33` with the lazy literal
`require('./_vdd-core.cjs')`, and call `createVddHandler()` on it at `:66`.
`verify:` `! grep -nE "import\(|\.\./packages/" api/_vdd-rpc.cjs api/mcp.js && ! grep -n 'reaches both by dynamic' api/_vdd-rpc.cjs && ! grep -n 'dist/handler' api/_vdd-rpc.cjs && ! grep -n '\.\./packages/' api/_vdd-core.cjs && node -e "const {builtinModules}=require('module');const s=require('fs').readFileSync('api/_vdd-core.cjs','utf8');const b=[...s.matchAll(/require\(['\"]([^'\"]+)['\"]\)/g)].map(m=>m[1]).filter(x=>!x.startsWith('.')&&!x.startsWith('node:')&&!builtinModules.includes(x.split('/')[0]));if(b.length)process.exit(1)" && node --check api/_vdd-rpc.cjs && pnpm --filter @simonmak-ascent/engine test hosted-shim` — the checks fail if the old shape survives. **These added greps are what catch the header rewrite**: `:7-8` is one sentence split by a newline (`:7` ends "…reaches both by dynamic", `:8` begins "import."), so a line-oriented `grep 'dynamic import'` matches nothing — the fragment `'reaches both by dynamic'` is the pattern that fails while the stale sentence survives, and `dist/handler` catches `:27-31`. Without them the prose could survive untouched. `hosted-shim` still passes with the same count.

**T3 — The self-sufficiency control, proved red then green.**
Write `packages/vdd-mcp/test/hosted-bundle.test.ts` (§4), all paths from `import.meta.url`; capture the red
run of assertion 2 against the pre-fix `api/` tree (after T1, before T2).
`verify:` `pnpm -r build && pnpm --filter @simonmak-ascent/engine test hosted-bundle` — green, and the earlier red is quoted in TASKS row 5.2 as `Cannot find module`, never as a missing-`dist` setup error.

**T4 — Remove `includeFiles` from `vercel.json`.**
`verify:` `node -e "const f=require('./vercel.json').functions['api/mcp.js']; if(f.includeFiles!==undefined||f.maxDuration!==30) process.exit(1)"` — exits 0.

**T5 — Wire the CI gate and prove it can fail.**
Add `node scripts/bundle-api.mjs --check` as a step after `Test` (`:85-86`) and add
`node --check api/_vdd-core.cjs` to the syntax step (`:88-89`). No second build: the job already builds at
`:79-80`, and the step is deliberate redundancy over assertion 1 (§3 row 8).
`verify:` run the job's commands, then perturb the bundle and watch the control go red, then restore it
**by re-running the generator**:

```bash
pnpm -r build && pnpm test && node scripts/bundle-api.mjs --check
printf '\n// drift\n' >> api/_vdd-core.cjs && ! node scripts/bundle-api.mjs --check
node scripts/bundle-api.mjs && node scripts/bundle-api.mjs --check && pnpm test
grep -q 'node --check api/mcp.js && node --check api/_vdd-rpc.cjs && node --check api/_vdd-core.cjs' .github/workflows/vdd-quality-gates.yml
```

The middle line is the only evidence that the control *runs* — text presence in the YAML is not.
**The restore is the generator, not `git checkout --`.** `api/_vdd-core.cjs` does not exist on `main` and
is untracked until T8's commit, so `git checkout -- api/_vdd-core.cjs` refuses — `error: pathspec '…' did
not match any file(s) known to git`, non-zero whatever the exact code — and with `&&` the chain stops
there, leaving the appended `// drift` in place; T6, T7 and T8 would then run against a bundle `--check`
rejects. Re-running the generator is exactly the idempotency
§1.2 asserts, involves no git state at all, and — unlike a `git checkout` — is not one of the shell writes
the review gate counts (global `AGENTS.md` §13.3). Both the `printf` and the regeneration are writes: run
them **before** requesting review, and let the final `--check` prove the bytes are back before the suite
re-runs.

**T6 — Docs, comments and diff hygiene.**
`README.md:392-395` (bundle entry, and the `scripts/` noun becomes "eight installer, landing, bundler and
manifest helpers"), `docs/deployment.md:37-53`, `.gitattributes`, and `scripts/gen-skill-manifest.mjs:4-6`
(§3 row 13: restate why the manifest is compiled in without naming the `includeFiles` property T4 deletes).
`verify:` `grep -q '_vdd-core.cjs' README.md && grep -q 'eight installer, landing, bundler and manifest helpers' README.md && grep -q 'bundle-api' docs/deployment.md && grep -q 'linguist-generated' .gitattributes && ! grep -q 'includeFiles' scripts/gen-skill-manifest.mjs` — exits 0.

**T7 — The full local gate.**
`verify:` `pnpm -r build && pnpm check && pnpm test` — green, with the file/test totals recorded in TASKS
row 5.2 beside **T1(a)'s baseline** (the totals on the untouched tree). A drop in either count against that
baseline is a failure, not a tidy-up; the repository's own figures at `TASKS.md:27-28` are historical and
are not the baseline.

**T8 — TASKS rows 5.1 and 5.2, in the same commit as the work.**
Each row `done — <command and output>`; the row rule is at `TASKS.md:3-8`; the content is the mapping at
the head of §9. 5.3 is **not** written here.
`verify:` `test "$(grep -c '^| 5\.' TASKS.md)" -eq 2 && grep -q 'Cannot find module' TASKS.md && python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete` — exits 0. `grep -c` alone cannot fail, which is why the count is wrapped in `test … -eq`.

**T9 — Preview-first gate (blocking). Operator-run probe, agent-run order.**
The agent pushes the branch, takes the preview URL from the PR's deployment or `vercel ls`, and hands it
over — **then stops**. The operator runs §5.2's step 1 and block **in their own shell**, because an
`export` there does not reach the agent's shell and the agent cannot read the denied credential store to
obtain the value; an agent that runs the block gets `BLOCKED`, which is the designed outcome, not a failed
fix. The operator reports the two lines and no value: `tools/list → HTTP 200` and the `jq -e` exit status.
The agent records them at T11.
`verify:` the §5.2 `call` prints `HTTP 200` and the `jq -e` filter exits 0 (3 tools, named), observed by the
operator; the two lines are in row 5.3 and the secret appears in no file, no commit and no transcript. A 401
means the bypass is wrong, not that the fix failed; the raw body is printed either way.

**T10 — Merge, watch production, probe.**
Merge once checks are green; confirm the production deployment reaches READY; run **all** of §5.3 plus §5.4.
`verify:` §5.3's five commands exit 0 (3 tools / `["2026-07-28"]` / `[]` prompts / 9 `skill://` URIs / zero
`Mcp-Session-Id`) and §5.4 returns `200`.

**T11 — Record the deployed evidence, row 5.3, and decide §6.**
Write row 5.3 in a **`TASKS.md`-only commit** — v5's shape at `docs/plan-restructure-v5.md:657`, whose own
verify is `test "$(git diff --name-only HEAD~1)" = "TASKS.md"`. T10 leaves nothing else pending, and no
later task produces a source commit, so "the next commit that touches the repository" named a commit that
never arrives and made this task's verify (`-eq 3`) unpassable; that clause is withdrawn. Record T10's
output, the Q8 `npm view @simonmak-ascent/mcp@1.10.1 deprecated` result and the §6 decision in the row, and
record T9's two reported lines **verbatim**, as `preview: tools/list → HTTP 200` and `preview: jq -e exit 0`
— T9 completes only when those lines are in row 5.3, and this is the task that writes it.
**The redundant rebuild is stated and accepted**: `vercel.json` declares no `ignoreCommand`
(`vercel.json:1-22` is the whole file), so this prose commit rebuilds and redeploys production once — a
record of a production probe that exists only in a session is worth less than one rebuild, and §7's
revert-first rule is still armed if that rebuild fails. If §7's rollback was used, this task waits until
the revert is serving.
`verify:` `test "$(grep -c '^| 5\.' TASKS.md)" -eq 3 && grep -q '3 tools / 0 prompts / 2026-07-28 / 9 skills' TASKS.md && grep -q 'npm view' TASKS.md && test "$(git diff --name-only HEAD~1)" = "TASKS.md" && grep -q 'preview: tools/list → HTTP 200' TASKS.md && python3 ~/.config/opencode/bin/plan-state.py --path TASKS.md --require-complete` — exits 0.

**T12 — Rotate the bypass secret.**
Operator step, after T10 lands: rotate it in the Vercel project so the value that defeated protection for
the gate is no longer live. **Both probe calls are made against the preview deployment's URL**, not
`vdd.simonmak.com`: production is public and answers 200 to any request, so an old value tested there
returns 200 and the control cannot fail. The agent records the rotation time in row 5.3 and never a value;
that record is a second `TASKS.md`-only commit, with the same one-rebuild cost T11 states and accepts.
`verify:` the operator re-runs §5.2's `call` at the **preview** URL with the **new** value and gets
`HTTP 200`, and at the same URL with the **old** value gets `HTTP 401`; both outcomes and the rotation time
are recorded in row 5.3 (`grep -q 'bypass rotated' TASKS.md`).

**Ordering.** T1 → T3 (author the test and capture the red) → T2 (rewire, then T3 goes green) → T4 → T5 →
T6 → T7 → T8 are one commit set; T3's red is observed after T1 and before T2, and recorded at T8. T9 gates
T10; T10 gates T11, and T11 gates T12 (whose record amends row 5.3). Nothing in T1–T8 changes production.

---

## 10. Review response

| # | Finding | Disposition |
|---|---|---|
| **H1** | `--check` was cwd-relative; T3 runs from `packages/vdd-engine` | **Applied.** §4 resolves the script and `dist` from `import.meta.url`, as `skill-manifest.test.ts:110` does; §3 row 1 and T2 state that the generator derives its root the same way. The claim that the runner's cwd *is* `packages/vdd-engine` rests on `packages/vdd-engine/package.json:40`; whether vitest later chdirs to `vitest.config.ts:8`'s `root` is not asserted anywhere, which is exactly why the test must not depend on it |
| **H2** | T1's verify omitted `pnpm -r build` | **Applied.** T1 now installs, builds, generates. §4 assertion 1 additionally fails with `run \`pnpm -r build\` first` when `dist/handler.js` is absent, so a missing build is a setup error rather than a stale-bundle verdict (R8) |
| **H3** | "Supersedes nothing" was false and left a contradiction with v5's `includeFiles` fallback | **Applied.** The preamble and §3 row 4 record that Q2's fallback is retired because the glob was present (`vercel.json:5`) and the file was still absent; v5 is not edited. §6 adds the traceability line: v5 `:656-657` define rows 4.8–4.10, `TASKS.md` has none, `:700`'s definition of done therefore never held |
| **H4** | T8's verify could not fail; rows 5.1–5.3 had no defined content | **Applied.** §9 defines the mapping, and the rows are split: 5.1–5.2 in the source commit (`test … -eq 2`), 5.3 at T11 (`test … -eq 3`). Writing all three up-front would make one of them `ready`, which blocks the commit — the reason for the split |
| **H5** | Writing the bypass secret to `~/.env.opencode` is a denied step; R6 had no task | **Applied.** §5.2 makes minting and holding an operator step, guards on `[ -n "$VERCEL_AUTOMATION_BYPASS_SECRET" ]` and exits `BLOCKED` otherwise, and explains why the agent must not call the minting tool (its response is transcript content). R6 is rewritten and T12 rotates it with a two-sided verify. **M12 closes the seam this left**: the guard is the operator's, and T9 is operator-run |
| **M1** | `--check` could not settle the esbuild version | **Applied.** The generator asserts `esbuild.version` against the banner; `--check` fails on a mismatch. Q3 and §1.1 #7 say the version behind the probe was not recorded |
| **M2** | Q6 was verified over one of three files | **Applied.** Q6, §4 assertion 3, T2's verify and §5.1 cover `api/mcp.js` and the generated `api/_vdd-core.cjs` (no `require` specifier outside Node builtins or relative paths) as well as the shim |
| **M3** | T2 left the shim's own header false | **Applied.** §3 row 3 and T2 rewrite `:1-9` alongside `:25-33` and `:66` |
| **M4** | T5's rationale was false about the job; its verify could not show the step runs | **Applied.** §3 row 8 and T5 say the job already builds at `:79-80`, so only the `--check` is new; the verify runs the job's commands and perturbs the bundle to watch the control go red |
| **M5** | The release window was answered in one direction; the dist-tag lever was unaddressed | **Applied.** §6 adds Q8's `npm view … deprecated` check, makes the deprecation fallback conditional on it, and states why `npm dist-tag add … latest` (v5 `:624`) is not taken |
| **M6** | Rollback plus T11 redeploys the failure | **Applied.** §7 adds the revert-before-any-push rule and holds T11 until the revert is serving; T11 repeats the hold |
| **M7** | The probes dropped `params._meta`; no way to separate error classes | **Applied.** §5.2/§5.3 mirror `hosted-shim.test.ts:25-28` (params `_meta` + envelope headers, `accept: application/json, text/event-stream`), and a `call` helper prints `%{http_code}` and the raw body on any non-200 |
| **M8** | The committed-artefact cost was stated only for dependency drift | **Applied.** §1.2 adds the ordinary-source-change cost, the determinism statement at the level `gen-skill-manifest.mjs:41-45` set, and the `.git-blame-ignore-revs` rule (the first *regenerating* commit, not the creating one) |
| **L1** | "the layout `includeFiles` implies was right" was unsupported | **Applied.** §1.1 #1 stops at what the error proves: the file was absent |
| **L2** | `docs/deployment.md:37-45` → the version sentence is at `:47` | **Applied.** Cited as `:37-53` with `:47` named, and the README badge as `:12` |
| **L3** | "no dependencies" vs T1 adding `devDependencies.esbuild` | **Applied.** §1.1 #3 distinguishes a build-time tool from a runtime tree |
| **L4** | `secret-scan.yml:26` cited for "default gitleaks rules" | **Applied.** Q5 cites `secret-scan.yml:22-26` for the run and `.gitleaks.toml:4-5` for the default ruleset |
| **L5** | `dpl_5ofCE9` cannot be resolved from the repository | **Applied.** §7 records its origin (the parent's project listing at incident time) and requires re-resolution at execution; the stale id fails rather than half-working |
| **L6** | A top-level `require` loads 1.5 MB for `OPTIONS`/`DELETE`/browser `GET` | **Applied.** §3 row 3 and T2 use a lazy `core ??= require('./_vdd-core.cjs')`, which keeps the literal specifier nft traces |
| **H6** | **T5 could not restore the file it perturbs.** `git checkout -- api/_vdd-core.cjs` runs on a path that is untracked until T8's commit, so it refuses (`error: pathspec '…' did not match any file(s) known to git`), the `&&` chain stops, the appended `// drift` stays, and T6–T8 then run against a bundle `--check` rejects | **Applied.** T5 restores by re-running the generator — `node scripts/bundle-api.mjs && node scripts/bundle-api.mjs --check && pnpm test` — which is the idempotency §1.2 asserts, involves no git state, and is not one of the shell writes the review gate counts (a `git checkout` is; global `AGENTS.md` §13.3). T5 states why |
| **H7** | **T11 forbade the only commit it can make.** Its rule was "in the next commit that touches the repository, not a standalone `docs:` commit"; after T10 the only pending change *is* the `TASKS.md` edit, so there is no next commit and no later task produces one — its verify (`-eq 3`) could never pass, and the Q8 result and §6 decision had nowhere to be recorded | **Applied.** T11 is one `TASKS.md`-only commit after a green §5.3, which is v5's own shape (`docs/plan-restructure-v5.md:657`), with the redundant production rebuild stated and accepted. The ordering T11 → T12 is stated, and T12's rotation time lands in row 5.3 as a second `TASKS.md`-only commit |
| **M9** | `scripts/gen-skill-manifest.mjs:4-6` justifies compiling the manifest in by naming `includeFiles`, which T4 deletes — conclusion right, justification names a removed mechanism | **Applied.** §3 row 13 adds the file to the change list and T6, with `! grep -q 'includeFiles' scripts/gen-skill-manifest.mjs` as the verify |
| **M10** | T2's verify could not fail for the header rewrite: `:8`'s "reaches both by dynamic import" matches neither `import\(` nor `\.\./packages/` | **Applied.** T2 (and §5.1) add `! grep -n 'reaches both by dynamic' api/_vdd-rpc.cjs` and `! grep -n 'dist/handler' api/_vdd-rpc.cjs`. The fragment, not `'dynamic import'`, is the pattern — H8 states why |
| **M11** | T7's "a drop in either count is a failure" had no baseline; the repository's figures (`TASKS.md:27-28`) are historical | **Applied.** T1(a) takes the baseline on the untouched tree before the first edit; T7 compares against it and says so |
| **M12** | **H5's export→process seam was unstated and T9 could never pass**: §5.2 has the *operator* export the variable, while T9 had the *agent* run §5.2 — an `export` does not cross shells and the agent cannot read the denied store | **Applied.** T9 is operator-run in T12's shape: the agent pushes, takes the preview URL and stops; the operator runs §5.2 and reports the two lines; the agent records them. §5.2 labels the guard as the operator's precondition and says `BLOCKED` in the agent's shell is the designed outcome (R7) |
| **M13** | §5.3 had no `set -euo pipefail`, so "each line exits non-zero, so the block is one gate" was false — a failing `tools/list` followed by passing lines exits 0 | **Applied.** Both §5.2 and §5.3 carry `set -euo pipefail`, with the note that `grep -ci` inside `test "$(…)"` is intentional and must not be simplified, and that `${2-}` in `call` is required by `set -u` |
| **M14** | R8 claimed the two failure classes "never share an exit code path"; both are vitest failures at exit 1 | **Applied.** R8 says the code is shared and the separation is the message — assertion 1 names the missing build, assertion 2 carries the child's stderr |
| **M15** | Assertion 2's red did not carry the child's stderr, so T8's `grep 'Cannot find module'` would be asserting something the test never printed | **Applied.** §4 assertion 2 asserts `expect(status, child.stderr).toBe(200)`, so the red literally contains `Cannot find module '…'` |
| **M16** | T12's two-sided verify did not say *where*: production is public and an old bypass value returns 200 there, so the control could not fail | **Applied.** T12 requires both calls against the preview URL |
| **L7** | `:471`'s ordering contradicted T3's "capture the red after T1, before T2" | **Applied.** The ordering line is T1 → T3 (author + red) → T2 → T3 green → T4 … |
| **L8** | The CI `--check` step was unattributed next to assertion 1, which already runs in the suite | **Applied.** §3 row 8 and T5 say the step is deliberate redundancy over assertion 1, and R4's control is assertion 1 |
| **L9** | `:84`'s regeneration triggers omitted `skills/**/*.md` | **Applied.** §1.2 lists it with the chain that carries it into the bundle: `gen-skill-manifest.mjs:21-22` → `generated/skills.ts` (imported at `src/skills.ts:3`) → `src/server.ts:6` |
| **L10** | `README.md:395`'s noun list had no word for a bundler | **Applied.** §3 row 10 and T6 write "eight installer, landing, bundler and manifest helpers", and T6's verify greps the whole phrase, not just `eight installer` |
| **H8** | **The M10 control cannot fail.** `! grep -n 'dynamic import' api/_vdd-rpc.cjs` was added in three places (§5.1, T2's verify and M10 itself), but the sentence it targets is one sentence split across `api/_vdd-rpc.cjs:7-8` — `:7` ends "…reaches both by dynamic" and `:8` begins "import." — so a line-oriented `grep` matches nothing, on `main` and after any partial rewrite. T2's surrounding sentence also claimed both added greps could fail on the header rewrite, which is false for this one | **Applied.** All three occurrences grep the fragment `'reaches both by dynamic'`, which is what matches `:7`; T2 now states that the `:7-8` sentence is split by a newline, so the fragment grep is the one that catches it, and `dist/handler` is the one that catches `:27-31` |
| **H9** | **The merge gate's evidence had no landing place.** T9 completes when "the two lines are in row 5.3", but row 5.3 is written by T11 and T11 recorded only T10's output, the Q8 `npm view` result and the §6 decision — so row 5.3 could be written, and T11's verify pass, with the preview gate's evidence absent | **Applied.** §9's row mapping names the two lines as row 5.3's content; T11 records them verbatim as `preview: tools/list → HTTP 200` and `preview: jq -e exit 0`, and its verify greps for the first before the plan-gate clause |

**Still unverified, and what settles each:** the esbuild version behind the 1.5 MB probe (T1's `--check`),
whether gitleaks fires on the bundle (the PR's checks), whether 1.10.1 is currently deprecated (the
`npm view` in §6), whether nft follows a static sibling require (the §5.2 preview probe), and whether
vitest changes the process cwd (irrelevant once §4 resolves by URL — which is the point of H1's fix).
