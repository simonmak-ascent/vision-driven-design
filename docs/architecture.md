# Architecture — one knowledge base, one capability core, two transports

Status: **proposed** — under review. Code has changed since this was written (A1 feature validation, A2 `projectRoot` confinement; A3's clone SSRF gate was superseded when `clone` was removed on 2026-11-25); §6 lists what is planned, not what is done. Supersedes the "MCP server with 15 tools and 21 prompts" model.

The product has two kinds of content and they were previously mixed in both places:

- **Procedure** — what to do, in what order, with what template, judged by an agent.
- **Determinism** — the checks, scans and network work that code does better than an agent.

The old split shipped procedure as MCP tools (writing template files, returning instruction
text) *and* as skill prose, and shipped verification as a thin `validate` while the real
108-check suite sat unused inside `e2e`. Both surfaces could drift, and did: the published
package served 3 prompts while `main` served 21.

This document fixes the ownership. It is the authority for any future surface change;
`scripts/check-contract.mjs` enforces it in CI.

---

## 1. Ownership matrix

Each concern has exactly one owner. The other layers may *reference* it, never restate it.

| Concern | Owner | Where | Never duplicated in |
|---|---|---|---|
| What to do, in what order, why | **Skill** | `SKILL.md`, `references/`, `domain-primers/` | tool descriptions, code comments |
| Artifact templates | **Skill** | `references/artifact-templates.md` | engine source |
| Gate definitions and their ids | **Skill** | `references/quality-gates.md` (G1–G7) | engine prose |
| Gate *implementations* | **Engine** | `packages/vdd-engine/src/engine.ts` (`gate0`–`gate7`) | any doc |
| Surface text (tool/CLI description) | **Engine** | `packages/vdd-engine/src/meta.ts` (`PHASE_META`) | README, SKILL.md |
| Surface shape (which ops exist, inputs, annotations) | **Engine** | `packages/vdd-engine/src/capabilities.ts` | server.ts, cli.ts, api/ |
| Local execution | **CLI** | `packages/vdd-cli` | — |
| Local MCP clients | **MCP stdio** | `packages/vdd-mcp` | — |
| Remote skill distribution | **MCP hosted** | `api/mcp.js` (resources + one read-only tool) | engine code |

Consequence: **the tool surface is four deterministic operations.** Everything that requires
judgement — init, vision, strategize, tactics, specify, plan, tasks, implement, amend, e2e —
is a skill workflow, not a tool. The engine keeps the code for the four; it no longer contains
template-emitting phases.

The boundary test, applied to every candidate: keep it in code only if (i) the output is fully
determined by project bytes plus explicit inputs, (ii) no sentence of it has to be authored by a
model, and (iii) it does work a model cannot do as exactly — an exhaustive scan, arithmetic, a
network crawl. A tool that restates a document is a second copy of that document.

`env` fails (iii): its payload is `TOOL_REQUIREMENTS` (`meta.ts:126-145`) rendered per phase —
static data already owned by `references/ai-agent-patterns.md`. It moves to the skill.

## 2. The four capabilities

Defined once, in `packages/vdd-engine/src/capabilities.ts`:

| id | Engine phase | Reads fs | Writes | Network | Why it is code |
|---|---|---|---|---|---|
| `verify` | `verify` (composes `validate` + `gate0`–`gate7`) | yes | report | no | exhaustive checks, exact counts |
| `inspect` | `inspect` | yes | no | no | deterministic parsing of the chain |
| `clarify` | `clarify` | yes | no | no | exhaustive marker scan |
| `next-task` | `get-next-task` | yes | no | no | deterministic ordering |

Both `packages/vdd-mcp/src/server.ts` and `packages/vdd-cli/src/cli.ts` **generate** their
surface from this registry. Neither holds its own list, schema or description.

Registry contract (implementation lives in `packages/vdd-engine/src/capabilities.ts` once the
design is approved):

```
Capability {
  id: 'verify'|'inspect'|'clarify'|'next-task'
  phase: EngineOp            // key of PHASES — must exist, asserted by test
  title: string
  description: string        // the ONLY surface text; PHASE_META does not duplicate it
  skillAnchor: 'path#heading'
  arguments: string[]        // VddPhaseInput keys actually read
  required: string[]         // subset of arguments
  annotations: { readOnlyHint, destructiveHint, idempotentHint, openWorldHint }
  surfaces: { toolName, command, cliArgs }
}
```

| id | arguments | readOnly | destructive | idempotent | openWorld |
|---|---|---|---|---|---|
| `verify` | feature, artifactFiles, projectRoot | no | no | yes | no |
| `inspect` | scope, feature, artifactFiles, projectRoot | yes | no | yes | no |
| `clarify` | feature, artifactFiles, projectRoot | yes | no | yes | no |
| `next-task` | feature, artifactFiles, projectRoot | yes | no | yes | no |

## 3. The collaboration contract

The layers are not independent — they are coupled at exactly two points, and both are checked.

1. **Tool → skill.** Every capability carries `skillAnchor`, the place in the skill that
   defines the rule it enforces (for example `references/quality-gates.md#gate-3`). The tool's
   output cites gate ids; the agent reads their definition from the skill.
2. **Skill → tool.** Every phase section in the skill names the capability that verifies it,
   and no phase invents its own check. `SKILL.md` is the procedure; `vdd verify` is the verdict.

`scripts/check-contract.mjs` fails the build when any of these drift:

- a capability id missing from `SKILL.md`, or an unknown `vdd_*` tool name present in it;
- a capability `skillAnchor` pointing at a missing file or heading;
- the README tool table disagreeing with the registry;
- a reintroduced `api/_vdd-rpc.js` (the retired hand-maintained duplicate);
- a prompt surface reappearing in the MCP server.

## 4. Transports

```
                     ┌──────────────────────────────┐
   skill files ──────┤ api/mcp.js  (hosted, remote) │  resources only, no engine
   (knowledge)       └──────────────────────────────┘
        │
        │ read by the agent
        ▼
   agent ──calls──▶ vdd verify|inspect|clarify|next-task
                     ├── vdd-cli      (shell)
                     └── vdd-mcp      (stdio, MCP clients)
                              │
                              ▼
                     packages/vdd-engine  (capability core)
```

- **Hosted** (`https://vdd.simonmak.com/mcp`) serves the skill directory with precomputed
  SHA-256 digests: `resources/list` + `resources/read`, and **one read-only tool**
  (`skill_get`) as the fallback. It runs no engine code, holds no state and returns no
  delegation envelope — the previous design asked the caller to do the work and call back,
  which was a round trip with no result.
- The tool fallback is not optional. Client support is tools **24/24**, resources **15/24**,
  prompts **13/24**; a model cannot pull a resource on its own, and no resources-only server is
  reported in the wild. A server with zero tools is legal but is flagged or treated as
  unavailable by some hosts. `skill_get` takes a path from the same manifest, so it inherits the
  allowlist rather than adding a second resolver.
- `skills/list` + `skills/get` are implemented for forward compatibility only. SEP-2640 is
  Final but the extension is Beta: shipping clients are ChatGPT (partial), fast-agent (partial)
  and MCP Inspector (partial); no mainstream harness implements it. **No behaviour, test or
  claim may depend on `skills/*`.**
- **stdio** exposes the four capabilities for clients that have a filesystem.
- **CLI** exposes the same four for shell users and for agents that prefer `exec`.

A remote client therefore gets the *knowledge*; execution needs a filesystem, which is where
the work actually happens. That is the honest boundary, not a limitation to paper over.

## 5. What changed from the old design

| Removed | Reason |
|---|---|
| 15 MCP tools | 9 were template writers or instruction text — procedure, owned by the skill |
| 21 MCP prompts | duplicated the `SKILL.md` command reference and are supported by 13/24 clients |
| `api/_vdd-rpc.js` (1,569 lines) | hand-maintained duplicate of engine/meta/prompts |
| `prompts.ts` | prompt surface retired |
| hosted delegation envelopes | returned "do it yourself" instead of a result |
| engine template literals | `references/artifact-templates.md` is the only copy |
| `e2e` as a tool | orchestration of skill phases; it now lives in the skill |
| `clone` and its crawl/capture pipeline (2,057 LOC) | a URL-to-app generator unrelated to the phase chain — the only outbound network surface; removed by operator decision 2026-11-25 |

**Evidence of cost.** The old `tools/list` was 36,237 bytes ≈ 9,059 tokens resident in every
connected client, 12,015 bytes of it one `outputSchema` repeated 15 times. The new surface is
four operations.

## 6. Migration record

Planned, not yet implemented (see §7 for the constraints that gate each step): registry;
four-capability surface; prompts retired; hosted endpoint rebuilt as a resource server with
precomputed digests; `_vdd-rpc.js` deleted; template-emitting phases removed; `verify` exposes
the gate suite; contract checks in CI.

One decision remains open; two are now decided and must not be re-opened by assumption:

1. **Heal vs report — decided (D1): `verify` reports only, never heals.** A check that repairs its own
   inputs is the pattern Anthropic names as broken. Consequence: some projects green under `vdd e2e`
   go red — a breaking change to document, not to hide.
2. **G7's target artifact.** `gate7` requires `vdd/impact-report.md` (`engine.ts:1287`), which
   `validate()` never writes — it writes `impact-report.generated.md` (`engine.ts:733`) and
   refuses to clobber the hand-authored file. Until that is reconciled, `verify` cannot report
   a passing G7 by construction, and 6 of its 15 checks are the same predicate.
3. **The hosted half** — *resolved by external evidence.* Kept, but resource-first with a
   read-only `skill_get` tool fallback. Resources alone are not reachable by a model, and 9 of
   24 clients do not support them.

## 7. Review constraints — binding before merge

From the internal architecture review and the security review. Each is a blocker, not advice.

**Correctness of the verdict**
- V1 Define one verdict rule and one denominator for `verify`. Today `gateSummary` counts
  `checksRun` including G0 but `checksTotal` excluding it (`engine.ts:1352-1355`), and
  `makeGateFail` sets every total to 0, so a missing artifact shrinks the total instead of
  failing a check. With no feature directory, G3–G7 do not run at all and `allPassed` can be
  true on a project with no specs.
- V2 A template must satisfy the gate that judges it. `references/artifact-templates.md:384`
  writes `Action Item [A-XXX]`; gate3 F3.1 requires `/A-\d+/` (`engine.ts:1130`). The doc
  templates also hardcode impact chains, reintroducing the drift class `validate()` was
  rewritten to avoid. **This test lands first, red** — before any deletion.

**Hosted resource server**
- V3 Never derive a path from a URI. Resolve against a build-generated manifest
  (`uri → path + digest + size`); a miss is `-32602`. Reject any URI containing `%`, `\`, `:`,
  an empty segment, or a `.`/`..` segment. `lstat` and refuse symlinks; `realpath` must stay
  inside the skill root (compare with `path.relative`, never `startsWith`). `.md` only, 256 KiB
  per file.
- V4 Digests and sizes are computed at build time and shipped in the manifest. No hashing on
  the request path; a 50-message batch must not force 50 manifest hashes.
- V5 `includeFiles` in `vercel.json` must be a positive list equal to `manifest ∪ {server.json}` —
  exactly the 20 skill files plus the version source. A glob such as `**/*` would place `scripts/`,
  `.github/` and any committed `.env*` inside the function bundle where the resolver could reach
  them.
- V6 The manifest must be complete and atomic: all 20 files, each with `digest` and `size`,
  `resources` never `"dynamic"`, one page, within 512 entries / 16 MiB. `SKILL.md` needs YAML
  frontmatter whose `name` equals the final URI segment. The URI space is therefore
  `skill://vision-driven-design/...`: SEP-2640 requires the final segment to equal `name`, and the
  local loader (`scripts/install.sh`) requires `name` to equal the directory — both are
  `vision-driven-design`, so the two spaces agree. `AGENTS.md` is gitignored (`.gitignore:27`), so
  the changed convention is recorded in the migration note and CHANGELOG, not asserted in CI.

**Existing code that ships exploitable behaviour today**
- V7 **removed, not fixed.** The `clone` capability accepted private targets and was the only outbound
  network path in VDD. It was removed by operator decision on 2026-11-25 as unrelated to the phase chain
  (2,057 LOC, all of the SSRF residuals). No VDD surface makes outbound requests now; the class goes
  with the feature.
- V8 `feature` is concatenated into read paths with no validation; `feature="../../other-project"`
  reads a sibling checkout. **Fixed 2026-11-25** at the engine choke point (`engine.ts:49-56`, `:82`,
  `:636`) and the schema (`server.ts:16-18`), with a behavioural test (`feature-arg.test.ts`).
- V9 `projectRoot` is the real write primitive: `writeArtifact` does `mkdir -p` + `writeFile`
  (`engine.ts:13-31`), so `projectRoot:"/etc"` creates a directory anywhere the process can
  write. Confine it to an allowlist root.
- V10 Deleting `api/_vdd-rpc.js` deletes the only `artifactFiles` sanitiser (64 files /
  256 KiB). `verify` and `clarify` still read `artifactFiles`, so the cap must be re-homed into
  the stdio handler before the file goes.

**Controls**
- V11 The contract check must be fail-closed: import the *built* registry, assert its length
  first, fail when a doc section extracts empty, scan for `/vdd:[a-z-]+` as well as `vdd_*`
  (the command table uses the former), and ship a fixture the checker must reject.
- V12 Surface text lives in more places than the earlier list of 13. Full inventory, each either
  added to C15's check or explicitly declared allowed to drift: README, SKILL.md, three `index.html`
  (generated by `scripts/gen-landing.py:40-47,83-90,126-133` — regenerate, never hand-edit),
  `package.json` ×3 (mcp, engine, cli — each description carries a stale count), `context7.json:4,16`,
  `glama.json`, `server.json`, `llms.txt:14`,
  `docs/deployment.md:3-10,34-63`, `references/quick-reference.md`, `references/INDEX.md`,
  `references/quality-gates.md`, `CONTRIBUTING.md`, `docs/social-preview.svg`, `api/_vdd-rpc.js`.
  The `108` count and the `15 tools` claim are the two strings that drift first.
- V13 This is a breaking release: fourteen `PHASES` keys leave the map (the 13 authoring/alias
  keys plus `detect-environment`), `index.ts` re-exports change, and `_vdd-rpc.js` owns
  `SERVER_VERSION` (`:892`). Name the new owner and bump the workspace to 2.0.0.

**From the external validation**
- V14 The hosted endpoint keeps a read-only tool fallback (`skill_get`) beside resources.
  Tools are supported 24/24, resources 15/24, prompts 13/24; a model cannot pull a resource
  itself, and no resources-only server exists in the wild. The fallback resolves through the
  same manifest allowlist as V3.
- V15 `skills/*` is forward compatibility only: no test, behaviour or README claim may depend
  on it. If it cannot be made conformant (V6) cheaply, drop it rather than ship a claim.
- V16 The contract check is not enough on its own. Pair it with a generate-and-diff job over the
  generated surfaces (registry → tool table, CLI help), because a presence assertion cannot fail
  on a wrong-but-present string. Introduce it in observe mode for one release, with a fixture it
  must reject, then make it blocking. Note the rule it is subject to: *if a change can modify the
  check that judges it, the check is broken* — both checks live in CI and are reviewed as code.
- V17 The registry must carry per-surface affordances: MCP tool names are capped at 64
  characters and must be disambiguated across servers; CLI wants positional arguments and exit
  codes. One generated shape will be a lowest common denominator.
- V18 Release as 2.0.0, keep 1.9.x published and `npm deprecate`d with a migration URL. A
  dual-surface release was considered and declined: measured usage is 2 stars and 340
  downloads/month with no reported consumer, so the maintenance branch would outlive the
  audience. That is an assumption on the evidence, not a fact.
