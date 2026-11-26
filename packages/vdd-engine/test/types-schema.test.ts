/**
 * Contract test for the engine's published schema surface.
 *
 * This file imports ONLY from `../src/index.js` — the `main`/`types` entry — so
 * what it pins is what a consumer of `@simonmak-ascent/engine` actually receives.
 * Every other engine test imports `../src/engine.js` or `../src/types.js`
 * directly, which would keep passing if `src/index.ts` lost a re-export. That
 * divergence is deliberate.
 *
 * The delegation envelope is exercised through `VddOutput`, because `Delegation`
 * itself is not re-exported from the entry point and should not be: adding it
 * would be a public-API change for a dependency patch.
 */
import { describe, expect, it } from 'vitest';

import {
  Constitution,
  VddContext,
  VddMode,
  VddOutput,
  VddPhaseInput,
} from '../src/index.js';

describe('published schema surface', () => {
  it('VddMode admits the two chain modes and nothing else', () => {
    expect(VddMode.parse('auto')).toBe('auto');
    expect(VddMode.parse('gated')).toBe('gated');
    expect(VddMode.safeParse('interactive').success).toBe(false);
  });

  it('Constitution defaults mode and accepts string maps', () => {
    const parsed = Constitution.parse({
      stack: { language: 'typescript' },
      conventions: { files: 'kebab-case' },
    });
    expect(parsed.mode).toBe('auto');
    expect(parsed.stack).toEqual({ language: 'typescript' });
  });

  it('VddContext requires projectRoot and defaults the mode', () => {
    expect(VddContext.parse({ projectRoot: '/tmp/project' }).mode).toBe('auto');
    expect(VddContext.safeParse({ mode: 'auto' }).success).toBe(false);
  });

  it('VddOutput.mode admits only the two report modes', () => {
    expect(VddOutput.parse({ success: true, mode: 'local' }).mode).toBe('local');
    expect(VddOutput.parse({ success: true, mode: 'hosted-delegated' }).mode).toBe(
      'hosted-delegated',
    );
    expect(VddOutput.safeParse({ success: true, mode: 'remote' }).success).toBe(false);
  });

  it('VddPhaseInput defaults json to false', () => {
    expect(VddPhaseInput.parse({}).json).toBe(false);
    expect(VddPhaseInput.parse({ json: true, feature: 'x' }).json).toBe(true);
  });

  it('VddOutput round-trips a delegation envelope', () => {
    // Unknown keys are stripped, not preserved — the zod 3 → 4 claim this file exists to pin.
    expect(VddOutput.parse({ success: true, extra: 1 })).toEqual({ success: true });
    const parsed = VddOutput.parse({
      success: true,
      persisted: false,
      mode: 'hosted-delegated',
      delegation: {
        id: 'd-1',
        goal: 'write vdd/vision.md',
        kind: 'write',
        promptTemplate: 'v1',
        requiredTools: ['write'],
        expectedReturn: { path: 'vdd/vision.md' },
        writeTargets: ['vdd/vision.md'],
        nextTool: 'vdd_validate',
      },
    });
    expect(parsed.delegation?.kind).toBe('write');
    expect(parsed.delegation?.writeTargets).toEqual(['vdd/vision.md']);
    // An unknown kind must be refused, not coerced.
    const bad = VddOutput.safeParse({
      success: true,
      delegation: {
        id: 'd-2',
        goal: 'x',
        kind: 'teleport',
        promptTemplate: 'v1',
        requiredTools: [],
        expectedReturn: {},
        nextTool: 'vdd_validate',
      },
    });
    expect(bad.success).toBe(false);
  });
});
