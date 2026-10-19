// Guided VDD workflows exposed as MCP prompts. Mirrored by api/_vdd-rpc.js PROMPTS
// for the hosted endpoint; packages/vdd-mcp/test/api-surface.test.ts asserts parity.

export interface VddPromptArg {
  name: string;
  description: string;
  required: boolean;
}

export interface VddPrompt {
  name: string;
  title: string;
  description: string;
  arguments: VddPromptArg[];
  text: (a: Record<string, string | undefined>) => string;
}

const HOSTED = `This MCP endpoint is stateless: it cannot read the workspace. Write every artifact it returns to the path in writeTargets, and pass existing artifacts back through artifactFiles when a later tool needs them.`;

export const PROMPTS: VddPrompt[] = [
  {
    name: "start_vdd_project",
    title: "Start a VDD project",
    description: "Run the VDD chain from a vision statement to a test-first task list, gate by gate.",
    arguments: [
      { name: "vision", description: "Freeform 1-3 paragraph vision: who it is for, the change you want, how you will measure it.", required: true },
      { name: "projectRoot", description: "Project root to write constitution.md and vdd/ into (default \".\").", required: false },
    ],
    text: (a) => `Use the Vision Driven Design (VDD) tools to take this vision to a validated task list.\n\nVision:\n${a.vision}\n\nUse projectRoot="${a.projectRoot || "."}" on every call.\n1. vdd_detect_environment with your availableTools, and note any missing tools.\n2. vdd_init.\n3. vdd_vision with statement = the vision above.\n4. vdd_strategize with availableTools; run the research subagents it returns, then call it again with researchFindings.\n5. vdd_tactics.\n6. vdd_specify with actionItemId for the top Must-have item from vdd/tactics.md (use a kebab-case feature name).\n7. vdd_clarify with that feature; resolve every item it returns, then edit the spec.\n8. vdd_plan, then vdd_tasks, for the same feature.\n9. vdd_validate.\n\nAfter each step, report the gate result. Stop and ask me when a gate fails or an input is ambiguous.`,
  },
  {
    name: "implement_next_task",
    title: "Implement the next VDD task",
    description: "Pick the next uncompleted task for a feature, implement it test-first, and keep traceability.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/ (kebab-case).", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Implement the next task for feature "${a.feature}" with Vision Driven Design (projectRoot="${a.projectRoot || "."}").\n1. vdd_get_next_task with feature="${a.feature}".\n2. vdd_implement with the returned taskId; follow its instruction exactly.\n3. Write the failing test first, then the code, then run the tests.\n4. Commit using the impact-chain commit-message format vdd_implement returned, and tick the task in tasks.md.\n5. vdd_inspect with scope="feature" and feature="${a.feature}" to confirm coverage.\n\nDo one task only, then stop and summarise what changed.`,
  },
  {
    name: "change_requirement",
    title: "Change a requirement",
    description: "Cascade a requirement change down the V→S→T→SP→PL→TK chain and re-run the affected gates.",
    arguments: [
      { name: "change", description: "The requirement change, in plain language.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Apply this requirement change with Vision Driven Design (projectRoot="${a.projectRoot || "."}"):\n\n${a.change}\n\n1. vdd_amend with description = the change above.\n2. Apply its ordered steps from the highest affected level downward; edit each artifact yourself.\n3. Re-run the gates it lists with vdd_validate.\n4. vdd_inspect (scope="project") to confirm no orphaned or drifting links.\n\nShow me the cascade plan before editing anything.`,
  },
  {
    name: "init",
    title: "VDD Phase 0 — Constitution",
    description: "Generate constitution.md from the project's real stack, conventions, and constraints.",
    arguments: [
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 0 for projectRoot="${a.projectRoot || "."}".\n${HOSTED}\n1. Read the repository manifests, configs, and existing patterns (package.json, tsconfig, CI, conventions).\n2. Call vdd_init with projectRoot.\n3. Write the returned constitution template to constitution.md and replace every placeholder with actual project values (stack, conventions, security constraints, naming, banned patterns).\n4. Report the write target and any placeholders that still need a human decision. Do not run vdd_vision yet.`,
  },
  {
    name: "vision",
    title: "VDD Phase 1 — Vision",
    description: "Expand a freeform vision statement into vdd/vision.md.",
    arguments: [
      { name: "statement", description: "Freeform 1-3 paragraph vision.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 1 for projectRoot="${a.projectRoot || "."}".\n${HOSTED}\nVision statement:\n${a.statement}\n\n1. Confirm constitution.md exists; if not, run /vdd:init first.\n2. Call vdd_vision with statement and projectRoot.\n3. Write the result to vdd/vision.md (Goal, Actors, Impacts, Stakeholder Map, leading + lagging Success Metrics, Constraints, Target Domains).\n4. Report gate G1: every Goal/Impact has a measurable metric. Stop if the statement is a title rather than 1-3 paragraphs of intent.`,
  },
  {
    name: "strategize",
    title: "VDD Phase 2 — Strategy",
    description: "Dispatch research subagents and synthesize vdd/strategy.md.",
    arguments: [
      { name: "researchFindings", description: "Optional consolidated findings to skip the dispatch pass.", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 2 for projectRoot="${a.projectRoot || "."}".\n${HOSTED}\n1. Confirm vdd/vision.md exists and pass it via artifactFiles.\n2. Call vdd_strategize with availableTools (the tool names you actually have, e.g. ["brave-search","perplexity","context7","gh_grep","playwright","browserless","filesystem","shell"]) and projectRoot.\n3. Dispatch the returned research subagents in parallel and collect findings with citations.\n4. Re-call vdd_strategize with researchFindings${a.researchFindings ? ` (pre-supplied: ${a.researchFindings})` : ""} and write vdd/strategy.md.\n5. Report gate G2: every pillar traces to a vision goal and every goal has at least one pillar.`,
  },
  {
    name: "tactics",
    title: "VDD Phase 3 — Tactics",
    description: "Audit the codebase and produce MoSCoW-prioritized vdd/tactics.md.",
    arguments: [
      { name: "codebaseAudit", description: "Optional pre-computed repo audit; the hosted endpoint cannot scan the repo.", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 3 for projectRoot="${a.projectRoot || "."}".\n${HOSTED}\n1. Scan the repository (directory tree, manifests, modules, technical debt, gaps against vdd/strategy.md) and write the audit as text${a.codebaseAudit ? ` (pre-supplied: ${a.codebaseAudit})` : ""}.\n2. Call vdd_tactics with codebaseAudit, artifactFiles (vision.md, strategy.md) and projectRoot.\n3. Write vdd/tactics.md and list the Must-have action item IDs (A-###).\n4. Report gate G3: every Must-have action item is covered and every item traces to a pillar.`,
  },
  {
    name: "specify",
    title: "VDD Phase 4 — Spec",
    description: "Generate vdd/specs/<feature>/spec.md from a tactical item or freeform description.",
    arguments: [
      { name: "actionItemId", description: "Tactical action item ID (A-###) from vdd/tactics.md.", required: false },
      { name: "description", description: "Freeform description to skip the V/S/T chain.", required: false },
      { name: "feature", description: "Kebab-case feature name (defaults to the action item ID).", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 4 for projectRoot="${a.projectRoot || "."}".\n${HOSTED}\n1. Call vdd_specify with ${a.actionItemId ? `actionItemId="${a.actionItemId}"` : `description="${a.description || ""}"`}, feature="${a.feature || a.actionItemId || ""}", projectRoot.\n2. Write vdd/specs/<feature>/spec.md with user stories, Always/Ask/Never boundaries, measurable Given/When/Then ACs, MoSCoW priorities, non-functional requirements, and an impact link.\n3. Report the feature name and AC count. Every MUST AC needs an edge-case counterpart (AC-E*).`,
  },
  {
    name: "clarify",
    title: "VDD Phase 4b — Clarify",
    description: "Resolve [NEEDS CLARIFICATION] markers and placeholders in an existing spec.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 4b for feature "${a.feature}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Read vdd/specs/${a.feature}/spec.md and pass it via artifactFiles.\n2. Call vdd_clarify with feature and artifactFiles.\n3. Resolve every returned item: replace [NEEDS CLARIFICATION] and [e.g.] placeholders, add edge-case ACs (AC-E*) for every happy-path MUST AC, and rewrite the spec.\n4. Re-read the spec and report the clarification count (target: 0).`,
  },
  {
    name: "plan",
    title: "VDD Phase 5 — Plan",
    description: "Generate plan.md, data-model.md, and contracts/ for a feature.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 5 for feature "${a.feature}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass spec.md (and constitution.md, data-model.md if present) via artifactFiles.\n2. Call vdd_plan with feature and artifactFiles.\n3. Write vdd/specs/${a.feature}/plan.md, data-model.md, and contracts/.\n4. Report gate G4: every AC maps to at least one component and every component traces to an AC.`,
  },
  {
    name: "tasks",
    title: "VDD Phase 6 — Tasks",
    description: "Break the plan into atomic test-first tasks in tasks.md.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 6 for feature "${a.feature}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass spec.md, plan.md, data-model.md, and contracts/ via artifactFiles.\n2. Call vdd_tasks with feature and artifactFiles.\n3. Write vdd/specs/${a.feature}/tasks.md with test-first ordering; every task references an AC and a contract, and is sized S/M/L with [P] when parallelizable.\n4. Report gate G5 and the task count.`,
  },
  {
    name: "get-next-task",
    title: "VDD Phase 7a — Next task",
    description: "Return the next uncompleted task for a feature without implementing it.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 7a for feature "${a.feature}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Read vdd/specs/${a.feature}/tasks.md and pass it via artifactFiles.\n2. Call vdd_get_next_task with feature and artifactFiles.\n3. Return the task ID and instruction. Do not implement or edit anything.`,
  },
  {
    name: "implement",
    title: "VDD Phase 7b — Implement task",
    description: "Prepare and execute one task test-first with impact-chain traceability.",
    arguments: [
      { name: "taskId", description: "Task ID from tasks.md (TASK-###).", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 7b for task "${a.taskId}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass constitution.md, the feature spec/plan/contracts, and tasks.md via artifactFiles.\n2. Call vdd_implement with taskId and artifactFiles.\n3. Follow the returned instruction exactly: write the failing test first, implement, run the tests, commit with the impact-chain message format, and tick the task in tasks.md.\n4. Update the session todo list if one exists.\nReturn a one-screen summary: task ID, files changed, tests run, commit.`,
  },
  {
    name: "validate",
    title: "VDD Phase 8 — Validate",
    description: "Full-chain traceability, drift detection, and impact verification.",
    arguments: [
      { name: "feature", description: "Optional feature to scope the report.", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run VDD Phase 8 (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass every vdd/ artifact (and the code diff summary) via artifactFiles.\n2. Call vdd_validate${a.feature ? ` with feature="${a.feature}"` : ""} and projectRoot.\n3. Write vdd/impact-report.generated.md; never overwrite a hand-authored vdd/impact-report.md.\n4. Report gate G7 plus every uncovered, orphaned, or drifting item with file:line evidence.`,
  },
  {
    name: "inspect",
    title: "VDD Cross-phase — Inspect",
    description: "Read-only traceability matrix (scope=project) or per-feature spec metrics (scope=feature).",
    arguments: [
      { name: "scope", description: "'project' (default) or 'feature'.", required: false },
      { name: "feature", description: "Feature name when scope=feature.", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run a read-only VDD inspection (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass all vdd/ artifacts via artifactFiles.\n2. Call vdd_inspect with scope="${a.scope || "project"}"${a.feature ? `, feature="${a.feature}"` : ""} and projectRoot.\n3. For scope=project render the bidirectional V→S→T→SP→PL→TK matrix; for scope=feature report AC count, unresolved clarifications, placeholder density, and plan.md/tasks.md presence.\nDo not edit files.`,
  },
  {
    name: "trace",
    title: "VDD Cross-phase — Trace",
    description: "Render the bidirectional traceability matrix without editing files.",
    arguments: [
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Render the VDD traceability matrix (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass all vdd/ artifacts via artifactFiles.\n2. Call vdd_inspect with scope="project" and projectRoot.\n3. Render the V→S→T→SP→PL→TK matrix and list every uncovered parent and orphaned child. Do not edit files.`,
  },
  {
    name: "analyze",
    title: "VDD Cross-phase — Analyze",
    description: "Cross-artifact consistency metrics for one feature.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Analyze feature "${a.feature}" for cross-artifact consistency (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Pass spec.md, plan.md, and tasks.md via artifactFiles.\n2. Call vdd_inspect with scope="feature", feature="${a.feature}", and projectRoot.\n3. Report AC count, unresolved [NEEDS CLARIFICATION] items, [e.g.] placeholder count, plan/tasks presence, and readiness. Do not edit files.`,
  },
  {
    name: "amend",
    title: "VDD Cross-phase — Amend",
    description: "Cascade a requirement change through the chain and re-run affected gates.",
    arguments: [
      { name: "description", description: "The requirement change, in plain language.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Apply a requirement change with VDD (projectRoot="${a.projectRoot || "."}"):\n\n${a.description}\n\n${HOSTED}\n1. Pass every vdd/ artifact via artifactFiles and call vdd_amend with description and projectRoot.\n2. Show the cascade plan (highest affected level, ordered steps, affected gates G1-G7) before editing anything.\n3. After approval, update the artifacts top-down and re-run the affected gates with vdd_validate.\n4. Call vdd_inspect with scope="project" to confirm there is no drift or orphan.`,
  },
  {
    name: "detect-environment",
    title: "VDD Cross-phase — Detect environment",
    description: "Report per-phase required and missing host tools before research or implementation.",
    arguments: [
      { name: "availableTools", description: "Optional comma-separated host tool names.", required: false },
    ],
    text: (a) => `Run VDD environment detection.\n1. Call vdd_detect_environment with availableTools (the names you actually have, e.g. ["brave-search","perplexity","context7","gh_grep","playwright","browserless","filesystem","shell"]${a.availableTools ? `; pre-supplied: ${a.availableTools}` : ""}).\n2. Report the per-phase required vs present/missing tools and the Phase 2 research dispatch plan. Do not edit files.`,
  },
  {
    name: "clone",
    title: "VDD Clone — Crawl and manifest",
    description: "Crawl a domain into a clone dataset and manifest for the vdd-clone skill.",
    arguments: [
      { name: "description", description: "Domain to clone (https://example.com or example.com).", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run the VDD clone workflow for "${a.description}" (projectRoot="${a.projectRoot || "."}").\n${HOSTED}\n1. Call vdd_clone with description="${a.description}" and projectRoot.\n2. Write vdd/clone-dataset.json, vdd/clone-manifest.json, and vdd/clone.md.\n3. Report page count, detected CMS/locales, and the manifest path. To make the clone live, use the vdd-clone skill.`,
  },
  {
    name: "e2e",
    title: "VDD End-to-end",
    description: "Run the full 8-phase chain from a vision statement using the available phase tools.",
    arguments: [
      { name: "statement", description: "Freeform 1-3 paragraph vision.", required: true },
      { name: "feature", description: "Kebab-case feature name (default feature-1).", required: false },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Run the full VDD chain end-to-end for projectRoot="${a.projectRoot || "."}" and feature="${a.feature || "feature-1"}".\n${HOSTED}\nVision:\n${a.statement}\n\n1. vdd_detect_environment with your availableTools.\n2. vdd_init, then write constitution.md.\n3. vdd_vision, then write vdd/vision.md. Report G1.\n4. vdd_strategize (command-and-control pass), dispatch the research subagents, re-call with researchFindings, write vdd/strategy.md. Report G2.\n5. vdd_tactics with codebaseAudit, write vdd/tactics.md. Report G3.\n6. vdd_specify for the top Must-have action item, write spec.md. Report G3.\n7. vdd_clarify, resolve every item, rewrite spec.md.\n8. vdd_plan, write plan.md/data-model.md/contracts. Report G4.\n9. vdd_tasks, write tasks.md. Report G5.\n10. vdd_get_next_task and report the first task.\n11. vdd_validate, write vdd/impact-report.generated.md. Report G6 and G7.\n\nPass artifactFiles on every filesystem-dependent call and write every writeTarget. Stop and report on the first failed gate.`,
  },
];
