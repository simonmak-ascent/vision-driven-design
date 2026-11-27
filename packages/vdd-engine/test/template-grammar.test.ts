import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PHASE_CONFIG, opensBlocks, runPhaseCheck, type CheckPhase } from '../src/coverage.js';

/**
 * The templates are the generator for every artifact the engine reads, so the
 * two must speak one grammar. §11.2's table is the contract: each phase template
 * carries exactly its own junction field, each non-phase template carries none,
 * and the vision template's chain projection is the only place a `V-###` id is
 * bound to an `OBJ-###`.
 */
const TEMPLATES = readFileSync(new URL('../../../references/artifact-templates.md', import.meta.url), 'utf8');

/**
 * The fenced markdown body under a `## … Template` heading. The templates nest
 * their own fences (the contracts template holds ```json blocks), so the body
 * ends at the fence that closes the one this function walked in on — not at the
 * first ``` after the opening, which would cut the template off part-way and
 * leave its tail unchecked.
 */
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

const PHASE_TEMPLATES: Array<[string, CheckPhase]> = [
  ['strategy.md', 'strategy'],
  ['tactics.md', 'tactics'],
  ['spec.md', 'specs'],
  ['plan.md', 'plan'],
  ['tasks.md', 'tasks'],
];

const NON_PHASE_TEMPLATES = [
  'data-model.md',
  'contracts/[endpoint].md',
  'research.md',
  'decision_log.md',
  'Impact Verification Report',
];

describe('template grammar', () => {
  for (const [heading, phase] of PHASE_TEMPLATES) {
    it(`${heading} carries exactly ${phase}'s junction field`, () => {
      const cfg = PHASE_CONFIG[phase];
      const body = templateBody(heading);

      // String equality against the config, not "contains serves_": any field
      // name would satisfy a looser test, and a wrong one would silently make
      // every child of this phase an orphan.
      const fields = [...new Set(body.match(/serves_[a-z_]+/g) ?? [])];
      expect(fields).toEqual([cfg.servesField]);

      // At least one occurrence binds a real id of the parent prefix, so the
      // template demonstrates the field rather than naming it.
      expect(body).toMatch(new RegExp(`${cfg.servesField}\\s*:\\s*${cfg.parentPrefix}-\\d{3}`));
    });

    it(`${heading} gives its children block-opening ids`, () => {
      const cfg = PHASE_CONFIG[phase];
      // A child id must open a line, or the engine slices one block over the
      // whole artifact and every child collapses into a single matrix column.
      // Asked of *this* template's body, through the engine's own predicate: a
      // line from another template in the same file must not satisfy it.
      expect(opensBlocks(templateBody(heading), phase), `${heading} opens no ${cfg.childPrefix}-### block`).toBe(true);
    });
  }

  for (const heading of NON_PHASE_TEMPLATES) {
    it(`${heading} carries no junction field`, () => {
      // These are views and records: a `serves_*` line here would claim a
      // junction the engine does not model, and the hand-edit would pass silently.
      expect(templateBody(heading)).not.toMatch(/serves_/);
    });
  }

  // The generator's own output must pass the validator: these two phases are
  // whole artifacts, so the shipped templates can be run through the engine as
  // they stand. This is what catches a template whose body declares one id set
  // while its chain header names another — the failure a per-template assertion
  // on the field name cannot see.
  it('the shipped strategy template passes against the shipped vision template', () => {
    const result = runPhaseCheck('strategy', templateBody('strategy.md'), undefined, {
      vision: templateBody('vision.md'),
    });
    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
  });

  it('the shipped tactics template passes against the shipped strategy template', () => {
    const result = runPhaseCheck('tactics', templateBody('tactics.md'), undefined, {
      strategy: templateBody('strategy.md'),
    });
    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
  });

  it('binds every projected V id to exactly one objective', () => {
    const body = templateBody('vision.md');
    const heading = body.indexOf('## Chain projection');
    // `slice(-1)` of a body with no such section is still one character long and
    // still yields no lines, so both of the next two assertions are load-bearing.
    expect(heading, 'no "## Chain projection" section').toBeGreaterThan(-1);
    const projection = body.slice(heading);

    const lines = projection
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('- V-'));
    expect(lines.length, 'the projection names no V id').toBeGreaterThan(0);

    // The strict shape is the "no metric restated" control: anything after the
    // objective id would be a second copy of a fact stated once in §3.
    for (const line of lines) expect(line).toMatch(/^- V-\d{3} → OBJ-\d{3}$/);

    const visions = lines.map((line) => line.match(/V-\d{3}/)![0]);
    const objectives = lines.map((line) => line.match(/OBJ-\d{3}/)![0]);

    expect(new Set(visions).size).toBe(lines.length);
    expect(new Set(objectives).size).toBe(lines.length);

    // §3 and §5 only: the projection line is inside `body`, so a set taken from the
    // whole of it already contains the very id this loop exists to validate.
    const declared = new Set(body.slice(0, heading).match(/OBJ-\d{3}/g) ?? []);
    for (const objective of objectives) expect(declared).toContain(objective);
  });
});
