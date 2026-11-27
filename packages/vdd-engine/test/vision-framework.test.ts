import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { runPhaseCheck } from '../src/coverage.js';

/**
 * v18 §2 is the artifact's field contract: one row per field, `| token | §N | rule |`.
 * This file derives its assertions from that table rather than hardcoding the field
 * list, so the delta, the template an author copies and the skill a hosted client
 * receives cannot drift apart.
 *
 * The template is checked as the *vision* template's body, not as the whole
 * `references/artifact-templates.md`: the strategy, specs and tasks templates carry
 * many of the same nouns, and `:139` already says `contextual`, which is why a
 * whole-file case-insensitive `includes('context')` would prove nothing. The word
 * boundary is what closes that hole; the `i` flag only recognises the capitalised
 * column headers (`Locator`, `Triangulated`, …) that the template already uses.
 */
const repo = (path: string): string => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const FRAMEWORK = repo('docs/vision-framework-v18.md');
const TEMPLATES = repo('references/artifact-templates.md');
const SKILL = repo('skills/vdd-vision/SKILL.md');

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

/** The inventory: the first column is a bare token, the second a section number. */
const INVENTORY = [...FRAMEWORK.matchAll(/^\| ([a-z][a-z0-9_]*) \| §\d \|/gm)].map((match) => match[1]);

/** The fields the adopted constructs introduce; `locator` is included as the field the ledger extends. */
const ADOPTED = [
  'locator',
  'validated_by',
  'searched',
  'revalidate_by',
  'hypothesis_test',
  'disconfirming_result',
  'instrument',
  'power',
  'legitimacy',
  'urgency',
  'salience_class',
  'downgrades',
  'gate_criteria',
  'context',
  'review_points',
];

describe('the vision field contract', () => {
  it('v18 declares no ### §N heading, so count-parity keeps deriving from v16', () => {
    expect(FRAMEWORK).not.toMatch(/^### §\d/m);
  });

  it('the inventory declares the fields the adopted constructs introduce', () => {
    expect(INVENTORY.length).toBeGreaterThanOrEqual(ADOPTED.length);
    for (const token of ADOPTED) expect(INVENTORY, `v18 has no row for "${token}"`).toContain(token);
  });

  it('every declared field is in the vision template', () => {
    const body = templateBody('vision.md');
    for (const token of INVENTORY) {
      expect(new RegExp(`\\b${token}\\b`, 'i').test(body), `the vision template does not carry "${token}"`).toBe(true);
    }
  });

  it('every declared field is in the skill', () => {
    for (const token of INVENTORY) {
      expect(SKILL.includes(`\`${token}\``), `the skill does not carry \`${token}\``).toBe(true);
    }
  });

  it('the skill names the current framework', () => {
    expect(SKILL).toContain('v18');
  });

  it('the shipped vision template passes the vision check', () => {
    const result = runPhaseCheck('vision', templateBody('vision.md'));
    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
  });
});
