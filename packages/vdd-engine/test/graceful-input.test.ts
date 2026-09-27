import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PHASES } from '../src/engine.js';
import type { VddContext, VddPhaseInput } from '../src/types.js';

const ctx = (root: string): VddContext => ({ projectRoot: root, mode: 'auto' });
const emptyInput = (): VddPhaseInput => ({ json: false });

describe('graceful degradation when a selector is missing', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vdd-input-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  // Previously these returned { success: false, error: "… is required" }.
  const cases = [
    'vision',
    'specify',
    'clarify',
    'plan',
    'tasks',
    'get-next-task',
    'analyze',
    'implement',
    'amend',
  ];

  it.each(cases)('%s returns actionable success instead of a hard error', async (tool) => {
    const result = await PHASES[tool](emptyInput(), ctx(root));
    expect(result.success, tool).toBe(true);
    const needs = (result.output as { needsInput?: string[] } | undefined)?.needsInput ?? [];
    expect(needs.length, tool).toBeGreaterThan(0);
  });

  it('auto-selects the only spec directory when feature is omitted', async () => {
    await mkdir(join(root, 'vdd', 'specs', 'alpha'), { recursive: true });
    await writeFile(
      join(root, 'vdd', 'specs', 'alpha', 'spec.md'),
      '# Alpha\n\n- [NEEDS CLARIFICATION] who is the primary user?\n',
    );

    const result = await PHASES['clarify'](emptyInput(), ctx(root));
    expect(result.success).toBe(true);
    expect((result.output as { feature?: string }).feature).toBe('alpha');
  });
});
