import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PHASE_CONFIG, runPhaseCheck } from '../src/coverage.js';

/**
 * v18 §4: the chain projection is a rule the tool enforces, not a shape the
 * template happens to have. R1 the section exists · R2 at least one strict line ·
 * R3 no `V-###` twice · R4 no `OBJ-###` twice · R5 every `V-###` in the artifact
 * is projected · R6 every projected objective is declared before the heading.
 *
 * Each case is built from the engine's own exports, so a missing implementation
 * is an assertion failure — never a load error. Only case 7 reads a file.
 */
const TEMPLATES = readFileSync(new URL('../../../references/artifact-templates.md', import.meta.url), 'utf8');

/** The fenced body under a `## … Template` heading; copied from `template-grammar.test.ts:23-38`. */
function templateBody(heading: string): string {
  const start = TEMPLATES.indexOf(`## ${heading} Template`);
  expect(start, `no "## ${heading} Template" heading`).toBeGreaterThan(-1);
  const fence = TEMPLATES.indexOf('```markdown', start);
  expect(fence, `${heading} has no fenced template`).toBeGreaterThan(-1);

  const lines = TEMPLATES.slice(TEMPLATES.indexOf('\n', fence) + 1).split('\n');
  let depth = 1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startsWith('```')) {
      depth += lines[i].trim() === '```' ? -1 : 1;
      if (depth === 0) return lines.slice(0, i).join('\n');
    }
  }
  throw new Error(`${heading}: unterminated template fence`);
}

/** The objectives §3 declares, so R6 has something to resolve against. */
const OBJECTIVES = [
  '- OBJ-001 — metric: activation · baseline → target: 10% → 25%',
  '- OBJ-002 — metric: retention · baseline → target: 40% → 55%',
].join('\n');

const vision = (projection: string, header = ''): string =>
  `# vision.md\n\n${header}## §3 Vision, goal, objectives\n${OBJECTIVES}\n\n${projection}\n`;

const reasons = (content: string, declaredCounts?: Record<string, number>) =>
  runPhaseCheck('vision', content, declaredCounts).reasons;

describe('the chain projection rule', () => {
  it('R3 · one V id on two lines fails', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-001 → OBJ-001');
    expect(reasons(content)).toContain('V-001 is projected more than once');
    expect(runPhaseCheck('vision', content).status).toBe('FAIL');
  });

  it('R4 · one objective projected by two lines fails', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-002 → OBJ-001');
    expect(reasons(content)).toContain('OBJ-001 is projected more than once');
    expect(runPhaseCheck('vision', content).status).toBe('FAIL');
  });

  it('R1 · a chain header and no projection section fails', () => {
    const content = vision('## Purpose\nProse only.', '> Impact Chain: V-001\n\n');
    expect(reasons(content)).toEqual(['vision has no "## Chain projection" section']);
  });

  it('R6 · a projected objective the artifact does not declare fails', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-002 → OBJ-099');
    expect(reasons(content)).toContain('V-002 projects OBJ-099, which the artifact does not declare');
  });

  it('R5 · a V id outside the projection fails', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-002 → OBJ-002').replace(
      '- OBJ-001 — metric: activation',
      'See V-003. - OBJ-001 — metric: activation',
    );
    expect(reasons(content)).toContain('V-003 is not in the chain projection');
  });

  it('R2 · an ASCII arrow is not a projection line', () => {
    const content = vision('## Chain projection\n- V-001 -> OBJ-001');
    expect(reasons(content)).toEqual(['not a projection line: - V-001 -> OBJ-001']);
  });

  it('R1 · a missing section reports one defect, not a count mismatch too', () => {
    const content = vision('## Purpose\nProse only.', '> Impact Chain: V-001\n\n');
    expect(runPhaseCheck('vision', content, { goals: 2 }).reasons).toEqual([
      'vision has no "## Chain projection" section',
    ]);
  });

  it('R2 · a malformed line is reported once, not again as an unprojected id', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-002 -> OBJ-002');
    expect(reasons(content)).toEqual(['not a projection line: - V-002 -> OBJ-002']);
  });

  it('the shipped vision template passes', () => {
    const result = runPhaseCheck('vision', templateBody('vision.md'));
    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
  });

  it('the count rule is unchanged: declared 3 against 2 lines', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-002 → OBJ-002');
    const result = runPhaseCheck('vision', content, { goals: 3 });
    expect(result.reasons).toEqual(['declared goals 3, actual 2']);
    expect(result.actual_counts.goals).toBe(2);
  });

  it('counts projection lines, not distinct mentions', () => {
    const content = vision('## Chain projection\n- V-001 → OBJ-001\n- V-001 → OBJ-001');
    expect(runPhaseCheck('vision', content).actual_counts.goals).toBe(2);
  });

  it('the phase config carries the projection flag', () => {
    expect(PHASE_CONFIG.vision).toMatchObject({ projection: true });
  });
});
