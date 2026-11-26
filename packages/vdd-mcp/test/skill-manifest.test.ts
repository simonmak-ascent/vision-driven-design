import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SKILLS } from '../src/generated/skills.js';
import { getSkill, listSkills } from '../src/skills.js';
import { PHASE_CONFIG, type CheckPhase } from '@simonmak-ascent/engine';

/**
 * The nine skills are the whole of 2.0.0's procedure surface: the tools judge,
 * the skills tell the agent what to write. They reach the wire through a
 * committed manifest, so the control that matters is that the manifest still
 * matches the files — a hand-edit to either side fails here rather than
 * shipping a skill whose digest and text disagree.
 */
const SKILLS_DIR = fileURLToPath(new URL('../../../skills/', import.meta.url));

const NAME = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;

function frontmatter(text: string): { fields: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  expect(match, 'SKILL.md has no frontmatter').not.toBeNull();
  const fields: Record<string, string> = {};
  for (const line of match![1].split(/\r?\n/)) {
    const field = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (field) fields[field[1]] = field[2];
  }
  return { fields, body: text.slice(match![0].length).trim() };
}

const DIRECTORY_NAMES = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe('skill manifest', () => {
  it('ships exactly the nine skills the specification names', () => {
    expect(DIRECTORY_NAMES).toEqual([
      'vdd-constitution',
      'vdd-implement',
      'vdd-plan',
      'vdd-specs',
      'vdd-strategy',
      'vdd-tactics',
      'vdd-tasks',
      'vdd-validate',
      'vdd-vision',
    ]);
    expect(SKILLS).toHaveLength(9);
  });

  for (const name of DIRECTORY_NAMES) {
    it(`${name} has valid frontmatter and a non-empty body`, () => {
      const text = readFileSync(`${SKILLS_DIR}${name}/SKILL.md`, 'utf8');
      const { fields, body } = frontmatter(text);

      // The Agent Skills rules that a hand-written file can break.
      expect(fields.name, 'name must match the directory').toBe(name);
      expect(fields.name).toMatch(NAME);
      expect(fields.name).not.toContain('--');
      expect(fields.description.length).toBeGreaterThan(0);
      expect(fields.description.length).toBeLessThanOrEqual(1024);
      expect(body.length).toBeGreaterThan(0);
    });

    it(`${name}'s manifest entry matches the file on disk`, () => {
      const text = readFileSync(`${SKILLS_DIR}${name}/SKILL.md`, 'utf8');
      const entry = getSkill(name);
      expect(entry, `${name} is missing from the manifest`).not.toBeNull();
      expect(entry!.sha256).toBe(createHash('sha256').update(text).digest('hex'));
      expect(entry!.size).toBe(Buffer.byteLength(text));
      expect(entry!.uri).toBe(`skill://${name}/SKILL.md`);
      expect(entry!.body).toBe(frontmatter(text).body);
    });
  }

  // The skills teach the grammar the engine reads. A skill that names the wrong
  // junction field produces artifacts the engine marks as orphans at every
  // parent, and the frontmatter and digest cases cannot see it.
  const JUNCTION_SKILLS: Array<[string, CheckPhase]> = [
    ['vdd-strategy', 'strategy'],
    ['vdd-tactics', 'tactics'],
    ['vdd-specs', 'specs'],
    ['vdd-plan', 'plan'],
    ['vdd-tasks', 'tasks'],
  ];

  for (const [skill, phase] of JUNCTION_SKILLS) {
    it(`${skill} names exactly ${phase}'s junction field`, () => {
      const body = getSkill(skill)!.body;
      const fields = [...new Set(body.match(/serves_[a-z_]+/g) ?? [])];
      expect(fields).toEqual([PHASE_CONFIG[phase].servesField]);
      expect(body).toContain(`${PHASE_CONFIG[phase].childPrefix}-`);
    });
  }

  it('lists every skill without its body', () => {
    const listed = listSkills();
    expect(listed.map((skill) => skill.name).sort()).toEqual(DIRECTORY_NAMES);
    for (const skill of listed) expect(skill).not.toHaveProperty('body');
  });

  it('is not stale: the committed manifest equals a fresh generation', () => {
    // The check the plan names (`gen && git diff --exit-code`) as a command,
    // expressed as an assertion so it runs in the suite rather than by hand.
    expect(() =>
      execFileSync('node', [fileURLToPath(new URL('../../../scripts/gen-skill-manifest.mjs', import.meta.url)), '--check'], {
        stdio: 'pipe',
      }),
    ).not.toThrow();
  });
});
