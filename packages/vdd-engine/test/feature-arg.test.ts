import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PHASES } from '../src/engine.js';
import type { VddContext } from '../src/types.js';

const ctx = (root: string): VddContext => ({ projectRoot: root, mode: 'auto' });

/**
 * `feature` is concatenated into read paths (`root + '/vdd/specs/' + feature + '/spec.md'`).
 * Without validation a caller can walk out of the spec directory and read a sibling tree.
 * These cases pin the contract: a name is `^[a-z0-9][a-z0-9._-]{0,63}$` or it is rejected.
 */
describe('feature argument validation', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vdd-feature-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('rejects traversal instead of reading outside vdd/specs', async () => {
    // `vdd/specs/../../other/spec.md` resolves to `<root>/other/spec.md` — outside the spec tree.
    // `vdd/specs` must exist or the kernel cannot walk the `..` components (ENOENT).
    await mkdir(join(root, 'vdd', 'specs'), { recursive: true });
    await mkdir(join(root, 'other'), { recursive: true });
    await writeFile(
      join(root, 'other', 'spec.md'),
      '# Leaked\n\n[NEEDS CLARIFICATION] secret-marker\n',
    );

    const result = await PHASES.clarify({ feature: '../../other', json: false }, ctx(root));

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain('secret-marker');
  });

  it.each(['..', '.', 'a/b', 'a\\b', 'A B', 'x'.repeat(65)])(
    'rejects the non-conforming name %s',
    async (feature) => {
      const result = await PHASES.clarify({ feature, json: false }, ctx(root));
      expect(result.success).toBe(false);
    },
  );

  it('accepts a conforming name', async () => {
    await mkdir(join(root, 'vdd', 'specs', 'alpha'), { recursive: true });
    await writeFile(
      join(root, 'vdd', 'specs', 'alpha', 'spec.md'),
      '# Alpha\n\n[NEEDS CLARIFICATION] who?\n',
    );

    const result = await PHASES.clarify({ feature: 'alpha', json: false }, ctx(root));

    expect(result.success).toBe(true);
    expect((result.output as { clarificationCount?: number }).clarificationCount).toBe(1);
  });

  // `specify` is the phase that CREATES vdd/specs/<id>/, and it takes `actionItemId`/`description`
  // as free text. It must refuse a path segment even when `feature` is absent.
  it.each(['../../escape', '/abs', 'a/b', '.', '..', 'Add user auth'])(
    'specify refuses %j instead of writing outside vdd/specs',
    async (id) => {
      const result = await PHASES.specify({ actionItemId: id, json: false }, ctx(root));
      expect(result.success).toBe(false);
      await expect(access(join(root, 'escape'))).rejects.toThrow();
      await expect(access(join(root, 'abs'))).rejects.toThrow();
    },
  );

  it('specify still writes the documented A-001 form', async () => {
    const result = await PHASES.specify({ actionItemId: 'A-001', json: false }, ctx(root));
    expect(result.success).toBe(true);
    await expect(access(join(root, 'vdd/specs/A-001/spec.md'))).resolves.toBeUndefined();
  });
});
