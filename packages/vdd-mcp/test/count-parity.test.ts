import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * 2.0.0 changed the surface: 14 tools → 3, 20 prompts → 0, and seven counted gates → three
 * invariants. Copy drifts, and it drifts in shapes a sentence-level grep misses — the retired
 * claim is written `MCP Tools (14)` as often as `14 tools`.
 *
 * The absence set is the live surface: what a user or an agent reads to decide how to call this.
 * The record — CHANGELOG, TASKS, the plan documents — is excluded, because it is allowed to say
 * what the surface used to be.
 */
const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));
const read = (path: string) => readFileSync(repo(path), 'utf8');

const LIVE_SURFACE = [
  'README.md',
  'SKILL.md',
  'llms.txt',
  'context7.json',
  'glama.json',
  'server.json',
  'CONTRIBUTING.md',
  'docs/deployment.md',
  'SECURITY.md',
  ...readdirSync(repo('domain-primers'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `domain-primers/${name}`),
  // `docs/architecture.md` is excluded on purpose: its own header declares it "proposed — under
  // review", it describes the design before the collapse, and it is a record of that reasoning
  // rather than a statement about the current surface.
  'package.json',
  'packages/vdd-cli/package.json',
  'packages/vdd-engine/package.json',
  'packages/vdd-mcp/package.json',
  'index.html',
  'zh/index.html',
  'hk/index.html',
  'docs/social-preview.svg',
  'scripts/gen-landing.py',
  '.github/ISSUE_TEMPLATE/docs.md',
  ...readdirSync(repo('references'))
    .filter((name) => name.endsWith('.md'))
    .map((name) => `references/${name}`),
];

/**
 * Every form the 1.x claim is written in. The bare `14 tools` misses `MCP Tools (14)`; the bare
 * `7 gates` misses `7 Bi-Directional Gates`; the tool names catch a routed call the counts miss.
 */
const RETIRED = [
  '14 tools',
  'MCP Tools (14)',
  'MCP tools (14)',
  '20 prompts',
  'MCP Prompts (20)',
  'MCP prompts (20)',
  '21 prompts',
  '108 checks',
  '108 total',
  '7 gates',
  '7 Gates',
  '7 quality gates',
  '7 Bi-Directional Gates',
  '7 bi-directional',
  'seven gates',
  '七道质量门',
  '七道質量門',
  '7 个质量门',
  '7 個質量門',
  '7 bidirectional',
  'G1–G7',
  'G1-G7',
  'Gate G6',
  '17 phase',
  '16 subcommand',
  'TASK-###',
  'TASK-XXX',
  '/vdd:',
  'V→S→T',
  'V\\u2192S\\u2192T',
  'G3 (T→SP)',
  'G7 (IM→VS)',
  'G6 (TK→IM)',
  'quality-gates.md',
  'prompt-patterns.md',
  'ai-agent-patterns.md',
  'vdd_init',
  'vdd_vision',
  'vdd_strategize',
  'vdd_tactics',
  'vdd_specify',
  'vdd_clarify',
  'vdd_get_next_task',
  'vdd_implement',
  'vdd_inspect',
  'vdd_detect_environment',
  'vdd_validate',
  'delegation envelope',
  'persisted:false',
  'artifactFiles',
  'writeTargets',
  'initialize',
  '14%20tools',
  '1.10.1',
  'Bi-Directional Gates',
  'gate report',
  'drift report',
  'drift detection',
  'Auto-Generated',
  'delegation contract',
  'impact verify',
];

describe('count parity', () => {
  for (const path of LIVE_SURFACE) {
    it(`${path} carries no retired claim`, () => {
      const text = read(path);
      const offending = RETIRED.filter((token) => text.includes(token));
      expect(offending, `${path} still says: ${offending.join(', ')}`).toEqual([]);
    });
  }

  it('the entry documents state the new surface', () => {
    for (const path of ['README.md', 'SKILL.md', 'llms.txt']) {
      // Digits or words: the claim is the count, and the prose uses both.
      expect(read(path), path).toMatch(/(3|three) tools|tools \(3\)/);
      expect(read(path), path).toMatch(/(9|nine) skills|skills \(9\)/);
    }
  });

  it('the vision template carries every section of the framework it implements', () => {
    const templates = read('references/artifact-templates.md');
    const framework = read('docs/vision-framework-v16.md');
    const sections = [...framework.matchAll(/^### (§\d [^\n]+)$/gm)].map((m) => m[1]);
    expect(sections.length).toBeGreaterThanOrEqual(7);
    // Derived from the framework, not hardcoded: a new section in the authority must appear in the
    // template, or this fails.
    for (const section of sections) expect(templates, `vision template lost "${section}"`).toContain(section);
  });

  it('the coverage invariants document exists and names A, B and C', () => {
    const doc = read('references/coverage-invariants.md');
    for (const marker of ['**A — forward completeness.**', '**B — backward soundness.**', '**C — dedicated chain.**']) {
      expect(doc).toContain(marker);
    }
    expect(doc).toContain('action_count=1 < pillar_count=3');
  });
});
