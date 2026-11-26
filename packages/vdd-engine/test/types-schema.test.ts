/**
 * Contract test for the engine's published schema surface.
 *
 * This file imports ONLY from `../src/index.js` — the `main`/`types` entry — so
 * what it pins is what a consumer of `@simonmak-ascent/engine` actually receives.
 * Every other engine test imports `../src/coverage.js` directly, which would keep
 * passing if `src/index.ts` lost a re-export. That divergence is deliberate.
 *
 * 2.0.0 replaced the generation types with the verdict: `Coverage`,
 * `CheckResult`, `ImpactedArtifact`.
 */
import { describe, expect, it } from 'vitest';

import { CheckResult, Coverage, ImpactedArtifact, PHASE_CONFIG, runPhaseCheck } from '../src/index.js';

describe('published schema surface', () => {
  it('Coverage requires all four members', () => {
    expect(Coverage.safeParse({}).success).toBe(false);
    expect(
      Coverage.parse({ forward_covered: [], backward_sound: [], dedicated: [], matrix: {} }),
    ).toEqual({ forward_covered: [], backward_sound: [], dedicated: [], matrix: {} });
  });

  it('CheckResult accepts a real engine result and refuses missing coverage or matrix', () => {
    const result = runPhaseCheck('vision', '## Chain projection\n- V-001 → OBJ-001\n');
    expect(CheckResult.parse(result).status).toBe('PASS');

    const { coverage: _dropped, ...withoutCoverage } = result;
    expect(CheckResult.safeParse(withoutCoverage).success).toBe(false);

    // The matrix is the field this release publishes; removing it must fail on
    // its own, not because a sibling member went with it.
    const { matrix: _matrix, ...coverageWithoutMatrix } = result.coverage;
    expect(CheckResult.safeParse({ ...result, coverage: coverageWithoutMatrix }).success).toBe(false);
  });

  it('CheckResult refuses a status outside PASS / FAIL', () => {
    const result = runPhaseCheck('vision', '## Chain projection\n- V-001 → OBJ-001\n');
    expect(CheckResult.safeParse({ ...result, status: 'MAYBE' }).success).toBe(false);
  });

  it('ImpactedArtifact names a phase and a reason', () => {
    expect(ImpactedArtifact.parse({ phase: 'tactics', reason: 'references removed S-002' }).phase).toBe('tactics');
    expect(ImpactedArtifact.safeParse({ phase: 'tactics' }).success).toBe(false);
  });

  it('PHASE_CONFIG is the published phase table', () => {
    expect(Object.keys(PHASE_CONFIG)).toEqual([
      'constitution',
      'vision',
      'strategy',
      'tactics',
      'specs',
      'plan',
      'tasks',
      'validate',
    ]);
    expect(PHASE_CONFIG.tactics.servesField).toBe('serves_pillar');
  });
});
