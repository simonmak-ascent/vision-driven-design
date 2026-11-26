import { describe, expect, it } from 'vitest';

import { isValidFeatureName } from '../../vdd-engine/src/engine.js';

/**
 * The `feature` input is gone from the 2.0.0 surface — no tool takes a project
 * root, a feature directory or any other path, because no tool touches a
 * filesystem. The engine's validator therefore has one caller left (the legacy
 * engine, deleted at 4.5), and this file keeps its behaviour pinned until then.
 */
describe('engine feature-name validator', () => {
  it('accepts the names the old surface accepted', () => {
    for (const name of ['alpha', 'user-auth', 'a', 'a.b_c-9', 'A-001', 'x'.repeat(64)]) {
      expect(isValidFeatureName(name), name).toBe(true);
    }
  });

  it('rejects everything that could escape the project root', () => {
    for (const name of ['', '..', '.', '../../other', 'a/b', 'a\\b', 'A B', '-leading', '.hidden', 'x'.repeat(65)]) {
      expect(isValidFeatureName(name), name).toBe(false);
    }
  });
});
