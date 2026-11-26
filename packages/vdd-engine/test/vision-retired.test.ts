/**
 * Red-first fixture for the 1.11.0 Vision removal.
 *
 * Every assertion below fails against today's tree and must pass once the
 * vision phase stops being executable and the artifact becomes skill-authored.
 * The five red cases carry `it.skip` (see the plan, task 2) so a deliberately-red
 * suite cannot block its own commit; task 5 removes the skip. The legacy-heading
 * case is *not* skipped: it passes today and stays the backwards-compatibility
 * control, so CI exercises it from the moment this file lands.
 *
 * Remove the five `it.skip` markers to see the red:
 *   pnpm --filter @simonmak-ascent/engine exec vitest run vision-retired
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { PHASES } from '../src/engine.js';
import { PHASE_NAMES } from '../src/meta.js';
import type { VddContext } from '../src/types.js';

async function put(root: string, rel: string, body: string): Promise<void> {
  const path = join(root, rel);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}

const ctxFor = (projectRoot: string): VddContext => ({ projectRoot, mode: 'auto' });

describe('vision retirement', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'vdd-vision-retired-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it.skip('e2e produces no vdd/vision.md — the artifact is skill-authored', async () => {
    const res = await PHASES.e2e({ statement: 'a chain for the fixture' }, ctxFor(root));
    // A chain that errors before or around the vision phase would also leave
    // vision.md absent; the run has to succeed for the absence to mean anything.
    expect(res.success).toBe(true);
    const files = (res.output?.files as string[] | undefined) ?? [];
    // The assert that matters: nothing in the run wrote the vision artifact.
    expect(files.filter((f) => f.endsWith('/vdd/vision.md'))).toEqual([]);
  });

  it.skip('local validate fails without the artifact and names the skill procedure', async () => {
    const res = await PHASES.validate({ json: false }, ctxFor(root));
    expect(res.success).toBe(true);
    expect(res.gateResult?.passed).toBe(false);

    const report = await readFile(join(root, 'vdd/impact-report.generated.md'), 'utf-8');
    const decision = report.split('\n').find((l) => l.includes('Release Readiness')) ?? '';
    // Today this line lists uncovered artifacts and names no procedure.
    expect(decision).toMatch(/skill/i);
  });

  it.skip('strategize resolves a primer from the §4.4 domain block', async () => {
    await put(
      root,
      'vdd/vision.md',
      '# Vision\n\n> Impact Chain: V-001\n\n### 4.4 Target Domains\n\n- [x] WebApp\n- [ ] Data Storage\n',
    );
    await PHASES.strategize({ json: false }, ctxFor(root));
    const strategy = await readFile(join(root, 'vdd/strategy.md'), 'utf-8');
    // readTargetDomains only understands `## Target Domains` today, so this is red.
    expect(strategy).toMatch(/webapp/i);
    // The unchecked line must not resolve either: a section-wide `[x]` test
    // (engine.ts:206) satisfies the assertion above and is the A3 defect this
    // fixture exists for. Without this line a heading-only fix passes.
    expect(strategy).not.toMatch(/data-storage\.md/i);
    expect(strategy).not.toMatch(/no domain primers resolved/i);
  });

  it('strategize still resolves a primer from the legacy heading', async () => {
    // The `## Target Domains` regex terminates on a following `## ` heading
    // (`\z` in that pattern is a literal 'z', not end-of-input), so this fixture
    // carries one: that is what a real vision.md looks like, and it is what makes
    // this case a backwards-compatibility control rather than a second red.
    await put(
      root,
      'vdd/vision.md',
      '# Vision\n\n> Impact Chain: V-001\n\n## Target Domains\n\n- [x] WebApp\n\n## Success Metrics\n\n[metrics]\n',
    );
    await PHASES.strategize({ json: false }, ctxFor(root));
    const strategy = await readFile(join(root, 'vdd/strategy.md'), 'utf-8');
    expect(strategy).toMatch(/webapp/i);
  });

  it.skip('e2e reports 91 checks across six bi-directional gates on the engine surface', async () => {
    const res = await PHASES.e2e({ statement: 'a chain for the fixture' }, ctxFor(root));
    const gates = res.output?.gates as
      | {
          summary?: { checksTotal?: number };
          results?: Array<{ gate: string; forward: string; backward: string; assumptions: string }>;
        }
      | undefined;
    // 108 today (G1 = 14 checks + three G7 vision predicates).
    expect(gates?.summary?.checksTotal).toBe(91);

    const counted = (gates?.results ?? []).filter((g) => g.gate !== 'G0');
    expect(counted).toHaveLength(6);

    // Per-gate totals too: a mis-split that still sums to 91 must name the gate
    // that is wrong, not just report a total nobody can attribute.
    const totals = Object.fromEntries(
      counted.map((g) => [
        g.gate,
        [g.forward, g.backward, g.assumptions].map((s) => s.split('/')[1]).join('|'),
      ]),
    );
    expect(totals).toEqual({
      G2: '4|5|4',
      G3: '10|4|4',
      G4: '7|6|4',
      G5: '6|6|4',
      G6: '4|7|4',
      G7: '5|3|4',
    });
  });

  it.skip('the vision phase and its registration are gone', () => {
    expect(Object.keys(PHASES)).not.toContain('vision');
    expect(PHASE_NAMES).not.toContain('vision');
    expect(PHASE_NAMES).toHaveLength(16);
  });
});
