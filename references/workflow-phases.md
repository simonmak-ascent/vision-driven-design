# Workflow phases

The phases of a VDD cycle in 2.0.0: phase 0 to phase 8, where each phase authors one artifact and
phase 7 is the host agent's own work. The procedure for each is the skill of the same name —
`skill://vdd-<phase>/SKILL.md` — and the only tool call a phase makes is `vdd_check`, except
phase 8, which uses `vdd_chain_validate`.

| Phase | Artifact | Skill | Parent it must serve |
|---|---|---|---|
| 0 Constitution | `constitution.md` | `vdd-constitution` | — |
| 1 Vision | `vdd/vision.md` | `vdd-vision` | — |
| 2 Strategy | `vdd/strategy.md` | `vdd-strategy` | each `V-###` |
| 3 Tactics | `vdd/tactics.md` | `vdd-tactics` | each `S-###` |
| 4 Specs | `vdd/specs/<feature>/spec.md` | `vdd-specs` | each MUST `A-###` |
| 5 Plan | `vdd/specs/<feature>/plan.md` | `vdd-plan` | each `SP-###` |
| 6 Tasks | `vdd/specs/<feature>/tasks.md` | `vdd-tasks` | each `PL-###` |
| 7 Implement | code + tests | `vdd-implement` | each `TK-###` |
| 8 Validate | the whole chain | `vdd-validate` | every `V-###` reaching a `TK-###` |

## Phase 0 — Constitution

Write the eight sections of the constitution template. There is no automated check in 2.0.0: the six
content checks the old engine ran are the skill's checklist, and a human reads the result. The phase
declares no ids and has no junction.

## Phase 1 — Vision

Fill the framework artifact — §0 Input through §6 Decision — then write `## Chain projection`, one line
per selected objective: `- V-001 → OBJ-001`. The objective is authoritative; the projection carries the
two ids and never restates a metric.

`vdd_check` validates the projection (v18 §4): the section must exist, every line beginning `- V-`
must be `- V-### → OBJ-###` exactly, no `V-###` or `OBJ-###` may appear twice, every `V-###` in the artifact
must be projected, and every projected objective must be declared before the heading. It also compares
the declared goal count, when you send one, with the number of projection lines. The headings, the
claim ledger, the grid and the GRADE `downgrades` are the skill's checklist, not the tool's.

## Phase 2 — Strategy

Each pillar opens with its id (`### S-001: <name>`) and names one goal (`serves_goal: V-001`). The first
pillar for a goal serves only that goal.

## Phase 3 — Tactics

Each action item opens with its id and names one pillar (`serves_pillar: S-001`). Its priority must be in
a form the engine parses — `priority: MUST`, a `| MUST |` cell on the row that opens it, or `[MUST]` —
because the specs phase binds to MUST actions only, and an unparsed priority is not a parent at all.

## Phase 4 — Specs

`content` is the whole specs set, not one file: the check reports an empty row for every MUST action no
spec covers. Each spec opens with `# SP-001: <feature>` and names its action (`serves_action: A-001`). A
spec serving a SHOULD action is an orphan.

## Phase 5 — Plan

Each component opens with `### PL-001: <name>` and names its spec (`serves_spec: SP-001`). `data-model.md`
and `contracts/` are views of a component: they carry no junction field and are linked from the component
that owns them.

## Phase 6 — Tasks

Each task opens with a checkbox and its id (`- [ ] **TK-001** [S] ...`) and names its component
(`serves_component: PL-001`). A task that touches two components is two tasks.

## Phase 7 — Implement

No tool. The host agent's own file, shell and test tools do the work, and the commit message names the
task id and the chain.

## Phase 8 — Validate

`vdd_chain_validate` over all six artifacts at once: every phase's invariants, plus the cross-phase check
that every goal reaches a task. Fix the earliest failure first — a broken junction invalidates everything
below it.

## Where the rules live

`references/coverage-invariants.md` states invariants A–C, the two count rules and the reference fixture.
A phase's procedure is its skill; the tools judge, the skills instruct.
