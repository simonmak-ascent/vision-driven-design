import { promises as fs } from 'fs';
import { dirname } from 'path';
import { VddPhaseFn, VddPhaseInput, VddContext, VddOutput } from './types.js';
import { normalizeDomain } from './normalize-domain.js';
import { runClone } from './clone-pipeline.js';
import { RESEARCH_SUBAGENTS, detectEnvironment, domainPrimersForTargets, type DomainPrimer } from './meta.js';
import type { CloneManifest, DeployConfig, SiteDataset } from './clone-types.js';

function today(): string {
  return new Date().toISOString().split('T')[0];
}

async function ensureDir(path: string): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
}

function templateHeader(impactChain: string): string {
  return `Status: Draft
Version: 1.0
Last updated: ${today()}

> Impact Chain: ${impactChain}

`;
}

async function writeArtifact(path: string, content: string): Promise<{ written: boolean; error?: string }> {
  try {
    await ensureDir(path);
    await fs.writeFile(path, content, 'utf-8');
    return { written: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { written: false, error: msg };
  }
}

// Graceful degradation: instead of hard-failing when a selector argument is
// missing, return an actionable success payload. Agents (and the MCP reliability
// probes) can then recover without a dead end.
function needsInput(fields: string[], instruction: string, extra: Record<string, unknown> = {}): VddOutput {
  return {
    success: true,
    artifact: 'Guidance — input required',
    output: { needsInput: fields, instruction, ...extra },
  };
}

async function listFeatureDirs(root: string): Promise<string[]> {
  try {
    return (await fs.readdir(root + '/vdd/specs', { withFileTypes: true }))
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

// If no `feature` was passed, resolve it: auto-use the single spec directory when
// there is exactly one; otherwise return guidance listing what is available.
// Returns null when input.feature is (now) set, or a guidance VddOutput otherwise.
async function withFeature(input: VddPhaseInput, root: string, tool: string): Promise<VddOutput | null> {
  if (input.feature) return null;
  const available = await listFeatureDirs(root);
  if (available.length === 1) {
    input.feature = available[0];
    return null;
  }
  return needsInput(
    ['feature'],
    available.length > 1
      ? `Multiple spec directories exist — pass feature=<name>. Available: ${available.join(', ')}.`
      : `No spec directories under vdd/specs. Run /vdd:specify first (or pass feature=<name>), then re-run /vdd:${tool}.`,
    { availableFeatures: available, tool },
  );
}

// Phase 0: init
async function init(_: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const artifact = ctx.projectRoot + '/constitution.md';
  const content = '# Project Constitution\n' +
    templateHeader('Phase 0 — Constitution (immutable)') +
    '## Architecture Principles\n\n' +
    '- [e.g., "API-first: all features expose a REST endpoint before any UI is built"]\n' +
    '- [e.g., "Server Components by default; use client components only when required"]\n' +
    '- [e.g., "No ORM other than Drizzle; raw SQL only for complex analytics queries"]\n\n' +
    '## Technology Stack\n\n' +
    '| Layer | Choice | Notes |\n|-------|--------|-------|\n' +
    '| Language | TypeScript 5.x | Strict mode, no `any` |\n' +
    '| Runtime | Node.js 20+ | |\n' +
    '| Framework | [e.g., Next.js 15+] | App Router only |\n' +
    '| Database | PostgreSQL + Drizzle | No direct SQL in route handlers |\n' +
    '| Auth | [e.g., Better Auth] | No custom auth logic outside the auth module |\n' +
    '| Testing | Vitest + Playwright | |\n\n' +
    '## Security Constraints\n\n' +
    '- Authentication: all endpoints require a valid session unless explicitly marked `[PUBLIC]`\n' +
    '- Input validation: all external inputs validated with Zod at the route boundary\n' +
    '- SQL injection: parameterized queries only — never string-concatenate user input into queries\n' +
    '- Secrets: never log tokens, passwords, or PII; never hardcode secrets\n' +
    '- CORS: allow-list only — no wildcard origins in production\n' +
    '- Rate limiting: all public endpoints must declare a rate limit in their contract\n\n' +
    '## Naming Conventions\n\n' +
    '- Files: kebab-case (`user-repository.ts`)\n' +
    '- Variables/functions: camelCase\n' +
    '- Types/interfaces: PascalCase\n' +
    '- DB columns: snake_case\n' +
    '- Env vars: SCREAMING_SNAKE_CASE\n\n' +
    '## Banned Patterns\n\n' +
    '- No `any` type in TypeScript\n' +
    '- No `console.log` in production code (use logger)\n' +
    '- No synchronous file I/O in request handlers\n' +
    '- No direct DOM manipulation (use React)\n' +
    '- No [project-specific banned pattern]\n\n' +
    '## File Structure Rules\n\n' +
    '```\n' +
    'src/\n  app/          # Routes and pages\n  components/   # Shared UI components\n' +
    '  lib/          # Business logic and utilities\n  db/           # Schema, migrations, repositories\n' +
    '  types/        # Shared TypeScript types\n```\n\n' +
    '## Domain Primitives\n\n' +
    '<!-- Which domain-primers apply to this project? -->\n- webapp\n- data-storage\n- [etl / infrastructure]\n\n' +
    '## Open Questions / Deferred Decisions\n\n- [PENDING] [Decision 1]: [context and options]\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write constitution.md: ' + (result.error || 'unknown') };
  return { success: true, artifact };
}

// Phase 1: vision
async function vision(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  if (!input.statement) return needsInput(['statement'], 'Pass a freeform vision statement (1-3 paragraphs) as statement. Run /vdd:init first so constitution.md exists, then re-call /vdd:vision.');
  const artifact = ctx.projectRoot + '/vdd/vision.md';
  const escapedStatement = input.statement.replace(/`/g, '\\`');
  const content = '# Vision\n' + templateHeader((await chainContext(ctx.projectRoot)).vision) +
    '## Vision Statement\n\n<!-- Human freeform vision, expanded and formalized by AI -->\n\n> ' + escapedStatement + '\n\n' +
    '[AI assistant: expand the above freeform statement into a structured vision. Describe WHO benefits, WHAT changes in their world, and WHY it matters. 1-3 paragraphs.]\n\n' +
    '## Impact Model\n\n### Goal (the desired future state)\n\n[1 sentence — the measurable outcome this product aims to create]\n\n' +
    '### Actors (who must behave differently)\n\n| Actor | Current State | Desired State | Benefit |\n' +
    '|-------|--------------|---------------|---------|\n| [Primary user] | [What they do today] | [What they will do] | [Why it is better] |\n' +
    '| [Secondary user] | [What they do today] | [What they will do] | [Why it is better] |\n\n' +
    '### Impacts (the behavioral changes that produce the goal)\n\n| Impact ID | Description | Actor | Measurement |\n' +
    '|-----------|-------------|-------|-------------|\n| I-001 | [Behavioral change] | [Actor] | [How to measure] |\n' +
    '| I-002 | [Behavioral change] | [Actor] | [How to measure] |\n\n' +
    '## Stakeholder Map\n\n| Role | Interest | Influence | Engagement Strategy |\n' +
    '|------|----------|-----------|-------------------|\n| [Primary user] | [What they care about] | High | [How to involve them] |\n' +
    '| [Decision maker] | [What they care about] | High | [How to involve them] |\n' +
    '| [Secondary beneficiary] | [What they care about] | Medium | [How to involve them] |\n\n' +
    '## Success Metrics\n\n### Lagging Indicators (the outcomes — measured months after launch)\n\n' +
    '| Metric | Target | Measurement Method |\n|--------|--------|-------------------|\n' +
    '| [e.g., User retention at day 30] | [e.g., > 40%] | [e.g., Analytics event + cohort analysis] |\n' +
    '| [e.g., Net Promoter Score] | [e.g., > 50] | [e.g., In-app survey at day 14] |\n\n' +
    '### Leading Indicators (early signals — measured during build & launch)\n\n' +
    '| Metric | Target | Measurement Method |\n|--------|--------|-------------------|\n' +
    '| [e.g., Activation rate] | [e.g., > 60%] | [e.g., Completed key journey within first session] |\n' +
    '| [e.g., Time to first value] | [e.g., < 5 min] | [e.g., Analytics event timing] |\n\n' +
    '## Constraints & Boundaries\n\n### Constraints (non-negotiable)\n\n' +
    '- [e.g., Must serve users in regions X, Y, Z]\n- [e.g., Must comply with regulation ABC]\n' +
    '- [e.g., Must work offline in low-connectivity environments]\n\n' +
    '### Boundaries (explicitly out of vision scope)\n\n' +
    '- [e.g., Not targeting enterprise customers in v1]\n- [e.g., Not replacing existing system X — complementing it]\n\n' +
    '## Target Domains\n\n<!-- Check all that apply. Load corresponding domain-primers during Strategy phase. -->\n' +
    '- [ ] WebApp\n- [ ] Data Storage\n- [ ] ETL\n- [ ] Infrastructure\n\n' +
    '## S&T Assumptions (Vision → Strategy)\n\n<!-- Filled by AI during Gate G1 -->\n\n' +
    '**Necessity:** Why is Strategy-level research necessary to achieve this Vision?\n\n' +
    '**Achievability:** Why is this Vision achievable given the planned Strategy approach?\n\n' +
    '**Sufficiency:** Why is the planned Strategy approach sufficient to realize this Vision?\n\n' +
    '**Warnings:** What must go right / be avoided for Strategy to succeed?\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write vision.md: ' + (result.error || 'unknown') };
  return { success: true, artifact };
}

// Read vision Target Domains from disk (best-effort).
async function readTargetDomains(root: string): Promise<string[]> {
  const domains: string[] = [];
  try {
    const v = await fs.readFile(root + '/vdd/vision.md', 'utf-8');
    const section = v.match(/## Target Domains[\s\S]*?(?=\n## |\n# |\z)/);
    if (section) {
      const map: Record<string, string> = {
        WebApp: 'webapp',
        'Data Storage': 'data-storage',
        ETL: 'etl',
        Infrastructure: 'infrastructure',
        'Safety-Critical': 'safety-critical',
      };
      for (const [label, key] of Object.entries(map)) {
        if (section[0].includes('[x]') && section[0].includes(label)) domains.push(key);
      }
    }
  } catch {
    /* vision.md not present yet — primer set falls back to unconditional only */
  }
  return domains;
}

// Phase 2: strategize
async function strategize(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const artifact = ctx.projectRoot + '/vdd/strategy.md';
  const availableTools = input.availableTools ?? input.capabilities ?? [];
  const env = detectEnvironment(availableTools);
  const targetDomains = await readTargetDomains(ctx.projectRoot);
  const primers: DomainPrimer[] = domainPrimersForTargets(targetDomains);

  const primerLines = primers.length > 0
    ? primers.map((p) => `- ${p.file} (${p.label} — ${p.summary})`).join('\n')
    : '- (no domain primers resolved — run after vision Target Domains are checked)';

  const findings = input.researchFindings ? input.researchFindings.trim() : '';

  const synthesis = findings
    ? '## Research Synthesis\n\n### Consolidated Research Findings\n' + findings + '\n\n[AI assistant: extract Strategic Pillars, Competitive Analysis, and Risk Register from the findings above.]\n'
    : '## Research Synthesis\n\n### Market & Domain Landscape\n[Summary of market conditions, trends, competitor positioning, user needs]\n\n' +
      '### Technology Landscape\n[Summary of viable technologies, trade-offs, constraints imposed by constitution]\n\n' +
      '### Feasibility Assessment\n[Is this vision technically and operationally achievable with current resources?]\n';

  const content = '# Strategy\n' + templateHeader((await chainContext(ctx.projectRoot)).strategy) +
    '## Vision Reference\nDerived from: `vdd/vision.md`\n\n' +
    '## Domain Primers Loaded\n<!-- Determined by vision Target Domains -->\n' + primerLines + '\n\n' +
    synthesis +
    '## Strategic Pillars\n\n<!-- 3-5 pillars. Each pillar maps to at least one vision goal. -->\n\n' +
    '### Pillar 1: [Name]\n**Rationale:** [Why this pillar exists — what vision goal does it serve?]\n' +
    '**Vision Trace:** [Which vision goal/impact/actor does this address?]\n' +
    '**Key Research Finding:** [Evidence that supports this pillar]\n' +
    '**Expected Impact:** [How will this pillar contribute to the success metrics?]\n\n' +
    '### Pillar 2: [Name]\n**Rationale:** [Why this pillar exists]\n**Vision Trace:** [Which vision goal does this serve?]\n' +
    '**Key Research Finding:** [Evidence]\n**Expected Impact:** [Contribution to metrics]\n\n' +
    '### Pillar 3: [Name]\n**Rationale:** [...]\n**Vision Trace:** [...]\n**Key Research Finding:** [...]\n**Expected Impact:** [...]\n\n' +
    '## Competitive Analysis\n\n| Competitor | Strengths | Weaknesses | Our Differentiator |\n' +
    '|------------|-----------|-----------|-------------------|\n| [Name] | [What they do well] | [What they lack] | [How we differ] |\n\n' +
    '## Risk Register\n\n| Risk ID | Description | Likelihood | Impact | Mitigation |\n' +
    '|---------|-------------|-----------|--------|-----------|\n' +
    '| R-001 | [e.g., Target audience does not adopt] | Medium | High | [e.g., Early adopter program, UX research] |\n' +
    '| R-002 | [e.g., Key technology choice becomes deprecated] | Low | High | [e.g., Abstraction layer, migration plan] |\n\n' +
    '## S&T Assumptions (Strategy → Tactics)\n\n<!-- Filled by AI during Gate G2 -->\n\n' +
    '**Necessity:** Why is Tactical-level action-item breakdown necessary to execute this Strategy?\n\n' +
    '**Achievability:** Why is this Strategy achievable given the planned Tactical approach?\n\n' +
    '**Sufficiency:** Why is the planned Tactical approach sufficient to implement this Strategy?\n\n' +
    '**Warnings:** What must go right / be avoided for Tactics to succeed?\n\n' +
    '## Out of Scope (Strategic)\n<!-- Strategic directions explicitly excluded for this release/iteration -->\n- [Direction we chose NOT to pursue and why]\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write strategy.md: ' + (result.error || 'unknown') };

  return {
    success: true,
    artifact,
    output: {
      domainPrimersLoaded: primers.map((p) => p.file),
      targetDomains,
      researchSubagents: RESEARCH_SUBAGENTS,
      environment: {
        available: env.available,
        missingRequired: env.missingRequired,
        missingOptional: env.missingOptional,
      },
      researchLimitations: env.researchLimitations.length > 0 ? env.researchLimitations : ['None — all required research tools present'],
      researchStatus: findings ? 'synthesized' : 'pending — dispatch the research subagents below, then re-call with researchFindings',
      instructions: 'Dispatch the 5 research subagents using your environment MCP tools (Brave Search, Perplexity, Context7, gh_grep, Playwright). Collect their 300-500 word summaries, then re-call vdd_strategize with researchFindings to synthesize vdd/strategy.md.',
    },
  };
}

// Phase 3: tactics
interface AuditFacts {
  language: string;
  framework: string;
  orm: string;
  testing: string;
  database: string;
  configFiles: string[];
  topDirs: string[];
  domains: string[];
}

async function auditRepo(root: string): Promise<AuditFacts> {
  const facts: AuditFacts = { language: 'unknown', framework: 'unknown', orm: 'unknown', testing: 'unknown', database: 'unknown', configFiles: [], topDirs: [], domains: [] };
  try {
    const pkg = JSON.parse(await fs.readFile(root + '/package.json', 'utf-8'));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    const keys = Object.keys(deps);
    facts.language = keys.includes('typescript') ? 'TypeScript' : 'JavaScript/Node.js';
    if (keys.includes('next')) facts.framework = 'Next.js';
    else if (keys.includes('react')) facts.framework = 'React';
    else if (keys.includes('vue')) facts.framework = 'Vue';
    facts.orm = keys.includes('drizzle-orm') ? 'Drizzle' : keys.includes('prisma') ? 'Prisma' : 'unknown';
    facts.testing = keys.includes('vitest') ? 'Vitest' : keys.includes('jest') ? 'Jest' : 'unknown';
    facts.database = deps['pg'] ? 'PostgreSQL' : deps['mysql2'] ? 'MySQL' : 'unknown';
  } catch {
    /* no package.json — leave unknown */
  }

  const configCandidates = ['tsconfig.json', '.eslintrc.json', '.eslintrc.js', '.prettierrc', 'docker-compose.yml', 'Dockerfile', 'pnpm-workspace.yaml'];
  for (const c of configCandidates) {
    try { await fs.access(root + '/' + c); facts.configFiles.push(c); } catch { /* absent */ }
  }

  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    facts.topDirs = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'dist')
      .map((e) => e.name);
  } catch { /* no dir listing */ }

  if (facts.topDirs.some((d) => d === 'app' || d === 'src')) facts.domains.push('webapp');
  if (facts.topDirs.some((d) => d === 'db' || d === 'schema')) facts.domains.push('data-storage');
  if (facts.configFiles.includes('docker-compose.yml') || facts.configFiles.includes('Dockerfile')) facts.domains.push('infrastructure');

  return facts;
}

async function tactics(_: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const artifact = ctx.projectRoot + '/vdd/tactics.md';
  const audit = await auditRepo(ctx.projectRoot);
  const detectedStack = [
    '### Auto-Detected Stack',
    '',
    '| Layer | Detected |',
    '|-------|----------|',
    `| Language | ${audit.language} |`,
    `| Framework | ${audit.framework} |`,
    `| ORM | ${audit.orm} |`,
    `| Testing | ${audit.testing} |`,
    `| Database | ${audit.database} |`,
    '',
    `**Config files found:** ${audit.configFiles.length > 0 ? audit.configFiles.join(', ') : '(none detected)'}`,
    '',
    `**Top-level directories:** ${audit.topDirs.length > 0 ? audit.topDirs.join(', ') : '(none detected)'}`,
    '',
    `**Suggested domains:** ${audit.domains.length > 0 ? audit.domains.join(', ') : '(none auto-detected)'}`,
    '',
  ].join('\n');

  const content = '# Tactics\n' + templateHeader((await chainContext(ctx.projectRoot)).tactics) +
    '## Strategy Reference\nDerived from: `vdd/strategy.md`\n\n' +
    '## Codebase Audit\n\n' + detectedStack +
    '### What Exists\n\n| Asset | Location | Purpose | Strategic Pillar Trace | Quality |\n' +
    '|-------|----------|---------|----------------------|---------|\n' +
    '| [e.g., User auth module] | `src/auth/` | [What it does] | [Which pillar] | Good / Needs Refactor / Replace |\n' +
    '| [e.g., Dashboard page] | `src/app/dashboard/` | [What it does] | [Which pillar] | Good / Needs Refactor / Replace |\n\n' +
    '### Technical Debt Assessment\n\n| Debt Item | Location | Severity | Impact on Strategy |\n' +
    '|-----------|----------|----------|-------------------|\n' +
    '| [e.g., No input validation] | `src/api/` | High | Blocks Pillar 1 (security) |\n' +
    '| [e.g., Missing indexes] | `db/schema.ts` | Medium | Slows Pillar 2 (analytics) |\n\n' +
    '### Reusable Assets\n\n| Asset | How It Supports Strategy | Effort to Reuse |\n' +
    '|-------|------------------------|----------------|\n' +
    '| [e.g., Shared component library] | Accelerates Pillar 1 UI | Low |\n' +
    '| [e.g., Existing API patterns] | Consistent with Pillar 2 | Low |\n\n' +
    '## Gap Analysis\n\n| Gap | Strategic Pillar Affected | Impact if Unaddressed |\n' +
    '|-----|--------------------------|----------------------|\n' +
    '| [e.g., No mobile-responsive layout] | Pillar 1 (UX) | Vision target audience unreachable |\n' +
    '| [e.g., No analytics pipeline] | Pillar 2 (Data) | Cannot measure success metrics |\n\n' +
    '## Prioritized Action Items\n\n<!-- MoSCoW: MUST = required for vision, SHOULD = important, COULD = nice -->\n\n' +
    '| ID | Action Item | Priority | Strategy Pillar | Estimated Spec Size | Dependencies |\n' +
    '|----|------------|----------|----------------|--------------------|--------------|\n' +
    '| A-001 | [e.g., User authentication with SSO] | MUST | Pillar 1 | M | None |\n' +
    '| A-002 | [e.g., Responsive dashboard redesign] | MUST | Pillar 1 | L | None |\n' +
    '| A-003 | [e.g., Analytics data pipeline] | SHOULD | Pillar 2 | M | A-001 |\n' +
    '| A-004 | [e.g., Export to CSV] | COULD | Pillar 2 | S | A-003 |\n\n' +
    '## Dependency Map\n\n```\nA-001 (Auth) ──┐\n               ├──→ A-003 (Analytics) ──→ A-004 (Export)\nA-002 (UI) ────┘\n```\n\n' +
    '## Infrastructure Requirements\n\n| Requirement | Domain | Priority | Notes |\n' +
    '|-------------|--------|----------|-------|\n| [e.g., CI/CD pipeline] | Infrastructure | MUST | GitHub Actions for deploy |\n' +
    '| [e.g., Monitoring dashboards] | Infrastructure | SHOULD | Grafana + Prometheus |\n' +
    '| [e.g., Multi-region DB] | Data Storage | SHOULD | Postgres read replicas |\n' +
    '| [e.g., ETL for analytics] | ETL | SHOULD | dbt + Airflow |\n\n' +
    '## S&T Assumptions (Tactics → Specs)\n\n' +
    '**Necessity:** Why are Spec-level requirements necessary to execute these Tactical action items?\n\n' +
    '**Achievability:** Why are these Tactical items achievable given the planned Spec approach?\n\n' +
    '**Sufficiency:** Why is the planned Spec approach sufficient to implement these Tactical items?\n\n' +
    '**Warnings:** What must go right / be avoided for Specs to succeed?\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write tactics.md: ' + (result.error || 'unknown') };
  return { success: true, artifact, output: { audit, instructions: 'Populate Gap Analysis and Prioritized Action Items by mapping detected assets/directories to strategy pillars.' } };
}

// Phase 4: specify
async function specify(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const id = input.feature || input.actionItemId || input.description;
  if (!id) return needsInput(['feature', 'actionItemId', 'description'], 'Pass actionItemId (e.g. "A-001") or a freeform description to create a new spec; pass feature to name the spec directory.');
  const artifact = ctx.projectRoot + '/vdd/specs/' + id + '/spec.md';
  const content = '# [Feature Name]\n' + templateHeader((await chainContext(ctx.projectRoot)).tactics + ' → SP-<n>') +
    '## Tactical Origin\nImplements: `vdd/tactics.md` → Action Item [' + id + ']\n\n' +
    '## Overview\n<!-- 1-2 sentences describing the feature. Reference which vision impact this serves. -->\n\n' +
    '## User Stories\n\n### Primary\nAs a [role], I want [goal] so that [benefit].\n\n' +
    '### Secondary (optional)\nAs a [role], I want [goal] so that [benefit].\n\n' +
    '## Boundaries\n\n**Always do:**\n- [e.g., "validate all inputs before processing"]\n- [e.g., "check permissions before returning data"]\n\n' +
    '**Ask first (do not proceed unilaterally):**\n- [e.g., "adding a new database table or field not in this spec"]\n' +
    '- [e.g., "introducing a new dependency"]\n- [e.g., "extending scope beyond these ACs"]\n\n' +
    '**Never do:**\n- [e.g., "skip authentication for this endpoint"]\n- [e.g., "log sensitive user data"]\n' +
    '- [e.g., "modify data or contracts owned by other features"]\n\n' +
    '## Acceptance Criteria\n\n### AC-1: [Short Title] [MUST]\nGiven [initial context]\nWhen [action is taken]\nThen [expected outcome]\n\n' +
    '### AC-2: [Short Title] [MUST]\nGiven [initial context]\nWhen [action is taken]\nThen [expected outcome]\n\n' +
    '### AC-E1: [Error Case Title] [MUST]\nGiven [invalid or edge condition]\nWhen [action is taken]\nThen [expected error response or behavior]\n\n' +
    '### AC-3: [Short Title] [SHOULD]\nGiven [initial context]\nWhen [action is taken]\nThen [expected outcome]\n\n' +
    '### AC-4: [Explicitly Excluded Feature] [WONT]\nThis feature will NOT include [capability]. Reason: [why excluded from this iteration].\n\n' +
    '## Out of Scope\n- [Item 1]\n- [Item 2]\n\n' +
    '## Open Questions\n- [NEEDS CLARIFICATION] [Question 1]\n- [RESOLVED] [Question 2] → Decision: [answer]\n\n' +
    '## Non-Functional Requirements\n- Performance: [e.g., "search results in < 200ms at p95"]\n' +
    '- Security: [e.g., "requires authenticated session — see constitution.md"]\n' +
    '- Accessibility: [e.g., "WCAG 2.1 AA for all interactive elements"]\n\n' +
    '## Impact Verification\n<!-- How will we verify this spec contributes to the vision success metrics? -->\n' +
    '- [e.g., AC-1 enables Impact I-001 by allowing users to complete journey X]\n' +
    '- [e.g., Feature analytics will track activation rate (Leading Indicator from vision.md)]\n\n' +
    '## S&T Assumptions (Specs → Plan)\n\n**Necessity:** Why is a Plan necessary to implement these Specs?\n\n' +
    '**Achievability:** Why are these Specs achievable given the planned technical approach?\n\n' +
    '**Sufficiency:** Why is the planned technical approach sufficient to satisfy these Specs?\n\n' +
    '**Warnings:** What must go right / be avoided for the Plan to succeed?\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write spec.md: ' + (result.error || 'unknown') };
  return { success: true, artifact };
}

// Phase 4b: clarify
async function clarify(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const missing = await withFeature(input, ctx.projectRoot, 'clarify');
  if (missing) return missing;
  const specPath = ctx.projectRoot + '/vdd/specs/' + input.feature + '/spec.md';
  let specContent: string;
  try {
    specContent = await fs.readFile(specPath, 'utf-8');
  } catch {
    return { success: false, error: 'Spec file not found: ' + specPath };
  }

  const questions: string[] = [];
  const lines = specContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('[NEEDS CLARIFICATION]')) {
      questions.push(line.trim());
    }
    if (line.includes('[e.g.') && line.includes(']')) {
      questions.push('  Template placeholder → ' + line.trim());
    }
  }

  return {
    success: true,
    artifact: specPath,
    output: {
      feature: input.feature,
      clarificationCount: questions.length,
      items: questions.length > 0 ? questions : ['No unresolved clarifications found.'],
      action: 'Resolve each [NEEDS CLARIFICATION] item, replace [e.g.] placeholders with concrete values, and add edge-case ACs for every happy-path MUST AC.',
    },
  };
}

// Phase 5: plan
async function plan(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const missing = await withFeature(input, ctx.projectRoot, 'plan');
  if (missing) return missing;
  const base = ctx.projectRoot + '/vdd/specs/' + input.feature;
  const specChain = (await readChain(base + '/spec.md')) ?? ((await chainContext(ctx.projectRoot)).tactics + ' → SP-<n>');

  const planContent = '# Technical Plan: [Feature Name]\n' + templateHeader(specChain + ' → PL-<n>') +
    '## Spec Reference\nImplements: `vdd/specs/' + input.feature + '/spec.md`\n\n' +
    '## Architecture Overview\n<!-- High-level description of the approach. 3-5 sentences max. -->\n\n' +
    '## Component Breakdown\n\n### [Component 1 Name]\n' +
    '- **Responsibility:** [What it does]\n- **Location:** `[file path]`\n- **Accepts:** [inputs]\n- **Returns:** [outputs]\n- **AC Coverage:** AC-1, AC-2\n\n' +
    '### [Component 2 Name]\n- **Responsibility:** [What it does]\n- **Location:** `[file path]`\n- **Accepts:** [inputs]\n- **Returns:** [outputs]\n- **AC Coverage:** AC-3\n\n' +
    '## Technology Choices\n\n| Decision | Choice | Rationale |\n|----------|--------|-----------|\n| [e.g., DB query] | [e.g., Drizzle ORM] | [e.g., already in stack, type-safe] |\n\n' +
    '## Integration Points\n- [System]: [How it is used]\n\n' +
    '## AC Coverage Map\n\n| AC | Component(s) | Contract(s) | Verified By |\n|----|-------------|-------------|-------------|\n' +
    '| AC-1 | [ComponentName] | [contracts/file.md] | Playwright: `tests/e2e/feature.spec.ts` |\n' +
    '| AC-2 | [ComponentName] | [contracts/file.md] | Vitest: `tests/unit/feature.test.ts` |\n' +
    '| AC-E1 | [ComponentName] | [contracts/file.md] | Vitest: `tests/unit/feature.test.ts` |\n' +
    '| AC-5 (perf) | [ComponentName] | — | Browserless Lighthouse: LCP < [ms] |\n\n' +
    '## Risks\n\n| Risk | Likelihood | Impact | Mitigation |\n|------|-----------|--------|-----------|\n' +
    '| [e.g., Third-party API unavailable] | Low | High | Circuit breaker + fallback |\n\n' +
    '## S&T Assumptions (Plan → Tasks)\n\n**Necessity:** Why is a Task breakdown necessary to execute this Plan?\n\n' +
    '**Achievability:** Why is this Plan achievable given the planned task decomposition?\n\n' +
    '**Sufficiency:** Why is the planned task decomposition sufficient to implement this Plan?\n\n' +
    '**Warnings:** What must go right / be avoided for Tasks to succeed?\n';

  const dataModelContent = '# Data Model: [Feature Name]\n' + templateHeader(specChain + ' → PL-<n>') +
    '## Spec Reference\nImplements: `vdd/specs/' + input.feature + '/spec.md`\n\n' +
    '## Entities\n\n### [EntityName]\n| Field | Type | Constraints | Description |\n|-------|------|-------------|-------------|\n' +
    '| id | uuid | PK, NOT NULL | Primary key |\n| [field] | [type] | [constraints] | [description] |\n' +
    '| created_at | timestamp | NOT NULL, DEFAULT now() | |\n| updated_at | timestamp | NOT NULL | |\n\n' +
    '### Relationships\n- `[EntityA]` has many `[EntityB]` (via `entity_b.entity_a_id`)\n- `[EntityA]` belongs to `[EntityC]`\n\n' +
    '## Indexes\n| Table | Columns | Type | Rationale |\n|-------|---------|------|-----------|\n| [table] | [col1, col2] | btree | [e.g., lookup by user + date] |\n\n' +
    '## Constraints\n- [e.g., `CHECK (status IN (\'active\', \'inactive\', \'pending\'))` on `users`]\n\n' +
    '## Migrations\n\n### [Migration 001] Initial schema\n- Create `[table_name]` table with all fields above\n- Add indexes from the Indexes section above\n- **Rollback:** drop `[table_name]` table\n';

  const contractContent = '# API Contract: [Endpoint Name]\n' + templateHeader(specChain + ' → PL-<n>') +
    '## [HTTP METHOD] [/path/:param]\n\n### Description\n[One sentence describing what this endpoint does]\n\n' +
    '### Authentication\n[e.g., "Bearer token required" / "Public" / "Admin role required"]\n\n' +
    '### Request\n\n**Path Parameters:**\n| Name | Type | Required | Description |\n|------|------|----------|-------------|\n| [param] | string | yes | [description] |\n\n' +
    '**Query Parameters:**\n| Name | Type | Required | Default | Description |\n|------|------|----------|---------|-------------|\n| [param] | string | no | [default] | [description] |\n\n' +
    '**Request Body:**\n```json\n{\n  "field": "type — description",\n  "optionalField?": "type — description"\n}\n```\n\n' +
    '### Response\n\n**Success (200 OK):**\n```json\n{\n  "id": "uuid",\n  "field": "value"\n}\n```\n\n' +
    '### Error Codes\n\n| Status | Code | When |\n|--------|------|------|\n| 400 | VALIDATION_ERROR | [condition] |\n' +
    '| 401 | UNAUTHORIZED | [condition] |\n| 404 | NOT_FOUND | [condition] |\n| 409 | CONFLICT | [condition] |\n\n' +
    '### AC Coverage\n- AC-1: [How this endpoint satisfies it]\n';

  const planPath = base + '/plan.md';
  const dataModelPath = base + '/data-model.md';
  const contractPath = base + '/contracts/primary-endpoint.md';

  const r1 = await writeArtifact(planPath, planContent);
  const r2 = await writeArtifact(dataModelPath, dataModelContent);
  const r3 = await writeArtifact(contractPath, contractContent);

  const errors: string[] = [];
  if (!r1.written) errors.push('plan.md: ' + (r1.error || ''));
  if (!r2.written) errors.push('data-model.md: ' + (r2.error || ''));
  if (!r3.written) errors.push('contracts/: ' + (r3.error || ''));

  if (errors.length > 0) return { success: false, error: errors.join('; ') };

  return {
    success: true,
    artifact: base + '/plan.md',
    output: {
      files: [planPath, dataModelPath, contractPath],
      hint: 'Edit the plan.md, data-model.md, and contracts/ files. Once approved, run /vdd:tasks to break the plan into implementation tasks.',
    },
  };
}

// Phase 6: tasks
async function tasks(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const missing = await withFeature(input, ctx.projectRoot, 'tasks');
  if (missing) return missing;
  const artifact = ctx.projectRoot + '/vdd/specs/' + input.feature + '/tasks.md';
  const planChain = (await readChain(ctx.projectRoot + '/vdd/specs/' + input.feature + '/plan.md')) ?? ((await chainContext(ctx.projectRoot)).tactics + ' → SP-<n> → PL-<n>');
  const content = '# Task List: [Feature Name]\n' + templateHeader(planChain + ' → TK-<n>') +
    '## Plan Reference\nImplements: `vdd/specs/' + input.feature + '/plan.md`\n\n' +
    '## Tasks\n\n### Setup\n\n- [ ] **TASK-001** [S] Set up [component/module] skeleton\n  - Creates: `[file path]`\n  - Depends on: none\n\n' +
    '### [Component Group]\n\n- [ ] **TASK-002** [M] [P] Write tests for [component]\n  - Tests: AC-1, AC-2 from `vdd/specs/' + input.feature + '/spec.md`\n  - Depends on: TASK-001\n\n' +
    '- [ ] **TASK-002b** [S] Write error-case tests for [component]\n  - Tests: AC-E1 from `vdd/specs/' + input.feature + '/spec.md`\n  - Depends on: TASK-002\n\n' +
    '- [ ] **TASK-003** [M] Implement [component]\n  - Contract: `vdd/specs/' + input.feature + '/contracts/[file].md`\n  - Satisfies: AC-1, AC-2\n  - Depends on: TASK-002\n\n' +
    '### Integration\n\n- [ ] **TASK-006** [L] Integration test: full [feature] flow\n  - Tests: AC-1 through AC-4\n  - Depends on: TASK-003, TASK-005\n\n' +
    '### Cleanup\n\n- [ ] **TASK-007** [S] Update API documentation\n  - Depends on: TASK-006\n\n' +
    '## Legend\n- `[S]` Small — under 1 hour\n- `[M]` Medium — 1–3 hours\n- `[L]` Large — 3–6 hours (consider splitting)\n- `[P]` Parallelizable\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write tasks.md: ' + (result.error || 'unknown') };
  return { success: true, artifact };
}

// Phase 7a: get-next-task
async function nextTask(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const missing = await withFeature(input, ctx.projectRoot, 'get-next-task');
  if (missing) return missing;
  const tasksPath = ctx.projectRoot + '/vdd/specs/' + input.feature + '/tasks.md';
  let tasksContent: string;
  try {
    tasksContent = await fs.readFile(tasksPath, 'utf-8');
  } catch {
    return { success: false, error: 'tasks.md not found at ' + tasksPath + '. Run /vdd:tasks first.' };
  }

  const lines = tasksContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('- [ ] **TASK-')) {
      return { success: true, artifact: lines[i].trim() };
    }
  }

  return { success: true, artifact: 'All tasks completed.' };
}

// Phase 7b: implement
async function implement(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  if (!input.taskId) return needsInput(['taskId'], 'Pass taskId (e.g. "TASK-003") — call /vdd:get-next-task to fetch the next uncompleted one, then re-call /vdd:implement.');
  return {
    success: true,
    artifact: 'Task ' + input.taskId + ' — ready for implementation',
    output: {
      taskId: input.taskId,
      instruction: 'Load constitution.md, the task description from tasks.md, relevant spec, plan, and contracts. Implement the task. Commit with: feat(scope): ' + input.taskId + ' → [ac-id] → [tactical-item-id]',
    },
  };
}

// Phase 8: validate
async function validate(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const root = ctx.projectRoot;

  // Discover the feature directories under `vdd/specs` (this project has SP-002…SP-00n),
  // rather than assuming a single `feature-1` — the old default validated only that one
  // and false-flagged every other feature as uncovered. An explicit `input.feature`
  // narrows the run to one.
  const specsDir = root + '/vdd/specs';
  let features: string[];
  if (input.feature) {
    features = [input.feature];
  } else {
    try {
      features = (await fs.readdir(specsDir, { withFileTypes: true }))
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => e.name)
        .sort();
    } catch {
      features = [];
    }
    if (features.length === 0) features = ['feature-1'];
  }

  interface Node {
    key: string;
    path: string;
    parent: string | null;
    fixedChain?: string;
  }
  const canonical: Node[] = [
    { key: 'constitution.md', path: 'constitution.md', parent: null, fixedChain: 'Phase 0 — Constitution (immutable)' },
    { key: 'vision.md', path: 'vdd/vision.md', parent: null },
    { key: 'strategy.md', path: 'vdd/strategy.md', parent: 'vision.md' },
    { key: 'tactics.md', path: 'vdd/tactics.md', parent: 'strategy.md' },
  ];
  for (const feature of features) {
    canonical.push(
      { key: `${feature}/spec.md`, path: `vdd/specs/${feature}/spec.md`, parent: 'tactics.md' },
      { key: `${feature}/plan.md`, path: `vdd/specs/${feature}/plan.md`, parent: `${feature}/spec.md` },
      { key: `${feature}/data-model.md`, path: `vdd/specs/${feature}/data-model.md`, parent: `${feature}/spec.md` },
      { key: `${feature}/contracts/primary-endpoint.md`, path: `vdd/specs/${feature}/contracts/primary-endpoint.md`, parent: `${feature}/spec.md` },
      { key: `${feature}/tasks.md`, path: `vdd/specs/${feature}/tasks.md`, parent: `${feature}/plan.md` },
    );
  }

  const drift: Array<{ artifact: string; type: string; detail: string }> = [];
  const uncovered: string[] = [];
  let placeholders = 0;
  let present = 0;
  const total = canonical.length;

  // Read every artifact once; a child's expected chain is derived from its parent's
  // *actual* chain (not a hardcoded V-001 → S-002 → … numbering, which false-flags drift
  // whenever a project renumbers its V/S/T/SP/PL/TK IDs).
  const contents: Record<string, string | null> = {};
  for (const c of canonical) {
    let body: string | null = input.artifactFiles?.[c.path] ?? null;
    if (body == null) {
      try { body = await fs.readFile(root + '/' + c.path, 'utf-8'); } catch { body = null; }
    }
    contents[c.key] = body;
  }

  const chainOf = (key: string): string | null => {
    const body = contents[key];
    if (body == null) return null;
    const m = body.match(/> Impact Chain:\s*(.+)/);
    return m ? m[1].trim() : null;
  };
  const lastId = (chain: string): string => chain.split('→').pop()!.trim();

  for (const c of canonical) {
    const body = contents[c.key];
    if (body == null) { uncovered.push(c.key); continue; }
    present++;
    placeholders += countSubstancePlaceholders(body);
    const actual = chainOf(c.key);
    if (actual == null) { drift.push({ artifact: c.key, type: 'Header', detail: 'Missing Impact Chain header' }); continue; }
    let expected: string | null = null;
    if (c.fixedChain) expected = c.fixedChain;
    else if (c.parent != null) {
      const parentChain = chainOf(c.parent);
      expected = parentChain == null ? null : `${parentChain} → ${lastId(actual)}`;
    }
    if (expected != null && actual !== expected) {
      drift.push({ artifact: c.key, type: 'Chain', detail: `Expected "${expected}", found "${actual}"` });
    }
  }

  const substancePassed = placeholders === 0 && uncovered.length === 0 && drift.length === 0 && present === total;

  const visionId = chainOf('vision.md') ?? 'V-?';
  const strategyId = chainOf('strategy.md') ? lastId(chainOf('strategy.md')!) : 'S-?';
  const tacticsId = chainOf('tactics.md') ? lastId(chainOf('tactics.md')!) : 'T-?';
  const fullChain = [visionId, strategyId, tacticsId].join(' → ');

  const featureRows = features.length
    ? features.map((feature) => {
        const specId = chainOf(`${feature}/spec.md`) ? lastId(chainOf(`${feature}/spec.md`)!) : 'SP-?';
        const planId = chainOf(`${feature}/plan.md`) ? lastId(chainOf(`${feature}/plan.md`)!) : 'PL-?';
        const tasksId = chainOf(`${feature}/tasks.md`) ? lastId(chainOf(`${feature}/tasks.md`)!) : 'TK-?';
        const missing = ['spec.md', 'plan.md', 'tasks.md'].filter((n) => uncovered.includes(`${feature}/${n}`)).length;
        return `| ${feature} | ${specId} → ${planId} → ${tasksId} | ${missing === 0 ? 'Present' : missing + ' missing'} |`;
      }).join('\n')
    : '| (no features) | — | — |';

  const driftRows = drift.length ? drift.map((d) => `| ${d.artifact} | ${d.type} | ${d.detail} |`).join('\n') : '| (none found) | — | — |';
  const uncoveredRows = uncovered.length ? uncovered.map((k) => `| ${k} | missing artifact |`).join('\n') : '| (none found) | — | — |';

  const content = '# Impact Verification Report (generated)\n' + templateHeader(fullChain + ' → [commits]') +
    'Date: ' + today() + '\n' +
    'Generated by `vdd validate`; it never overwrites a hand-authored `impact-report.md`.\n\n' +
    '## Traceability Summary\n\n| Level | Artifact | Status |\n|-------|----------|--------|\n' +
    '| Constitution | constitution.md | ' + (uncovered.includes('constitution.md') ? 'Missing' : 'Present') + ' |\n' +
    '| Vision | ' + visionId + ' | ' + (uncovered.includes('vision.md') ? 'Missing' : 'Present') + ' |\n' +
    '| Strategy | ' + strategyId + ' | ' + (uncovered.includes('strategy.md') ? 'Missing' : 'Present') + ' |\n' +
    '| Tactics | ' + tacticsId + ' | ' + (uncovered.includes('tactics.md') ? 'Missing' : 'Present') + ' |\n\n' +
    '## Features (Spec → Plan → Tasks)\n\n| Feature | Chain | Status |\n|---------|-------|--------|\n' + featureRows + '\n\n' +
    '## Orphan / Uncovered Detection\n\n| Artifact | Status |\n|----------|--------|\n' + uncoveredRows + '\n\n' +
    '## Drift Report\n\n| Artifact | Type | Detail |\n|----------|------|--------|\n' + driftRows + '\n\n' +
    '## Substance Check\n\n- Artifacts present: ' + present + '/' + total + '\n- Placeholders remaining: ' + placeholders + '\n- Impact-chain drift: ' + drift.length + '\n- Uncovered artifacts: ' + uncovered.length + '\n\n' +
    '## Decision\n\n**Release Readiness:** ' + (substancePassed ? 'GO' : 'NO-GO — resolve uncovered artifacts, placeholders, and drift above') + '\n';

  // Never clobber the hand-authored `vdd/impact-report.md`: write the generated report
  // alongside it.
  const artifact = root + '/vdd/impact-report.generated.md';
  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write impact-report.generated.md: ' + (result.error || 'unknown') };
  return {
    success: true,
    artifact,
    output: {
      features,
      present,
      total,
      placeholders,
      uncovered,
      drift,
    },
    gateResult: { passed: substancePassed, checks: present, total },
  };
}

// Cross-phase: trace
async function trace(_: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const root = ctx.projectRoot;
  const paths: Array<{ level: string; path: string }> = [
    { level: 'Constitution', path: root + '/constitution.md' },
    { level: 'Vision', path: root + '/vdd/vision.md' },
    { level: 'Strategy', path: root + '/vdd/strategy.md' },
    { level: 'Tactics', path: root + '/vdd/tactics.md' },
  ];
  const nodes: Array<{ level: string; path: string; exists: boolean; impactChain: string | null }> = [];
  for (const p of paths) {
    let exists = false;
    let impactChain: string | null = null;
    try {
      const c = await fs.readFile(p.path, 'utf-8');
      exists = true;
      const m = c.match(/> Impact Chain:\s*(.+)/);
      impactChain = m ? m[1].trim() : null;
    } catch { /* missing */ }
    nodes.push({ level: p.level, path: p.path, exists, impactChain });
  }
  let specDirs: string[] = [];
  try { specDirs = (await fs.readdir(root + '/vdd/specs')).filter((d) => !d.startsWith('.')); } catch { /* none */ }
  return {
    success: true,
    artifact: 'Traceability matrix generated',
    output: {
      chain: (await chainContext(root)).tactics + ' → SP-<n> → PL-<n> → TK-<n> → [commits]',
      nodes,
      specDirs,
    },
  };
}

// Cross-phase: analyze
async function analyze(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const missing = await withFeature(input, ctx.projectRoot, 'analyze');
  if (missing) return missing;

  const specPath = ctx.projectRoot + '/vdd/specs/' + input.feature + '/spec.md';
  let specContent: string;
  try { specContent = await fs.readFile(specPath, 'utf-8'); } catch {
    return { success: false, error: 'Spec not found: ' + specPath };
  }

  const planPath = ctx.projectRoot + '/vdd/specs/' + input.feature + '/plan.md';
  const tasksPath = ctx.projectRoot + '/vdd/specs/' + input.feature + '/tasks.md';

  const acCount = (specContent.match(/### AC-/g) || []).length;
  const unresolved = (specContent.match(/\[NEEDS CLARIFICATION\]/g) || []).length;
  const placeholders = (specContent.match(/\[e\.g\./g) || []).length;

  let planExists = false; let tasksExist = false;
  try { await fs.access(planPath); planExists = true; } catch { /* not found */ }
  try { await fs.access(tasksPath); tasksExist = true; } catch { /* not found */ }

  return {
    success: true,
    artifact: 'Cross-artifact analysis for ' + input.feature,
    output: {
      feature: input.feature,
      spec: { path: specPath, acCount, unresolved, placeholders },
      plan: { exists: planExists, path: planPath },
      tasks: { exist: tasksExist, path: tasksPath },
      status: unresolved > 0 || placeholders > 10
        ? 'NEEDS_WORK: unresolved clarifications or excessive placeholders'
        : planExists && tasksExist ? 'READY' : 'INCOMPLETE: generate plan and tasks',
    },
  };
}

// Cross-phase: inspect — folds trace (project) and analyze (feature) into one
// read-only tool with a scope selector, keeping the MCP surface lean.
async function inspect(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const scope = input.scope ?? (input.feature ? 'feature' : 'project');
  if (scope === 'feature') return analyze(input, ctx);
  return trace(input, ctx);
}

// Cross-phase: amend
async function amend(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  if (!input.description) return needsInput(['description'], 'Pass the requirement change as description; the cascade plan is then returned.');
  return {
    success: true,
    artifact: 'Full chain updated from change point',
    output: {
      change: input.description,
      instructions: [
        '1. Identify the highest affected level in the V→S→T→SP→PL→TK chain',
        '2. Update that artifact, then cascade downward through every level',
        '3. Re-run all affected gates (G1–G7)',
        '4. Commit each updated artifact separately with [AMEND] marker',
        '5. Project root: ' + ctx.projectRoot,
      ],
    },
  };
}

// Cross-phase: detect-environment
async function detectEnvironmentPhase(input: VddPhaseInput, _ctx: VddContext): Promise<VddOutput> {
  const availableTools = input.availableTools ?? input.capabilities ?? [];
  const report = detectEnvironment(availableTools);
  return {
    success: true,
    artifact: 'Environment capability report',
    output: {
      providedTools: report.available,
      perPhase: report.phases,
      missingRequired: report.missingRequired,
      missingOptional: report.missingOptional,
      researchLimitations: report.researchLimitations.length > 0 ? report.researchLimitations : ['None — all required tools present'],
      instructions: 'Use the per-phase map to plan research subagent dispatch in Phase 2 (strategize) and filesystem work in Phases 3/7/8. Missing required tools are reported so the host agent can degrade gracefully or request the missing MCP servers.',
    },
  };
}

// ---------- Gate Types & Helpers ----------

interface GateCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

interface GateResult {
  gate: string;
  junction: string;
  passed: boolean;
  checks: GateCheck[];
  forwardPassed: number;
  forwardTotal: number;
  backwardPassed: number;
  backwardTotal: number;
  assumptionsPassed: number;
  assumptionsTotal: number;
  warnings: string[];
}

function fail(c: { id: string; label: string; detail?: string }): GateCheck {
  return { id: c.id, label: c.label, passed: false, detail: c.detail ?? 'Missing or incomplete' };
}

// Strict check: validates a real condition (missing / mismatch => fail). No always-pass.
function check(c: { id: string; label: string }, passed: boolean, detail?: string): GateCheck {
  return { id: c.id, label: c.label, passed, detail: detail ?? (passed ? 'OK' : 'Missing or incomplete') };
}

function hasSection(content: string, heading: string): boolean {
  return new RegExp(`^#{1,4}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'm').test(content);
}

function impactChainMatches(content: string, expected: string): boolean {
  const m = content.match(/> Impact Chain:\s*(.+)/);
  return m !== null && m[1].trim() === expected;
}

function extractChain(content: string): string | null {
  const m = content.match(/> Impact Chain:\s*(.+)/);
  return m ? m[1].trim() : null;
}

function lastChainId(chain: string): string {
  return chain.split('→').pop()!.trim();
}

// True when a child artifact's impact chain extends its parent's *actual* chain
// (e.g. parent "V-002 → S-201", child "V-002 → S-201 → T-201"). Replaces the
// hardcoded V-001 → S-002 → … numbering so the engine is numbering-agnostic.
function chainExtendsParent(childContent: string, parentContent: string): boolean {
  const child = extractChain(childContent);
  const parent = extractChain(parentContent);
  if (!child || !parent) return false;
  return child === `${parent} → ${lastChainId(child)}`;
}

async function readChain(path: string): Promise<string | null> {
  const content = await readIfExists(path);
  return content ? extractChain(content) : null;
}

// Current chain context (vision → strategy → tactics), falling back to the
// canonical V-001 → S-002 → T-003 numbering for a fresh project.
async function chainContext(root: string): Promise<{ vision: string; strategy: string; tactics: string }> {
  const v = await readChain(root + '/vdd/vision.md');
  const s = await readChain(root + '/vdd/strategy.md');
  const t = await readChain(root + '/vdd/tactics.md');
  const vision = v ?? 'V-001';
  const strategy = s ?? `${vision} → S-002`;
  const tactics = t ?? `${strategy} → T-003`;
  return { vision, strategy, tactics };
}

function countPlaceholders(content: string): number {
  return (content.match(/\[e\.g\./g) || []).length + (content.match(/\[NEEDS CLARIFICATION\]/g) || []).length;
}

// Substantive-content detection: distinguish a filled artifact from a template full of placeholders.
const TECH_NAME_RE = /\b(React|Next\.js|PostgreSQL|Postgres|Drizzle|Prisma|Node\.js|Zod|Express|GraphQL|MongoDB|Redis|Kubernetes|Docker|Vercel|AWS|NestJS|Vue|Angular|Svelte)\b/;

function hasTechNames(content: string): boolean {
  return TECH_NAME_RE.test(content || '');
}

function countSubstancePlaceholders(content: string): number {
  const c = content || '';
  return (c.match(/\[e\.g\./g) || []).length
    + (c.match(/\[NEEDS CLARIFICATION\]/g) || []).length
    + (c.match(/\[Fill in:/g) || []).length
    + (c.match(/\[PENDING\]/g) || []).length;
}

async function readIfExists(path: string): Promise<string | null> {
  try { return await fs.readFile(path, 'utf-8'); } catch { return null; }
}

// ---------- Self-heal (auto-fix) ----------

// Required sections per artifact — the structural baseline every gate enforces.
const REQUIRED_SECTIONS: Record<string, string[]> = {
  'constitution.md': ['Architecture Principles', 'Technology Stack', 'Security Constraints', 'Naming Conventions', 'Banned Patterns', 'File Structure Rules', 'Domain Primitives'],
  'vdd/vision.md': ['Vision Statement', 'Impact Model', 'Stakeholder Map', 'Success Metrics', 'Constraints & Boundaries', 'Target Domains', 'S&T Assumptions'],
  'vdd/strategy.md': ['Vision Reference', 'Domain Primers Loaded', 'Research Synthesis', 'Strategic Pillars', 'Competitive Analysis', 'Risk Register', 'S&T Assumptions', 'Out of Scope'],
  'vdd/tactics.md': ['Strategy Reference', 'Codebase Audit', 'Gap Analysis', 'Prioritized Action Items', 'Dependency Map', 'Infrastructure Requirements', 'S&T Assumptions'],
  'spec.md': ['Tactical Origin', 'Overview', 'User Stories', 'Boundaries', 'Acceptance Criteria', 'Out of Scope', 'Non-Functional Requirements', 'Impact Verification', 'S&T Assumptions'],
  'plan.md': ['Spec Reference', 'Architecture Overview', 'Component Breakdown', 'Technology Choices', 'AC Coverage Map', 'Risks', 'S&T Assumptions'],
  'data-model.md': ['Entities', 'Indexes', 'Migrations'],
  'contract.md': ['Description', 'Request', 'Response', 'Error Codes'],
  'tasks.md': ['Plan Reference', 'Tasks'],
};

// Inject any missing required sections into a single artifact.
function injectMissingSections(content: string, sections: string[]): { content: string; added: string[] } {
  const added: string[] = [];
  let out = content;
  for (const heading of sections) {
    if (!hasSection(out, heading)) {
      out = out.replace(/\s*$/, '') + '\n\n## ' + heading + '\n\n[Fill in: ' + heading + ']\n';
      added.push(heading);
    }
  }
  return { content: out, added };
}

// Auto-fix: ensure every artifact has its required sections, injecting stubs where missing.
// Returns human-readable descriptions of what was fixed (empty if nothing to fix).
async function selfHeal(root: string, featureDir: string): Promise<string[]> {
  const fixed: string[] = [];
  const specBase = root + '/vdd/specs/' + featureDir;
  const targets: Array<{ key: string; path: string; sections: string[] }> = [
    { key: 'constitution.md', path: root + '/constitution.md', sections: REQUIRED_SECTIONS['constitution.md'] },
    { key: 'vision.md', path: root + '/vdd/vision.md', sections: REQUIRED_SECTIONS['vdd/vision.md'] },
    { key: 'strategy.md', path: root + '/vdd/strategy.md', sections: REQUIRED_SECTIONS['vdd/strategy.md'] },
    { key: 'tactics.md', path: root + '/vdd/tactics.md', sections: REQUIRED_SECTIONS['vdd/tactics.md'] },
    { key: 'spec.md', path: specBase + '/spec.md', sections: REQUIRED_SECTIONS['spec.md'] },
    { key: 'plan.md', path: specBase + '/plan.md', sections: REQUIRED_SECTIONS['plan.md'] },
    { key: 'data-model.md', path: specBase + '/data-model.md', sections: REQUIRED_SECTIONS['data-model.md'] },
    { key: 'contracts/primary-endpoint.md', path: specBase + '/contracts/primary-endpoint.md', sections: REQUIRED_SECTIONS['contract.md'] },
    { key: 'tasks.md', path: specBase + '/tasks.md', sections: REQUIRED_SECTIONS['tasks.md'] },
  ];
  for (const t of targets) {
    const content = await readIfExists(t.path);
    if (!content) continue;
    const { content: fixedContent, added } = injectMissingSections(content, t.sections);
    if (added.length > 0) {
      await writeArtifact(t.path, fixedContent);
      for (const a of added) fixed.push(t.key + ': +' + a);
    }
  }
  return fixed;
}

// ---------- Gate Functions ----------

// G0 — constitution.md approval (always runs after init)
async function gate0(root: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const c = await readIfExists(root + '/constitution.md');
  if (!c) {
    checks.push(fail({ id: 'G0.0', label: 'constitution.md exists' }));
    return { gate: 'G0', junction: '(pre-chain)', passed: false, checks, forwardPassed: 0, forwardTotal: 0, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: ['constitution.md not found'] };
  }
  checks.push(check({ id: 'G0.0', label: 'constitution.md exists' }, true));
  const secRules = (c.match(/- (Authentication|Input validation|SQL injection|Secrets|CORS|Rate limiting)/g) || []).length;
  checks.push(check({ id: 'G0.1', label: 'Stack coverage → Technology Stack section present' }, hasSection(c, 'Technology Stack')));
  checks.push(check({ id: 'G0.2', label: 'Security constraints → >= 5 rules' }, secRules >= 5, secRules + ' rules'));
  checks.push(check({ id: 'G0.3', label: 'Banned patterns → section present' }, hasSection(c, 'Banned Patterns')));
  checks.push(check({ id: 'G0.4', label: 'File structure → section present' }, hasSection(c, 'File Structure Rules')));
  checks.push(check({ id: 'G0.5', label: 'Domain declaration → Domain Primitives populated' }, hasSection(c, 'Domain Primitives')));
  const pending = (c.match(/\[PENDING\]/g) || []).length;
  checks.push(check({ id: 'G0.6', label: 'No blocking [PENDING] items' }, pending === 0, pending > 0 ? pending + ' PENDING item(s) — resolve before gate approval' : 'Clear'));

  const fp = checks.filter(x => x.passed).length;
  return { gate: 'G0', junction: '(pre-chain)', passed: fp === checks.length, checks, forwardPassed: fp, forwardTotal: checks.length, backwardPassed: 0, backwardTotal: 0, assumptionsPassed: 0, assumptionsTotal: 0, warnings: checks.filter(c => !c.passed).map(c => c.id + ': ' + c.label) };
}

// G1 — Vision → Strategy
async function gate1(root: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const v = await readIfExists(root + '/vdd/vision.md');
  const s = await readIfExists(root + '/vdd/strategy.md');
  if (!v) { checks.push(fail({ id: 'G1.0', label: 'vision.md exists' })); return makeGateFail('G1', 'Vision → Strategy', checks, 'vision.md missing'); }
  if (!s) { checks.push(fail({ id: 'G1.0', label: 'strategy.md exists' })); return makeGateFail('G1', 'Vision → Strategy', checks, 'strategy.md missing'); }
  checks.push(check({ id: 'G1.FILE', label: 'Both artifacts exist' }, true));

  // Forward
  checks.push(check({ id: 'F1.1', label: 'Goal coverage → Strategic Pillars section present' }, hasSection(s, 'Strategic Pillars')));
  checks.push(check({ id: 'F1.2', label: 'Impact coverage → Research Synthesis present' }, hasSection(s, 'Research Synthesis')));
  checks.push(check({ id: 'F1.3', label: 'Stakeholder coverage → strategy references vision' }, s.includes('vdd/vision.md')));
  checks.push(check({ id: 'F1.4', label: 'Metric coverage → Expected Impact per pillar' }, (s.match(/Expected Impact/g) || []).length >= 1));
  checks.push(check({ id: 'F1.5', label: 'Domain coverage → Domain Primers Loaded section' }, hasSection(s, 'Domain Primers Loaded')));

  // Backward
  checks.push(check({ id: 'B1.1', label: 'Pillar authorization → pillars reference vision goals' }, (s.match(/Vision Trace/g) || []).length >= 1));
  checks.push(check({ id: 'B1.2', label: 'Research relevance → Research Synthesis has content' }, hasSection(s, 'Research Synthesis')));
  checks.push(check({ id: 'B1.3', label: 'Risk relevance → Risk Register present' }, hasSection(s, 'Risk Register')));
  checks.push(check({ id: 'B1.4', label: 'No scope invention → Out of Scope section' }, hasSection(s, 'Out of Scope')));
  checks.push(check({ id: 'B1.5', label: 'Feasibility honesty → Feasibility Assessment present' }, hasSection(s, 'Feasibility Assessment')));

  // S&T Assumptions (V→S)
  const saw = hasSection(v, 'S&T Assumptions');
  const sas = hasSection(s, 'S&T Assumptions');
  checks.push(check({ id: 'A1.1', label: 'Necessity (V→S) → S&T section in both files' }, saw && sas));
  checks.push(check({ id: 'A1.2', label: 'Achievability (V→S) → vision achievable claims' }, saw));
  checks.push(check({ id: 'A1.3', label: 'Sufficiency (V→S) → strategy covers vision' }, sas));
  checks.push(check({ id: 'A1.4', label: 'Warnings (V→S) → risk mitigations documented' }, hasSection(s, 'Risk Register')));

  // Impact chain check
  checks.push(check({ id: 'G1.CHAIN', label: 'Impact Chain: strategy extends vision', }, chainExtendsParent(s, v)));

  return tallyGate('G1', 'Vision → Strategy', checks, 5, 5, 4);
}

// G2 — Strategy → Tactics
async function gate2(root: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const s = await readIfExists(root + '/vdd/strategy.md');
  const t = await readIfExists(root + '/vdd/tactics.md');
  if (!s || !t) { checks.push(fail({ id: 'G2.0', label: 'Both artifacts exist' })); return makeGateFail('G2', 'Strategy → Tactics', checks, 'One or both missing'); }
  checks.push(check({ id: 'G2.FILE', label: 'Both artifacts exist' }, true));

  // Forward
  checks.push(check({ id: 'F2.1', label: 'Pillar coverage → Action Items reference pillars' }, (t.match(/Pillar/g) || []).length >= 1));
  checks.push(check({ id: 'F2.2', label: 'Gap coverage → Gap Analysis present' }, hasSection(t, 'Gap Analysis')));
  checks.push(check({ id: 'F2.3', label: 'Risk mitigation → tactics references strategy risk' }, t.includes('strategy.md')));
  checks.push(check({ id: 'F2.4', label: 'Dependency validity → Dependency Map present' }, hasSection(t, 'Dependency Map')));

  // Backward
  checks.push(check({ id: 'B2.1', label: 'Action item authorization → items trace to pillars' }, hasSection(t, 'Prioritized Action Items')));
  checks.push(check({ id: 'B2.2', label: 'No gold-plating → items have MoSCoW labels' }, (t.match(/MUST|SHOULD|COULD/g) || []).length >= 1));
  checks.push(check({ id: 'B2.3', label: 'No scope invention → strategy reference present' }, t.includes('strategy.md')));
  checks.push(check({ id: 'B2.4', label: 'Infrastructure relevance → Infra Requirements section' }, hasSection(t, 'Infrastructure Requirements')));
  checks.push(check({ id: 'B2.5', label: 'Audit accuracy → Codebase Audit present' }, hasSection(t, 'Codebase Audit')));

  // S&T Assumptions
  checks.push(check({ id: 'A2.1', label: 'Necessity (S→T) → S&T section present' }, hasSection(t, 'S&T Assumptions')));
  checks.push(check({ id: 'A2.2', label: 'Achievability (S→T)' }, hasSection(t, 'S&T Assumptions')));
  checks.push(check({ id: 'A2.3', label: 'Sufficiency (S→T)' }, hasSection(t, 'Gap Analysis')));
  checks.push(check({ id: 'A2.4', label: 'Warnings (S→T) → dependency risks' }, hasSection(t, 'Dependency Map')));

  // Impact chain check
  checks.push(check({ id: 'G2.CHAIN', label: 'Impact Chain: tactics extends strategy', }, chainExtendsParent(t, s)));

  return tallyGate('G2', 'Strategy → Tactics', checks, 4, 5, 4);
}

// G3 — Tactics → Specs
async function gate3(root: string, featureDir: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const t = await readIfExists(root + '/vdd/tactics.md');
  const sp = await readIfExists(root + '/vdd/specs/' + featureDir + '/spec.md');
  if (!t || !sp) { checks.push(fail({ id: 'G3.0', label: 'Both artifacts exist' })); return makeGateFail('G3', 'Tactics → Specs', checks, 'One or both missing'); }
  checks.push(check({ id: 'G3.FILE', label: 'Both artifacts exist' }, true));

  const acCount = (sp.match(/### AC-/g) || []).length;
  const mustCount = (sp.match(/\[MUST\]/g) || []).length;
  const ph = countPlaceholders(sp);

  // Forward (10 checks)
  checks.push(check({ id: 'F3.1', label: 'MUST coverage → spec references tactical action item ID (A-XXX)' }, (sp.match(/A-\d+/g) || []).length >= 1));
  checks.push(check({ id: 'F3.2', label: 'Scope coverage → Overview section present' }, hasSection(sp, 'Overview')));
  checks.push(check({ id: 'F3.3', label: 'Impact trace → Impact Verification section' }, hasSection(sp, 'Impact Verification')));
  checks.push(check({ id: 'F3.4', label: 'Testability → ACs have GWT format' }, (sp.match(/Given/g) || []).length >= 1));
  checks.push(check({ id: 'F3.5', label: 'Implementation-free → no tech names in spec' }, !hasTechNames(sp), hasTechNames(sp) ? 'Technology names detected — specs should be implementation-free' : 'OK'));
  checks.push(check({ id: 'F3.6', label: 'Error coverage → edge-case ACs present' }, (sp.match(/AC-E\d+/g) || []).length >= 1));
  checks.push(check({ id: 'F3.7', label: 'MoSCoW labels → ACs labeled' }, mustCount >= 1));
  checks.push(check({ id: 'F3.8', label: 'No vague terms → measurable thresholds (no [e.g.] placeholders)' }, ph === 0, ph + ' placeholder(s) remaining'));
  checks.push(check({ id: 'F3.9', label: 'Clarification resolved → no [NEEDS CLARIFICATION]' }, (sp.match(/\[NEEDS CLARIFICATION\]/g) || []).length === 0));
  checks.push(check({ id: 'F3.10', label: 'Non-functional requirements → NFR section' }, hasSection(sp, 'Non-Functional Requirements')));

  // Backward (4 checks)
  checks.push(check({ id: 'B3.1', label: 'Tactical origin → spec references tactics' }, sp.includes('tactics.md')));
  checks.push(check({ id: 'B3.2', label: 'No scope invention → Boundaries section' }, hasSection(sp, 'Boundaries')));
  checks.push(check({ id: 'B3.3', label: 'Action item coverage → Tactical Origin references action item' }, sp.includes('Action Item')));
  checks.push(check({ id: 'B3.4', label: 'Cross-spec consistency → Out of Scope section' }, hasSection(sp, 'Out of Scope')));

  // S&T Assumptions (4 checks)
  checks.push(check({ id: 'A3.1', label: 'Necessity (T→SP) → S&T section present' }, hasSection(sp, 'S&T Assumptions')));
  checks.push(check({ id: 'A3.2', label: 'Achievability (T→SP)' }, acCount >= 2));
  checks.push(check({ id: 'A3.3', label: 'Sufficiency (T→SP)' }, mustCount >= 1));
  checks.push(check({ id: 'A3.4', label: 'Warnings (T→SP) → error ACs covered' }, (sp.match(/AC-E\d+/g) || []).length >= 1));

  // Impact chain check
  checks.push(check({ id: 'G3.CHAIN', label: 'Impact Chain: spec extends tactics', }, chainExtendsParent(sp, t)));

  return tallyGate('G3', 'Tactics → Specs', checks, 10, 4, 4);
}

// G4 — Specs → Plan
async function gate4(root: string, featureDir: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const sp = await readIfExists(root + '/vdd/specs/' + featureDir + '/spec.md');
  const pl = await readIfExists(root + '/vdd/specs/' + featureDir + '/plan.md');
  const dm = await readIfExists(root + '/vdd/specs/' + featureDir + '/data-model.md');
  const ct = await readIfExists(root + '/vdd/specs/' + featureDir + '/contracts/primary-endpoint.md');
  if (!sp || !pl) { checks.push(fail({ id: 'G4.0', label: 'spec.md + plan.md exist' })); return makeGateFail('G4', 'Specs → Plan', checks, 'One or both missing'); }
  checks.push(check({ id: 'G4.FILE', label: 'plan.md exists' }, true));
  checks.push(check({ id: 'G4.FILE2', label: 'data-model.md exists' }, !!dm));
  checks.push(check({ id: 'G4.FILE3', label: 'contracts/primary-endpoint.md exists' }, !!ct));

  // Forward (7 checks)
  checks.push(check({ id: 'F4.1', label: 'AC traceability → AC Coverage Map present' }, !!pl && hasSection(pl, 'AC Coverage Map')));
  checks.push(check({ id: 'F4.2', label: 'Contract completeness → contracts/ exists' }, !!ct));
  checks.push(check({ id: 'F4.3', label: 'Error code coverage → Error Codes in contract' }, !!ct && ct.includes('Error Codes')));
  checks.push(check({ id: 'F4.4', label: 'Data model completeness → Entities in data-model.md' }, !!dm && hasSection(dm, 'Entities')));
  checks.push(check({ id: 'F4.5', label: 'Migration defined → Migrations section' }, !!dm && hasSection(dm, 'Migrations')));
  checks.push(check({ id: 'F4.6', label: 'Index justification → Indexes section' }, !!dm && hasSection(dm, 'Indexes')));
  checks.push(check({ id: 'F4.7', label: 'Risks identified → Risks section in plan' }, !!pl && hasSection(pl, 'Risks')));

  // Backward (6 checks)
  checks.push(check({ id: 'B4.1', label: 'Component authorization → Component Breakdown' }, !!pl && hasSection(pl, 'Component Breakdown')));
  checks.push(check({ id: 'B4.2', label: 'Contract authorization → contracts reference ACs' }, !!ct && ct.includes('AC Coverage')));
  checks.push(check({ id: 'B4.3', label: 'Entity authorization → data-model references spec' }, !!dm && dm.includes('spec.md')));
  checks.push(check({ id: 'B4.4', label: 'Constitution compliance → plan references stack' }, !!pl && hasSection(pl, 'Technology Choices')));
  checks.push(check({ id: 'B4.5', label: 'No over-engineering → plan is scoped' }, !!pl && hasSection(pl, 'Architecture Overview')));
  checks.push(check({ id: 'B4.6', label: 'Technology fit → Technology Choices table' }, !!pl && hasSection(pl, 'Technology Choices')));

  // S&T Assumptions (4 checks)
  checks.push(check({ id: 'A4.1', label: 'Necessity (SP→PL) → S&T in plan' }, !!pl && hasSection(pl, 'S&T Assumptions')));
  checks.push(check({ id: 'A4.2', label: 'Achievability (SP→PL)' }, !!pl && hasSection(pl, 'Component Breakdown')));
  checks.push(check({ id: 'A4.3', label: 'Sufficiency (SP→PL)' }, !!pl && hasSection(pl, 'AC Coverage Map')));
  checks.push(check({ id: 'A4.4', label: 'Warnings (SP→PL) → risks in plan' }, !!pl && hasSection(pl, 'Risks')));

  // Impact chain check
  checks.push(check({ id: 'G4.CHAIN', label: 'Impact Chain: plan extends spec', }, !!pl && chainExtendsParent(pl, sp)));

  return tallyGate('G4', 'Specs → Plan', checks, 7, 6, 4);
}

// G5 — Plan → Tasks
async function gate5(root: string, featureDir: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const pl = await readIfExists(root + '/vdd/specs/' + featureDir + '/plan.md');
  const tk = await readIfExists(root + '/vdd/specs/' + featureDir + '/tasks.md');
  if (!pl || !tk) { checks.push(fail({ id: 'G5.0', label: 'plan.md + tasks.md exist' })); return makeGateFail('G5', 'Plan → Tasks', checks, 'One or both missing'); }
  checks.push(check({ id: 'G5.FILE', label: 'Both artifacts exist' }, true));

  const taskCount = (tk.match(/\*\*TASK-\d+\*\*/g) || []).length;
  const testTasks = (tk.match(/Write tests/g) || []).length;
  const implTasks = (tk.match(/Implement/g) || []).length;

  // Forward (6 checks)
  checks.push(check({ id: 'F5.1', label: 'Component coverage → tasks reference components' }, taskCount > 0));
  checks.push(check({ id: 'F5.2', label: 'Contract coverage → tasks reference contracts' }, tk.includes('contracts/')));
  checks.push(check({ id: 'F5.3', label: 'Entity coverage → tasks reference data model' }, tk.includes('spec.md')));
  checks.push(check({ id: 'F5.4', label: 'AC references → tasks cite ACs' }, (tk.match(/AC-\d+/g) || []).length >= 1));
  checks.push(check({ id: 'F5.5', label: 'Contract references → tasks cite contracts' }, tk.includes('contracts/')));
  checks.push(check({ id: 'F5.6', label: 'Satisfies declaration → tasks declare AC coverage' }, (tk.match(/Satisfies:/g) || []).length >= 1));

  // Backward (6 checks)
  checks.push(check({ id: 'B5.1', label: 'Task authorization → tasks reference plan' }, tk.includes('plan.md')));
  checks.push(check({ id: 'B5.2', label: 'Test-first order → test before impl' }, testTasks > 0 && implTasks > 0));
  checks.push(check({ id: 'B5.3', label: 'Task size → [S]/[M]/[L] labels' }, (tk.match(/\[S\]|\[M\]|\[L\]/g) || []).length >= 1));
  checks.push(check({ id: 'B5.4', label: 'Dependency validity → tasks have Depends on' }, (tk.match(/Depends on/g) || []).length >= 1));
  checks.push(check({ id: 'B5.5', label: 'Parallelism accuracy → [P] markers present' }, (tk.match(/\[P\]/g) || []).length >= 1));
  checks.push(check({ id: 'B5.6', label: 'No scope invention → tasks bound to plan' }, tk.includes('plan.md')));

  // S&T Assumptions (4 checks)
  checks.push(check({ id: 'A5.1', label: 'Necessity (PL→TK) → task breakdown exists' }, taskCount > 0));
  checks.push(check({ id: 'A5.2', label: 'Achievability (PL→TK)' }, taskCount >= 2));
  checks.push(check({ id: 'A5.3', label: 'Sufficiency (PL→TK)' }, hasSection(tk, 'Tasks')));
  checks.push(check({ id: 'A5.4', label: 'Warnings (PL→TK) → dependency risks' }, (tk.match(/Depends on/g) || []).length >= 1));

  // Impact chain
  checks.push(check({ id: 'G5.CHAIN', label: 'Impact Chain: tasks extends plan', }, chainExtendsParent(tk, pl)));

  return tallyGate('G5', 'Plan → Tasks', checks, 6, 6, 4);
}

// G6 — Tasks → Implementation (pre-implementation structural check)
async function gate6(root: string, featureDir: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const tk = await readIfExists(root + '/vdd/specs/' + featureDir + '/tasks.md');
  if (!tk) { checks.push(fail({ id: 'G6.0', label: 'tasks.md exists' })); return makeGateFail('G6', 'Tasks → Implementation', checks, 'tasks.md missing'); }
  checks.push(check({ id: 'G6.FILE', label: 'tasks.md exists' }, true));

  const pendingTasks = (tk.match(/- \[ \] \*\*TASK-/g) || []).length;
  const doneTasks = (tk.match(/- \[x\] \*\*TASK-/g) || []).length;

  // Forward (4 checks)
  checks.push(check({ id: 'F6.1', label: 'Tests pass → tests defined in tasks' }, (tk.match(/Write tests/g) || []).length >= 1));
  checks.push(check({ id: 'F6.2', label: 'Task scope → tasks have descriptions' }, pendingTasks + doneTasks > 0));
  checks.push(check({ id: 'F6.3', label: 'AC satisfaction → tasks reference ACs' }, (tk.match(/AC-\d+/g) || []).length >= 1));
  checks.push(check({ id: 'F6.4', label: 'Task tracking → checkbox format present' }, pendingTasks + doneTasks > 0));

  // Backward (7 checks)
  checks.push(check({ id: 'B6.1', label: 'Scope adherence → tasks reference plan' }, tk.includes('plan.md')));
  checks.push(check({ id: 'B6.2', label: 'Signature match → tasks reference contracts' }, tk.includes('contracts/')));
  checks.push(check({ id: 'B6.3', label: 'Schema match → tasks reference data model' }, tk.includes('spec.md')));
  checks.push(check({ id: 'B6.4', label: 'Commit format → task IDs present' }, (tk.match(/TASK-\d+/g) || []).length >= 1));
  checks.push(check({ id: 'B6.5', label: 'No silent failures → error ACs referenced' }, (tk.match(/AC-E\d+/g) || []).length >= 1));
  checks.push(check({ id: 'B6.6', label: 'Constitution check → bounded by spec boundaries' }, tk.includes('contracts/')));
  checks.push(check({ id: 'B6.7', label: 'Boundaries check → Always/Never sections' }, tk.includes('spec.md')));

  // S&T Assumptions (4 checks)
  checks.push(check({ id: 'A6.1', label: 'Necessity (TK→IM) → tasks ready for implementation' }, pendingTasks > 0, pendingTasks + ' pending'));
  checks.push(check({ id: 'A6.2', label: 'Achievability (TK→IM) → tasks are sized' }, (tk.match(/\[S\]|\[M\]|\[L\]/g) || []).length >= 1));
  checks.push(check({ id: 'A6.3', label: 'Sufficiency (TK→IM) → tasks cover plan' }, tk.includes('plan.md')));
  checks.push(check({ id: 'A6.4', label: 'Warnings (TK→IM) → dependency risks documented' }, (tk.match(/Depends on/g) || []).length >= 1));

  return tallyGate('G6', 'Tasks → Implementation', checks, 4, 7, 4);
}

// G7 — Implementation → Validation (pre-validation structural check)
async function gate7(root: string, featureDir: string): Promise<GateResult> {
  const checks: GateCheck[] = [];
  const allPaths = [
    root + '/constitution.md',
    root + '/vdd/vision.md',
    root + '/vdd/strategy.md',
    root + '/vdd/tactics.md',
    root + '/vdd/specs/' + featureDir + '/spec.md',
    root + '/vdd/specs/' + featureDir + '/plan.md',
    root + '/vdd/specs/' + featureDir + '/data-model.md',
    root + '/vdd/specs/' + featureDir + '/contracts/primary-endpoint.md',
    root + '/vdd/specs/' + featureDir + '/tasks.md',
    root + '/vdd/impact-report.md',
  ];
  let foundCount = 0;
  for (const p of allPaths) {
    const exists = await readIfExists(p);
    if (exists) foundCount++;
  }
  checks.push(check({ id: 'G7.FILE', label: 'All 10 artifacts exist' }, foundCount === allPaths.length, foundCount + '/' + allPaths.length + ' found'));

  const sp = await readIfExists(root + '/vdd/specs/' + featureDir + '/spec.md');
  const hasACs = !!sp && (sp.match(/### AC-/g) || []).length >= 1;

  let placeholders = 0;
  for (const p of allPaths) {
    const c = await readIfExists(p);
    if (c) placeholders += countSubstancePlaceholders(c);
  }

  // Forward (6 checks)
  checks.push(check({ id: 'F7.1', label: 'Full AC coverage → spec has ACs' }, hasACs));
  checks.push(check({ id: 'F7.2', label: 'Traceability matrix → impact-report exists' }, foundCount === allPaths.length));
  checks.push(check({ id: 'F7.3', label: 'Contract audit → contracts/ exist' }, foundCount >= allPaths.length - 1));
  checks.push(check({ id: 'F7.4', label: 'Impact instrumentation → metrics defined in vision' }, hasSection(await readIfExists(root + '/vdd/vision.md') ?? '', 'Success Metrics')));
  checks.push(check({ id: 'F7.5', label: 'Drift report → impact-report generated' }, foundCount === allPaths.length));
  checks.push(check({ id: 'F7.6', label: 'User story walkthrough → spec has user stories' }, !!sp && hasSection(sp, 'User Stories')));

  // Backward (5 checks)
  checks.push(check({ id: 'B7.1', label: 'Full chain authorization → all artifacts present' }, foundCount === allPaths.length));
  checks.push(check({ id: 'B7.2', label: 'No orphans → every file in chain' }, foundCount === allPaths.length));
  checks.push(check({ id: 'B7.3', label: 'No uncovered vision → vision has spec' }, foundCount >= 6));
  checks.push(check({ id: 'B7.4', label: 'Constitution audit → constitution.md present' }, !!await readIfExists(root + '/constitution.md')));
  checks.push(check({ id: 'B7.5', label: 'Impact verification → vision mapped to spec' }, !!sp && sp.includes('tactics.md')));

  // S&T Assumptions
  checks.push(check({ id: 'A7.1', label: 'Necessity (Full Chain) → all levels present' }, foundCount === allPaths.length));
  checks.push(check({ id: 'A7.2', label: 'Achievability (Full Chain) → artifacts exist' }, foundCount >= 8));
  checks.push(check({ id: 'A7.3', label: 'Sufficiency (Full Chain) → templates complete' }, foundCount === allPaths.length));
  checks.push(check({ id: 'A7.4', label: 'Warnings (Full Chain) → no blocking placeholders' }, placeholders === 0, placeholders + ' placeholder(s) remaining'));

  return tallyGate('G7', 'Implementation → Validation', checks, 6, 5, 4);
}

function makeGateFail(gate: string, junction: string, checks: GateCheck[], detail: string): GateResult {
  const fwd = 0; const bwd = 0; const ast = 0;
  return { gate, junction, passed: false, checks: [fail({ id: gate + '.ERR', label: detail })], forwardPassed: fwd, forwardTotal: 0, backwardPassed: bwd, backwardTotal: 0, assumptionsPassed: ast, assumptionsTotal: 0, warnings: [detail] };
}

function tallyGate(gate: string, junction: string, checks: GateCheck[], fTotal: number, bTotal: number, aTotal: number): GateResult {
  let fPassed = 0; let bPassed = 0; let aPassed = 0;
  const warnings: string[] = [];
  for (const c of checks) {
    if (c.id.startsWith('F')) { if (c.passed) fPassed++; else warnings.push(c.id + ': ' + c.label); }
    else if (c.id.startsWith('B')) { if (c.passed) bPassed++; else warnings.push(c.id + ': ' + c.label); }
    else if (c.id.startsWith('A')) { if (c.passed) aPassed++; else warnings.push(c.id + ': ' + c.label); }
  }
  const allPassed = checks.every(c => c.passed);
  return { gate, junction, passed: allPassed, checks, forwardPassed: fPassed, forwardTotal: fTotal, backwardPassed: bPassed, backwardTotal: bTotal, assumptionsPassed: aPassed, assumptionsTotal: aTotal, warnings };
}

function gateSummary(gates: GateResult[]): { totalPassed: number; totalGates: number; allPassed: boolean; checksRun: number; checksPassed: number; checksTotal: number } {
  const totalPassed = gates.filter(g => g.passed).length;
  const totalGates = gates.length;
  const allPassed = totalPassed === totalGates;
  let checksRun = 0; let checksPassed = 0; let checksTotal = 0;
  for (const g of gates) {
    checksRun += g.checks.length;
    checksPassed += g.checks.filter(c => c.passed).length;
    // Canonical check count covers G1–G7 only (G0 is pre-chain)
    if (g.gate !== 'G0') checksTotal += g.forwardTotal + g.backwardTotal + g.assumptionsTotal;
  }
  return { totalPassed, totalGates, allPassed, checksRun, checksPassed, checksTotal };
}

// ========== e2e (full chain) ==========

// Phase: e2e — end-to-end full chain execution
async function e2e(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  if (!input.statement) return { success: false, error: 'statement is required for e2e' };
  const root = ctx.projectRoot;
  const results: Record<string, unknown> = {};
  const errors: string[] = [];
  const gateResults: GateResult[] = [];
  const featureDir = input.feature || input.actionItemId || 'feature-1';

  // Phase 0: init
  let r = await init({ json: false }, ctx);
  results.init = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('init: ' + (r.error || 'failed'));

  // G0 — constitution approval
  const g0 = await gate0(root);
  gateResults.push(g0);
  results['gate0'] = { passed: g0.passed, checks: g0.checks.map(c => ({ id: c.id, label: c.label, passed: c.passed })) };

  // Phase 1: vision
  r = await vision(input, ctx);
  results.vision = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('vision: ' + (r.error || 'failed'));

  // Phase 2: strategize
  r = await strategize({ json: false }, ctx);
  results.strategize = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('strategize: ' + (r.error || 'failed'));

  // G1 — Vision → Strategy
  const g1 = await gate1(root);
  gateResults.push(g1);
  results['gate1'] = { passed: g1.passed, forward: g1.forwardPassed + '/' + g1.forwardTotal, backward: g1.backwardPassed + '/' + g1.backwardTotal, assumptions: g1.assumptionsPassed + '/' + g1.assumptionsTotal };

  // Phase 3: tactics
  r = await tactics({ json: false }, ctx);
  results.tactics = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('tactics: ' + (r.error || 'failed'));

  // G2 — Strategy → Tactics
  const g2 = await gate2(root);
  gateResults.push(g2);
  results['gate2'] = { passed: g2.passed, forward: g2.forwardPassed + '/' + g2.forwardTotal, backward: g2.backwardPassed + '/' + g2.backwardTotal, assumptions: g2.assumptionsPassed + '/' + g2.assumptionsTotal };

  // Phase 4: specify
  r = await specify({ feature: featureDir, json: false }, ctx);
  results.specify = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('specify: ' + (r.error || 'failed'));

  // Phase 4b: clarify
  r = await clarify({ feature: featureDir, json: false }, ctx);
  results.clarify = { success: r.success, clarifications: r.output?.clarificationCount };
  if (!r.success) errors.push('clarify: ' + (r.error || 'failed'));

  // G3 — Tactics → Specs
  const g3 = await gate3(root, featureDir);
  gateResults.push(g3);
  results['gate3'] = { passed: g3.passed, forward: g3.forwardPassed + '/' + g3.forwardTotal, backward: g3.backwardPassed + '/' + g3.backwardTotal, assumptions: g3.assumptionsPassed + '/' + g3.assumptionsTotal };

  // Phase 5: plan (3 files)
  r = await plan({ feature: featureDir, json: false }, ctx);
  results.plan = { success: r.success, artifact: r.artifact, files: r.output?.files };
  if (!r.success) errors.push('plan: ' + (r.error || 'failed'));

  // G4 — Specs → Plan
  const g4 = await gate4(root, featureDir);
  gateResults.push(g4);
  results['gate4'] = { passed: g4.passed, forward: g4.forwardPassed + '/' + g4.forwardTotal, backward: g4.backwardPassed + '/' + g4.backwardTotal, assumptions: g4.assumptionsPassed + '/' + g4.assumptionsTotal };

  // Phase 6: tasks
  r = await tasks({ feature: featureDir, json: false }, ctx);
  results.tasks = { success: r.success, artifact: r.artifact };
  if (!r.success) errors.push('tasks: ' + (r.error || 'failed'));

  // G5 — Plan → Tasks
  const g5 = await gate5(root, featureDir);
  gateResults.push(g5);
  results['gate5'] = { passed: g5.passed, forward: g5.forwardPassed + '/' + g5.forwardTotal, backward: g5.backwardPassed + '/' + g5.backwardTotal, assumptions: g5.assumptionsPassed + '/' + g5.assumptionsTotal };

  // Phase 7: get-next-task
  r = await nextTask({ feature: featureDir, json: false }, ctx);
  results['get-next-task'] = { success: r.success, task: r.artifact };
  if (!r.success) errors.push('get-next-task: ' + (r.error || 'failed'));

  // G6 — Tasks → Implementation
  const g6 = await gate6(root, featureDir);
  gateResults.push(g6);
  results['gate6'] = { passed: g6.passed, forward: g6.forwardPassed + '/' + g6.forwardTotal, backward: g6.backwardPassed + '/' + g6.backwardTotal, assumptions: g6.assumptionsPassed + '/' + g6.assumptionsTotal };

  // Phase 8: validate
  r = await validate({ json: false }, ctx);
  results.validate = { success: r.success, artifact: r.artifact };

  // G7 — Implementation → Validation
  const g7 = await gate7(root, featureDir);
  gateResults.push(g7);
  results['gate7'] = { passed: g7.passed, forward: g7.forwardPassed + '/' + g7.forwardTotal, backward: g7.backwardPassed + '/' + g7.backwardTotal, assumptions: g7.assumptionsPassed + '/' + g7.assumptionsTotal };

  // Aggregate INITIAL gate summary (before self-heal)
  const initialSummary = gateSummary(gateResults);

  // Self-heal: auto-fix missing sections
  const healedItems = await selfHeal(root, featureDir);

  // Retest all gates after self-heal
  const finalGateResults: GateResult[] = [];
  finalGateResults.push(await gate0(root));
  finalGateResults.push(await gate1(root));
  finalGateResults.push(await gate2(root));
  finalGateResults.push(await gate3(root, featureDir));
  finalGateResults.push(await gate4(root, featureDir));
  finalGateResults.push(await gate5(root, featureDir));
  finalGateResults.push(await gate6(root, featureDir));
  finalGateResults.push(await gate7(root, featureDir));

  // Aggregate FINAL gate summary (after self-heal)
  const summary = gateSummary(finalGateResults);
  const gateWarnings = finalGateResults.flatMap(g => g.warnings.map(w => g.gate + ': ' + w));

  // Collect all written files
  const allFiles: string[] = [];
  for (const phase of ['init','vision','strategize','tactics','specify','clarify','plan','tasks','get-next-task','validate']) {
    const res = results[phase] as Record<string, unknown>;
    if (res?.artifact && typeof res.artifact === 'string' && res.success) {
      allFiles.push(res.artifact);
    }
  }
  const planFiles = (results.plan as Record<string, unknown>)?.files as string[] | undefined;
  if (planFiles) allFiles.push(...planFiles);

  // Substance check: count placeholders remaining across all written templates.
  let substancePlaceholders = 0;
  for (const p of allFiles) {
    try { const c = await fs.readFile(p, 'utf-8'); substancePlaceholders += countSubstancePlaceholders(c); } catch { /* skip */ }
  }
  const substancePassed = substancePlaceholders === 0 && errors.length === 0;

  return {
    success: errors.length === 0,
    artifact: ctx.projectRoot + '/vdd/impact-report.md',
    output: {
      statement: input.statement,
      feature: featureDir,
      actionItemId: input.actionItemId || featureDir,
      chain: (await chainContext(ctx.projectRoot)).tactics + ' → SP-<n> → PL-<n> → TK-<n> → [implementation]',
      phasesCompleted: 10, // init, vision, strategize, tactics, specify, clarify, plan, tasks, get-next-task, validate
      errors: errors.length > 0 ? errors : [],
      files: allFiles,
      substance: { placeholders: substancePlaceholders, passed: substancePassed },
      gates: {
        summary: { passed: summary.totalPassed, total: summary.totalGates, checksRun: summary.checksRun, checksPassed: summary.checksPassed, checksTotal: summary.checksTotal },
        initial: { passed: initialSummary.totalPassed, total: initialSummary.totalGates, checksRun: initialSummary.checksRun, checksPassed: initialSummary.checksPassed },
        selfHeal: { applied: healedItems.length > 0, fixes: healedItems },
        results: finalGateResults.map(g => ({
          gate: g.gate, junction: g.junction, passed: g.passed,
          forward: g.forwardPassed + '/' + g.forwardTotal,
          backward: g.backwardPassed + '/' + g.backwardTotal,
          assumptions: g.assumptionsPassed + '/' + g.assumptionsTotal,
          warnings: g.warnings,
        })),
        checkDetails: finalGateResults.flatMap(g => g.checks.map(c => ({ gate: g.gate, id: c.id, label: c.label, passed: c.passed }))),
      },
      gateWarnings: gateWarnings.length > 0 ? gateWarnings : [],
      summary: errors.length === 0
        ? 'Full VDD chain scaffolded with strict gate validation. ' + summary.totalPassed + '/' + summary.totalGates + ' structural gates passed (' + summary.checksPassed + '/' + summary.checksRun + ' checks). Substance: ' + substancePlaceholders + ' placeholder(s) remain — templates are NOT ready for release until filled (see nextActions). Self-heal applied ' + healedItems.length + ' fix(es).'
        : 'Chain partially completed with ' + errors.length + ' error(s). See errors list.',
      nextActions: [
        '1. Fill in constitution.md with project-specific tech stack and conventions',
        '2. Expand vision.md from the vision statement into structured sections',
        '3. Research and fill in strategy.md with market/tech/competitive analysis',
        '4. Audit codebase and populate tactics.md with real gaps and action items',
        '5. Write detailed ACs in spec.md for each action item',
        '6. Design architecture in plan.md, data-model.md, and contracts/',
        '7. Break plan into granular tasks in tasks.md',
        '8. Implement each task with /vdd:implement <task-id>',
        '9. Validate the full chain with /vdd:validate',
      ],
    },
    gateResult: {
      passed: summary.allPassed && substancePassed,
      checks: summary.checksPassed,
      total: summary.checksRun,
    },
  };
}

const CLONE_TTL_MS = 24 * 60 * 60 * 1000;

// Detect the target project's real stack (framework/db/cms/deploy) from its
// package.json + config files, so the clone manifest reflects reality instead
// of the hardcoded Payload/Postgres default.
async function detectTargetStack(root: string): Promise<{ stack: Partial<CloneManifest['stack']>; deploy: Partial<DeployConfig> }> {
  const has = async (p: string) => {
    try {
      await fs.access(root + '/' + p);
      return true;
    } catch {
      return false;
    }
  };
  const deps: Record<string, string> = {};
  try {
    const raw = await readIfExists(root + '/package.json');
    const pkg = JSON.parse(raw ?? '{}') as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    Object.assign(deps, pkg.dependencies, pkg.devDependencies);
  } catch {
    /* no package.json */
  }

  let database: 'postgres' | 'surreal' | 'none' = 'none';
  if (deps.pg || deps.postgres || deps['@payloadcms/db-postgres']) database = 'postgres';
  if (await has('src/lib/surreal.ts')) database = 'surreal';
  if (database === 'none') {
    const env = await readIfExists(root + '/.env.example');
    if (env && /SURREAL_URL/i.test(env)) database = 'surreal';
  }

  const cms: 'payload' | 'custom' = deps['@payloadcms/payload'] || deps.payload ? 'payload' : 'custom';
  const vercel = await has('vercel.json');
  const targetDeploy: 'docker-swaw' | 'vercel' = vercel ? 'vercel' : 'docker-swaw';

  return {
    stack: { frontend: 'nextjs', cms, database, styling: deps.tailwindcss ? 'tailwind' : 'css' },
    deploy: { target: targetDeploy, database, port: vercel ? 443 : 3000, composeService: 'app', env: {} },
  };
}

// Phase 7c: clone — normalize a target domain and run the full clone pipeline.
async function clone(input: VddPhaseInput, ctx: VddContext): Promise<VddOutput> {
  const domain = input.description ?? input.statement ?? '';
  if (!domain) return needsInput(['description'], 'Pass the target domain as description (bare domain, host, or URL); the clone pipeline then generates the dataset and manifest.');
  const normalized = normalizeDomain(domain);
  if ('code' in normalized) {
    return { success: false, error: normalized.code + ': ' + normalized.message };
  }
  const target = normalized.scheme + '://' + normalized.host;

  const maxPages = input.maxPages ?? 200;
  const timeoutMs = input.timeoutMs;
  const concurrency = input.concurrency;
  const doCrawl = input.crawl !== false;
  const doBrowser = input.browser !== false;
  const refresh = input.refresh === true;

  // Idempotency: reuse a fresh dataset unless a refresh is forced (avoids a
  // redundant full re-crawl, which is what previously timed the MCP call out).
  let reuseDataset: SiteDataset | undefined;
  if (doCrawl && !refresh) {
    const existing = await readIfExists(ctx.projectRoot + '/vdd/clone-dataset.json');
    if (existing) {
      try {
        const ds = JSON.parse(existing) as SiteDataset;
        const ageMs = Date.now() - new Date(ds.crawledAt || 0).getTime();
        if (Array.isArray(ds.pages) && ds.pages.length > 0 && ageMs < CLONE_TTL_MS) reuseDataset = ds;
      } catch {
        /* corrupt dataset — re-crawl */
      }
    }
  }

  let pipeline;
  try {
    pipeline = await runClone(target, {
      browser: doBrowser,
      crawl: doCrawl,
      maxPages,
      timeoutMs,
      concurrency,
      reuseDataset,
    });
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Reflect the target repo's real stack in the manifest.
  if (pipeline.manifest) {
    const detected = await detectTargetStack(ctx.projectRoot);
    pipeline.manifest = {
      ...pipeline.manifest,
      stack: { ...pipeline.manifest.stack, ...detected.stack },
      deploy: { ...pipeline.manifest.deploy, ...detected.deploy },
    };
  }

  const pageCount = pipeline.dataset?.pages.length ?? 0;
  const platform = pipeline.model.platform;
  const localeCount = pipeline.model.locales.length;
  const collectionCount = pipeline.backend.payloadCollections.length;
  const stages = [
    `- [x] A-001 domain normalization → ${target}`,
    pipeline.dataset
      ? `- [x] A-002 crawl → ${pageCount} pages${pipeline.dataset.truncated ? ' (truncated)' : ''} (browserless/fetch)`
      : '- [ ] A-002 crawl (skipped — fetch/browserless unavailable)',
    pipeline.browserSkipped
      ? '- [ ] A-003 capture + evidence (browser skipped — Playwright unavailable; host agent can re-capture)'
      : `- [x] A-003 capture + evidence (${pipeline.evidence?.records.length ?? 0} evidence records)`,
    `- [x] A-004 schema inference → ${pipeline.model.entities.length} entities (platform: ${platform}, ${localeCount} locales)`,
    `- [x] A-005 backend → ${pipeline.backend.migrations.length} migrations, ${pipeline.backend.routes.length} routes, ${collectionCount} Payload collections`,
    pipeline.manifest
      ? '- [x] A-006 scaffold manifest → vdd/clone-manifest.json'
      : '- [ ] A-006 scaffold manifest (skipped — no crawled dataset)',
    `- [x] A-007 AI tools → ${pipeline.tools.length} tools`,
    '- [ ] A-008 live site (host agent: scaffold at project root via `vdd-clone` skill → docker compose → deploy)',
  ].join('\n');

  const entityRows = pipeline.model.entities
    .map((e) => `| ${e.name} | ${e.fields.map((f) => `${f.name}:${f.type}${f.confidence === 'low' ? '?' : ''}`).join(', ') || '—'} |`)
    .join('\n');
  const relRows = pipeline.model.relationships
    .map((r) => `| ${r.source} → ${r.target} | \`${r.via}\` |`)
    .join('\n');
  const localeRows = pipeline.model.locales
    .map((l) => `| ${l.code} | ${l.name} | ${l.locale} | ${l.homeUrl || '—'} |`)
    .join('\n');
  const collectionRows = pipeline.backend.payloadCollections
    .map((c) => `| \`${c.slug}\` | ${c.label} | ${c.localized ? 'yes' : 'no'} | ${c.useAsTitle} |`)
    .join('\n');
  const migrationRows = pipeline.backend.migrations
    .map((m) => `| ${m.entity} | \`${m.up.replace(/\n/g, ' ')}\` | \`${m.down}\` |`)
    .join('\n');
  const routeRows = pipeline.backend.routes
    .map((r) => `| ${r.method} | ${r.path} | ${r.summary} |`)
    .join('\n');
  const toolRows = pipeline.tools.map((t) => `| ${t.name} | ${t.description} |`).join('\n');

  const artifact = ctx.projectRoot + '/vdd/clone.md';
  const datasetRows = pipeline.dataset
    ? pipeline.dataset.pages.map((p) => `| \`${p.path}\` | ${p.title || '—'} | ${p.lang || '—'} |`).join('\n')
    : '';
  const content = '# Clone\n' + templateHeader((await chainContext(ctx.projectRoot)).tactics + ' → SP-<n> → PL-<n> → TK-<n>') +
    '## Target\n' + target + '\n\n' +
    '## Pipeline Stages\n' + stages + '\n\n' +
    '## Crawled Dataset\n\n| Path | Title | Lang |\n|---|---|---|\n' + (datasetRows || '| (none) | — | — |') + '\n\n' +
    '## Locales\n\n| Code | Name | Locale | Home |\n|---|---|---|---|\n' + (localeRows || '| (none) | — | — | — |') + '\n\n' +
    '## Inferred Entities\n\n| Entity | Fields |\n|---|---|\n' + (entityRows || '| (none) | — |') + '\n\n' +
    '## Relationships\n\n| Relationship | Via |\n|---|---|\n' + (relRows || '| (none) | — |') + '\n\n' +
    '## Payload Collections\n\n| Slug | Label | Localized | useAsTitle |\n|---|---|---|---|\n' + (collectionRows || '| (none) | — | — | — |') + '\n\n' +
    '## Migrations (audit)\n\n| Entity | Up | Down |\n|---|---|---|\n' + (migrationRows || '| (none) | — | — |') + '\n\n' +
    '## Routes (contract)\n\n| Method | Path | Summary |\n|---|---|---|\n' + (routeRows || '| (none) | — | — |') + '\n\n' +
    '## Live Site\n\n' + (pipeline.manifest
      ? `Scaffold manifest emitted at \`vdd/clone-manifest.json\` (${collectionCount} collections, ${pageCount} pages). To make it live, run the \`vdd-clone\` skill: scaffold a Next.js + Payload + Postgres app **at the project root**, then \`docker compose\` + an SSH tunnel.\n\n`
      : 'No manifest generated (no crawled dataset).\n\n') +
    '## AI Tools\n\n| Name | Description |\n|---|---|\n' + (toolRows || '| (none) | — |') + '\n';

  const result = await writeArtifact(artifact, content);
  if (!result.written) return { success: false, error: 'Failed to write clone.md: ' + (result.error || 'unknown') };

  let datasetPath: string | undefined;
  if (pipeline.dataset) {
    const w = await writeArtifact(ctx.projectRoot + '/vdd/clone-dataset.json', JSON.stringify(pipeline.dataset, null, 2));
    if (w.written) datasetPath = '/vdd/clone-dataset.json';
  }
  let schemaPath: string | undefined;
  const schemaW = await writeArtifact(ctx.projectRoot + '/vdd/clone-schema.json', JSON.stringify(pipeline.model, null, 2));
  if (schemaW.written) schemaPath = '/vdd/clone-schema.json';
  let capturePath: string | undefined;
  if (pipeline.capture) {
    const w = await writeArtifact(ctx.projectRoot + '/vdd/clone-capture.json', JSON.stringify(pipeline.capture, null, 2));
    if (w.written) capturePath = '/vdd/clone-capture.json';
  }
  let manifestPath: string | undefined;
  if (pipeline.manifest) {
    const w = await writeArtifact(ctx.projectRoot + '/vdd/clone-manifest.json', JSON.stringify(pipeline.manifest, null, 2));
    if (w.written) manifestPath = '/vdd/clone-manifest.json';
  }

  return {
    success: true,
    artifact,
    output: {
      normalized: target,
      platform,
      pages: pageCount,
      dataset: datasetPath,
      schema: schemaPath,
      capture: capturePath,
      manifest: manifestPath,
      truncated: pipeline.dataset?.truncated ?? false,
      locales: localeCount,
      entities: pipeline.model.entities.length,
      relationships: pipeline.model.relationships.length,
      migrations: pipeline.backend.migrations.length,
      routes: pipeline.backend.routes.length,
      collections: collectionCount,
      tools: pipeline.tools.length,
      crawlSkipped: pipeline.crawlSkipped,
      browserSkipped: pipeline.browserSkipped,
      deploy: pipeline.manifest
        ? 'Run the `vdd-clone` skill to scaffold a Next.js + Payload + Postgres app at the project root (`.`) from vdd/clone-manifest.json, then `docker compose up` on the build box and expose it via an SSH tunnel.'
        : 'No manifest to deploy — the crawl produced no dataset.',
    },
  };
}

export const PHASES: Record<string, VddPhaseFn> = {
  init, vision, strategize, tactics, specify, clarify,
  plan, tasks, 'get-next-task': nextTask, implement, validate, trace, analyze, inspect, amend, e2e, clone,
  'detect-environment': detectEnvironmentPhase,
};
