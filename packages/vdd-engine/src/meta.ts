// Canonical metadata shared by the engine, MCP server, and CLI.
// Single source of truth for phase names, phase descriptions/instructions,
// per-phase tool requirements, research subagent dispatch specs, and domain primers.

export const PHASE_NAMES = [
  'init',
  'vision',
  'strategize',
  'tactics',
  'specify',
  'clarify',
  'plan',
  'tasks',
  'get-next-task',
  'implement',
  'validate',
  'trace',
  'analyze',
  'inspect',
  'amend',
  'e2e',
  'clone',
  'detect-environment',
] as const;

export type PhaseName = (typeof PHASE_NAMES)[number];

export interface PhaseMeta {
  description: string;
  instructions: string;
}

export const PHASE_META: Record<PhaseName, PhaseMeta> = {
  init: {
    description: 'VDD Phase 0: Generate constitution.md at the project root — the immutable tech stack, conventions, security constraints, naming rules, and banned patterns that every later phase obeys. Overwrites any existing constitution.md. Run this first, before vdd_vision; to change a constitution that already exists, use vdd_amend instead of re-running this. projectRoot sets the directory constitution.md is written to and that later phases resolve every vdd/ artifact against (default ".").',
    instructions: 'Run this first. AI agent should read the existing codebase (package.json, tsconfig, existing patterns) and fill in the constitution template with actual project values.',
  },
  vision: {
    description: 'VDD Phase 1: Expand a freeform vision statement into vdd/vision.md — Impact Model (Goal, Actors, Impacts), Stakeholder Map, Success Metrics (leading + lagging), Constraints & Boundaries, and Target Domains. Overwrites any existing vdd/vision.md. Requires statement (freeform 1-3 paragraph intent, not a title) and a prior vdd_init. Run once, after vdd_init and before vdd_strategize; to revise a vision once downstream artifacts exist, use vdd_amend so the change cascades instead of re-running this.',
    instructions: 'Provide a 1-3 paragraph freeform "statement" describing the impact you want to create. The AI agent should then expand and formalize it into the vision template. The template file is written to vdd/vision.md.',
  },
  strategize: {
    description: 'VDD Phase 2: Produce research-backed strategy into vdd/strategy.md — strategic pillars, competitive analysis, and a risk register, resolved from the vision target-domain primers. Overwrites vdd/strategy.md. Requires vdd/vision.md; run after vdd_vision and before vdd_tactics. Two-pass: call once with availableTools to get the research-subagent dispatch specs, then re-call with researchFindings to synthesize strategy.md (a first call with neither returns only the dispatch specs). To change strategy after artifacts exist, use vdd_amend.',
    instructions: 'Requires vdd/vision.md to exist. Dispatch the returned research subagents using your environment tools (Brave Search, Perplexity, Context7, gh_grep, Playwright), then re-call vdd_strategize with researchFindings to synthesize vdd/strategy.md. Pass availableTools to detect missing capabilities.',
  },
  tactics: {
    description: 'VDD Phase 3: Audit the existing codebase into vdd/tactics.md — repo audit, technical-debt assessment, gap analysis, MoSCoW-prioritized action items (A-001, A-002, …), dependency map, and infrastructure requirements. Overwrites vdd/tactics.md. Requires vdd/strategy.md; run after vdd_strategize and before vdd_specify. Needs a filesystem-capable host to scan the repo, so check with vdd_detect_environment first if the host may lack one.',
    instructions: 'Requires vdd/strategy.md. AI agent should audit the existing codebase: scan directory structure, read package manifests, identify existing modules, assess technical debt, map gaps to strategy pillars, and produce prioritized action items (A-001, A-002, ...). Output to vdd/tactics.md.',
  },
  specify: {
    description: 'VDD Phase 4: Generate vdd/specs/<id>/spec.md for one tactical action item — user stories, Always/Ask/Never boundaries, Given/When/Then acceptance criteria (AC), MoSCoW priorities, non-functional requirements, and impact verification. Overwrites the spec file. Pass actionItemId (e.g. "A-001") or a freeform description to skip the V/S/T chain. Use for a NEW spec; to resolve leftover [NEEDS CLARIFICATION] markers in an existing spec use vdd_clarify instead.',
    instructions: 'Pass actionItemId (e.g., "A-001") or a freeform "description". The AI agent should surface assumptions, write precise ACs with measurable criteria, define boundaries, and connect each AC to a vision impact. Output to vdd/specs/<id>/spec.md.',
  },
  clarify: {
    description: 'VDD Phase 4b: Clarify an existing spec — scans vdd/specs/<feature>/spec.md and returns the items to resolve: every [NEEDS CLARIFICATION] marker, [e.g.] placeholder, and happy-path acceptance criterion (AC) still needing an edge-case counterpart (AC-E*). Read-only; returns the list without editing the file (the host agent then applies the resolutions). Pass feature (spec directory name). Run after vdd_specify when a spec has unresolved markers; to author a brand-new spec use vdd_specify instead.',
    instructions: 'Pass "feature" (the spec directory name). AI agent reads the spec, resolves every [NEEDS CLARIFICATION] item, replaces [e.g.] placeholders with concrete values, and adds edge-case ACs (AC-E*) for every happy-path MUST AC.',
  },
  plan: {
    description: 'VDD Phase 5: Generate the technical blueprint under vdd/specs/<feature>/ — plan.md (component breakdown, AC coverage map, technology choices, verification toolchain), data-model.md (entities, indexes, migrations), and contracts/ (request/response/error schemas). Overwrites these files. Requires an existing spec for the feature; run after vdd_specify or vdd_clarify and before vdd_tasks — if no spec exists yet, run vdd_specify first.',
    instructions: 'Pass "feature". AI agent translates the spec into architecture: component decomposition, technology decisions, AC→component mapping, verification tool selection (Vitest, Playwright, Browserless, Sentry), data model design, and API contract definitions. Outputs 3 files.',
  },
  tasks: {
    description: 'VDD Phase 6: Break the plan into atomic test-first tasks in vdd/specs/<feature>/tasks.md — each references acceptance criteria (AC) and contracts, is sized S/M/L, and is marked [P] when parallelizable. Overwrites tasks.md. Requires plan.md; run after vdd_plan. To fetch the next uncompleted task from an existing tasks.md use vdd_get_next_task instead of re-running this.',
    instructions: 'Pass "feature". AI agent decomposes each plan component into granular tasks with test-first ordering (test task before impl task). Every impl task traces to a contract and AC. Output to vdd/specs/<feature>/tasks.md.',
  },
  'get-next-task': {
    description: 'VDD Phase 7a: Read vdd/specs/<feature>/tasks.md and return the next uncompleted task (or a completion marker when none remain). Read-only; never edits tasks.md. Pass feature (the exact spec directory name). Use before each implementation session to keep context isolated; to regenerate the whole list use vdd_tasks, and to execute the returned task use vdd_implement.',
    instructions: 'Pass "feature". Returns the first uncompleted task line from tasks.md. The AI agent should then start a fresh context window for that task.',
  },
  implement: {
    description: 'VDD Phase 7b: Prepare one task for implementation — loads constitution, spec, plan, and contracts and returns the implementation instruction plus the impact-chain commit-message format. Read-only; the tool writes nothing — the host agent performs the code edits, verification, and commit. Pass taskId (e.g. "TASK-003") from the task returned by vdd_get_next_task. Run one task at a time, after vdd_get_next_task; for read-only inspection of tasks use vdd_get_next_task instead.',
    instructions: 'Pass "taskId". AI agent loads constitution + task description + relevant spec/plan/contracts. Implements with constraints from Boundaries section. Commits with traceable message format.',
  },
  validate: {
    description: 'VDD Phase 8: Validate the full chain — bidirectional traceability matrix, drift detection, orphan detection, uncovered vision goals, impact metrics vs targets, and 28 S&T assumption checks across 7 gates. Writes vdd/impact-report.generated.md and never overwrites a hand-authored vdd/impact-report.md. Run after implementation is complete; for a lightweight per-feature consistency check or the project-wide matrix use vdd_inspect. artifactFiles maps artifact path→content for serverless runs where the tool cannot read the filesystem — omit it when running locally against projectRoot.',
    instructions: 'AI agent generates the complete impact-verification report: forward coverage (V→S→T→SP→PL→TK→code), backward authorization, orphan detection, uncovered detection, metric comparison, S&T validation, and drift report. Output to vdd/impact-report.generated.md, leaving any hand-authored vdd/impact-report.md untouched.',
  },
  trace: {
    description: 'VDD Cross-phase: Generate the bidirectional V→S→T→SP→PL→TK traceability matrix for the current project. Read-only — reads all vdd/ artifacts and returns the matrix without modifying files. Use any time to inspect coverage; for per-feature spec metrics use vdd_inspect, and for release-readiness validation with gates use vdd_validate.',
    instructions: 'AI agent reads all existing artifacts in vdd/ and produces a traceability matrix mapping every level to its parent and children.',
  },
  analyze: {
    description: 'VDD Cross-phase: Cross-artifact consistency analysis for one feature — acceptance-criteria (AC) count, unresolved [NEEDS CLARIFICATION] markers, [e.g.] placeholder density, and whether plan.md and tasks.md exist. Read-only; returns metrics without modifying files. Pass feature (the spec directory name). Use during planning and implementation to check a spec is complete; for the project-wide matrix use vdd_inspect, and for release validation use vdd_validate.',
    instructions: 'Pass "feature". AI agent reads spec.md, plan.md, tasks.md for the feature and reports metrics: AC count, unresolved [NEEDS CLARIFICATION] items, [e.g.] placeholder count, and readiness status.',
  },
  inspect: {
    description: 'VDD Cross-phase: Read-only inspection of the current project in one call — scope selects the view. scope="project" (default) returns the bidirectional V→S→T→SP→PL→TK traceability matrix across all vdd/ artifacts; scope="feature" returns per-feature spec metrics (acceptance-criteria count, unresolved [NEEDS CLARIFICATION] markers, [e.g.] placeholder density, and whether plan.md/tasks.md exist). Never modifies files. Pass feature for the feature scope; for release-readiness validation with gates use vdd_validate, and to author a spec use vdd_specify.',
    instructions: 'Read-only. With scope="project" (default), read all vdd/ artifacts and produce the traceability matrix mapping every level to its parent and children. With scope="feature", read vdd/specs/<feature>/spec.md, plan.md, and tasks.md and report AC count, unresolved clarifications, placeholder count, and readiness status.',
  },
  amend: {
    description: 'VDD Cross-phase: Plan a requirement-change cascade through the whole chain — identifies the highest affected level and returns the ordered steps to update downward V→S→T→SP→PL→TK and re-run affected gates (G1–G7). Read-only; returns the cascade plan without editing artifacts (the host agent applies the edits and commits). Pass the change as description. Use when a requirement changes after artifacts already exist; to build a phase from scratch the first time, run that phase\'s own tool instead of vdd_amend.',
    instructions: 'Pass "description" of what changed. AI agent identifies the highest affected level, updates all downstream artifacts, re-runs affected gates (G1–G7), and commits each updated artifact with [AMEND] marker.',
  },
  e2e: {
    description: 'VDD End-to-End: Run the full 8-phase chain (init → vision → strategize → tactics → specify → clarify → plan → tasks → get-next-task → validate) in one call, writing all 10+ template files with impact-chain headers. Overwrites existing artifacts. Pass the freeform vision statement; use feature (default "feature-1") to name the spec directory. Use for greenfield projects — for incremental changes, call the individual phase tools instead.',
    instructions: 'Pass "statement" with your vision. The tool runs all phases end-to-end, creating every artifact: constitution.md, vision.md, strategy.md, tactics.md, spec.md, plan.md, data-model.md, contracts/, tasks.md, and impact-report.md. Use optional "feature" (default "feature-1") to customize the spec directory name. The AI agent then fills in each template with domain-specific content.',
  },
  'detect-environment': {
    description: 'VDD Environment Detection: Report which tools/MCPs each VDD phase requires vs treats as optional — across the 8-phase pipeline (init through validate) plus the cross-phase helpers (amend, clone, inspect, get-next-task) — and which of the host agent availableTools are present vs missing. Read-only; returns a capability report without modifying files. Run before vdd_strategize to plan research-subagent dispatch, or when a phase fails for lack of a tool; to inspect artifacts instead of capabilities use vdd_inspect. Pass availableTools (or its alias capabilities); omitting both returns the per-phase requirements without the present/missing comparison.',
    instructions: 'Pass availableTools (array of MCP/tool names available to the host agent, e.g. ["brave-search","perplexity","context7","gh_grep","playwright","filesystem"]). Returns a per-phase capability report. Used before Phase 2 (strategize) to plan research subagent dispatch.',
  },
  clone: {
    description: 'Crawl and capture a target domain into a clone dataset + manifest — WordPress-aware schema inference, Payload collections, and a Next.js + Payload + Postgres scaffold manifest (vdd/clone-manifest.json). Writes vdd/clone-dataset.json, vdd/clone-manifest.json, and vdd/clone.md. Pass the domain as description; tune maxPages, timeoutMs, concurrency, crawl, browser, and refresh (set refresh=true to bypass a cached dataset and re-crawl). Open-world: makes network requests to the target site. Use for cloning an external site; it is not part of the VDD phase pipeline, so for the normal init→validate flow call those phase tools instead.',
    instructions: 'Pass the domain as "description" (or "statement"). The phase normalizes the domain, crawls the site (sitemap + same-origin links, browserless-first with plain-fetch fallback) into vdd/clone-dataset.json, detects WordPress CMS (content types, taxonomies, Polylang locales), infers the content model, generates Payload collections, and writes vdd/clone-manifest.json + vdd/clone.md. To make the clone live, run the `vdd-clone` skill: scaffold a Next.js + Payload + Postgres app at the project root (`.`), then `docker compose up` (self-hosted Postgres) and expose via `cs tunnel`. Browserless config: BROWSERLESS_HOST (default http://localhost:3000) + BROWSERLESS_TOKEN env vars.',
  },
};

// Canonical tool keys used to match host-provided `availableTools`.
export const TOOL_KEYS = [
  'brave-search',
  'perplexity',
  'context7',
  'gh_grep',
  'playwright',
  'browserless',
  'filesystem',
  'shell',
] as const;

export interface ToolRequirements {
  required: string[];
  optional: string[];
}

// Per-phase tool requirements — mirrors references/ai-agent-patterns.md "AI Tool Selection Per Phase".
export const TOOL_REQUIREMENTS: Record<PhaseName, ToolRequirements> = {
  init: { required: [], optional: [] },
  vision: { required: [], optional: [] },
  strategize: { required: ['brave-search', 'perplexity'], optional: ['context7', 'gh_grep', 'playwright', 'browserless'] },
  tactics: { required: ['filesystem'], optional: ['shell'] },
  specify: { required: [], optional: [] },
  clarify: { required: ['filesystem'], optional: [] },
  plan: { required: ['filesystem'], optional: ['context7'] },
  tasks: { required: [], optional: [] },
  'get-next-task': { required: ['filesystem'], optional: [] },
  implement: { required: ['filesystem'], optional: ['shell'] },
  validate: { required: ['filesystem'], optional: ['shell'] },
  trace: { required: ['filesystem'], optional: [] },
  analyze: { required: ['filesystem'], optional: [] },
  inspect: { required: ['filesystem'], optional: [] },
  amend: { required: ['filesystem'], optional: [] },
  e2e: { required: ['filesystem'], optional: ['brave-search', 'perplexity', 'context7', 'gh_grep', 'playwright', 'browserless', 'shell'] },
  clone: { required: ['filesystem'], optional: ['playwright', 'browserless', 'shell'] },
  'detect-environment': { required: [], optional: [] },
};

export interface ResearchSubagent {
  id: string;
  name: string;
  role: string;
  tools: string[];
  input: string;
  output: string;
  timeoutSeconds: number;
  requiresCitations: boolean;
}

// The 5 parallel research subagents dispatched during Phase 2 (Strategy).
// Mirrors references/ai-agent-patterns.md "Parallel Research Subagents".
export const RESEARCH_SUBAGENTS: ResearchSubagent[] = [
  {
    id: 'market',
    name: 'Market Research',
    role: 'Market size, growth, target-user demographics, trends, and regulatory factors',
    tools: ['brave-search', 'perplexity'],
    input: 'vision.md (goal, actors, impacts, target domains)',
    output: '300-500 word summary with citations',
    timeoutSeconds: 120,
    requiresCitations: true,
  },
  {
    id: 'competitive',
    name: 'Competitive Analysis',
    role: 'Top competitors, features, pricing, user sentiment, weaknesses, adjacent products',
    tools: ['brave-search', 'playwright'],
    input: 'vision.md + domain-primers (market section)',
    output: '300-500 word competitive matrix with citations',
    timeoutSeconds: 120,
    requiresCitations: true,
  },
  {
    id: 'technology',
    name: 'Technology Assessment',
    role: 'Viable technologies, trade-offs, technology risks, proven infrastructure patterns',
    tools: ['context7', 'gh_grep'],
    input: 'vision.md + constitution.md (tech stack) + domain-primers (tech section)',
    output: '300-500 word technology fit assessment',
    timeoutSeconds: 120,
    requiresCitations: true,
  },
  {
    id: 'impact',
    name: 'Impact Feasibility',
    role: 'Similar impact attempts, what worked/failed, impact measurement, realistic timelines',
    tools: ['perplexity'],
    input: 'vision.md (impact model + success metrics)',
    output: '300-500 word feasibility analysis with case studies',
    timeoutSeconds: 120,
    requiresCitations: true,
  },
  {
    id: 'domain',
    name: 'Domain Deep-Dive',
    role: 'Domain-specific constraints, anti-patterns, and impact measurement best practices',
    tools: ['domain-primers'],
    input: 'vision.md + domain-primers',
    output: '300-500 word domain-specific constraints and patterns',
    timeoutSeconds: 120,
    requiresCitations: false,
  },
];

export interface DomainPrimer {
  file: string;
  label: string;
  condition: 'unconditional' | 'webapp' | 'data-storage' | 'etl' | 'infrastructure' | 'safety-critical';
  summary: string;
}

// The 7 domain primers. Mirrors SKILL.md "Domain Primers" table.
export const DOMAIN_PRIMERS: DomainPrimer[] = [
  { file: 'human-factors.md', label: 'Human Factors', condition: 'unconditional', summary: 'Behavioral economics, cognitive load, habit formation' },
  { file: 'verification-toolchain.md', label: 'Verification Toolchain', condition: 'unconditional', summary: 'Playwright, Browserless, Sentry, CI/CD quality pipeline' },
  { file: 'webapp.md', label: 'WebApp', condition: 'webapp', summary: 'UX, accessibility, performance, framework evaluation' },
  { file: 'data-storage.md', label: 'Data Storage', condition: 'data-storage', summary: 'Schema design, indexing, data governance' },
  { file: 'etl.md', label: 'ETL', condition: 'etl', summary: 'Pipeline architecture, data quality, streaming vs batch' },
  { file: 'infrastructure.md', label: 'Infrastructure', condition: 'infrastructure', summary: 'CI/CD, observability, security, scaling, disaster recovery' },
  { file: 'safety-critical.md', label: 'Safety-Critical', condition: 'safety-critical', summary: 'FMEA/FTA, safety integrity levels (DO-178C/IEC 62304)' },
];

function normalizeToolKey(tool: string): string {
  const t = tool.trim().toLowerCase();
  if (t === 'context7' || t === 'context-7' || t === 'context_7') return 'context7';
  if (t === 'gh_grep' || t === 'gh-grep' || t === 'ghgrep') return 'gh_grep';
  if (t === 'brave-search' || t === 'brave_search' || t === 'brave') return 'brave-search';
  if (t === 'browserless') return 'browserless';
  if (t === 'playwright') return 'playwright';
  if (t === 'perplexity') return 'perplexity';
  if (t === 'filesystem' || t === 'fs' || t === 'glob' || t === 'grep' || t === 'read') return 'filesystem';
  if (t === 'shell' || t === 'bash' || t === 'terminal') return 'shell';
  return t;
}

export interface EnvironmentReport {
  available: string[];
  phases: Record<PhaseName, { required: string[]; optional: string[]; requiredAvailable: boolean }>;
  missingRequired: string[];
  missingOptional: string[];
  researchLimitations: string[];
}

export function detectEnvironment(availableTools: string[] = []): EnvironmentReport {
  const available = new Set((availableTools ?? []).map(normalizeToolKey));
  const phases = {} as Record<PhaseName, { required: string[]; optional: string[]; requiredAvailable: boolean }>;
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const researchLimitations: string[] = [];

  for (const name of PHASE_NAMES) {
    const req = TOOL_REQUIREMENTS[name];
    const requiredAvailable = req.required.every((t) => available.has(t));
    phases[name] = { required: [...req.required], optional: [...req.optional], requiredAvailable };
  }

  const strategyReq = TOOL_REQUIREMENTS.strategize;
  for (const t of strategyReq.required) {
    if (!available.has(t)) missingRequired.push(t);
  }
  for (const t of strategyReq.optional) {
    if (!available.has(t)) missingOptional.push(t);
  }

  if (!available.has('brave-search') && !available.has('perplexity')) {
    researchLimitations.push('No web-search or research tool available — Market/Competitive/Impact subagents cannot run. Strategy research is degraded to domain-primer only.');
  } else if (!available.has('perplexity')) {
    researchLimitations.push('Perplexity unavailable — Impact Feasibility subagent cannot run; Market Research falls back to Brave Search only.');
  } else if (!available.has('brave-search')) {
    researchLimitations.push('Brave Search unavailable — Market/Competitive subagents degraded to Perplexity research only.');
  }
  if (!available.has('context7') && !available.has('gh_grep')) {
    researchLimitations.push('Context7 and gh_grep unavailable — Technology Assessment subagent cannot run.');
  }
  if (!available.has('filesystem')) {
    researchLimitations.push('Filesystem unavailable — Tactics audit and drift detection cannot run.');
  }

  return { available: [...available], phases, missingRequired, missingOptional, researchLimitations };
}

export function domainPrimersForTargets(targetDomains: string[]): DomainPrimer[] {
  const normalized = new Set(targetDomains.map((d) => d.trim().toLowerCase()));
  return DOMAIN_PRIMERS.filter((p) => {
    if (p.condition === 'unconditional') return true;
    return normalized.has(p.condition);
  });
}

// Non-obvious cross-parameter facts the JSON schema does not carry, so agents
// know how parameters interact across the pipeline. Appended to each phase's
// tool description by the MCP surfaces (stdio and hosted). Feeds Glama's
// "Parameter Semantics" dimension beyond schema coverage.
export const PARAM_RELATIONSHIP_NOTES: Partial<Record<PhaseName, string>> = {
  init: ' Parameter relationships: projectRoot defaults to "." and must be the same root every later phase resolves against.',
  vision: ' Parameter relationships: statement must be freeform prose (1-3 paragraphs), not a title; projectRoot must match the root used by vdd_init.',
  strategize: ' Parameter relationships: availableTools and capabilities are aliases (pass one); the first call returns research-subagent dispatch specs and a second call carrying researchFindings synthesizes strategy.md.',
  tactics: ' Parameter relationships: projectRoot must match the root used by vdd_init, vdd_vision, and vdd_strategize; requires vdd/strategy.md to exist.',
  specify: ' Parameter relationships: feature names the vdd/specs/<feature>/ directory and must match the feature passed to vdd_clarify, vdd_plan, and vdd_tasks; actionItemId is the A-### id from tactics.md and is optional when authoring from a freeform description.',
  clarify: ' Parameter relationships: feature must be the exact spec directory name created by vdd_specify.',
  plan: ' Parameter relationships: feature must match the value passed to vdd_specify and vdd_tasks.',
  tasks: ' Parameter relationships: feature must match the value passed to vdd_plan.',
  'get-next-task': ' Parameter relationships: feature must match the spec directory; the returned taskId (TASK-###) is the argument to vdd_implement.',
  implement: ' Parameter relationships: taskId comes from vdd_get_next_task (format TASK-###); projectRoot must match the root used by earlier phases.',
  validate: ' Parameter relationships: feature narrows the check to one spec; artifactFiles maps artifact path to content for serverless runs and is omitted when resolving against a local projectRoot. Choose vdd_validate for the release-readiness gate report; use vdd_inspect for the traceability matrix or per-feature spec metrics.',
  inspect: ' Parameter relationships: scope="feature" requires feature, while scope="project" (the default) ignores it; projectRoot must match the root used by earlier phases. Choose vdd_inspect for the traceability matrix or per-feature metrics; use vdd_validate for the gate report.',
  amend: ' Parameter relationships: description is the requirement change to cascade through the artifact chain; projectRoot must match the root used by earlier phases.',
  clone: ' Parameter relationships: description is the target domain and statement is the desired outcome (both optional); maxPages, timeoutMs, concurrency, crawl, and browser tune the crawl and refresh=true bypasses a cached dataset.',
  'detect-environment': ' Parameter relationships: availableTools and capabilities are aliases; omit both to get the per-phase requirements without a present/missing comparison.',
};
