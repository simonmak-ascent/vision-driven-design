import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { PHASE_CONFIG, amendImpact, opensBlocks, runPhaseCheck } from '../src/coverage.js';

/**
 * The specification's §8 reference fixture, reproduced exactly: `vdd_check` is
 * called with `{phase:"tactics", content}` and **no `declaredCounts`**, so every
 * reason below is derived from text — 1 action in `content`, 3 pillars in
 * `priorArtifacts.strategy`.
 */
const A001_ONLY = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST
- description: Build login endpoint
`;

const A001_WITH_SIBLINGS = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST
- description: Build login endpoint

## A-002
- serves_pillar: S-002
- priority: MUST
- description: Add session revocation

## A-003
- serves_pillar: S-003
- priority: SHOULD
- description: Emit audit events
`;

const VISION = `# vision.md

## V-001 Reduce review time
## V-002 Raise change confidence
`;

const STRATEGY_THREE = `# strategy.md

## S-001 Make the chain inspectable
- serves_goal: V-001

## S-002 Automate the gate
- serves_goal: V-002

## S-003 Shorten the loop
- serves_goal: V-002
`;

/** One pillar serving two goals — no goal has a pillar of its own. */
const SHARED_PILLAR = `# strategy.md

## S-001 Both goals at once
- serves_goal: V-001
- serves_goal: V-002
`;

describe('coverage engine', () => {
  // §11.1 item 1 — the fixture the engine must fail before it is trusted.
  it('fails the A-001-only artifact with exactly the spec reasons', () => {
    const result = runPhaseCheck('tactics', A001_ONLY, undefined, { strategy: STRATEGY_THREE });

    expect(result.status).toBe('FAIL');
    expect(result.reasons).toEqual([
      'S-002 has no action item',
      'S-003 has no action item',
      'action_count=1 < pillar_count=3',
    ]);
    expect(result.coverage.forward_covered).toEqual(['S-001']);
    expect(result.coverage.dedicated).toEqual(['S-001']);
    expect(result.coverage.backward_sound).toEqual(['A-001']);
    expect(result.coverage.matrix).toEqual({ 'S-001': ['A-001'], 'S-002': [], 'S-003': [] });
    expect(result.declared_counts).toBeNull();
    expect(result.actual_counts).toEqual({ actions: 1, pillars: 3 });
  });

  // §11.1 item 2 — a child two parents share leaves neither dedicated.
  it('fails when the only child serves two parents', () => {
    const result = runPhaseCheck('strategy', SHARED_PILLAR, undefined, { vision: VISION });

    expect(result.status).toBe('FAIL');
    expect(result.coverage.dedicated).toEqual([]);
    expect(result.coverage.forward_covered).toEqual(['V-001', 'V-002']);
    expect(result.reasons).toEqual(['V-001 has no dedicated pillar', 'V-002 has no dedicated pillar']);
  });

  // §11.1 item 3 — the passing fixture of the spec's §8.
  it('passes a chain with one dedicated child per parent', () => {
    const result = runPhaseCheck('tactics', A001_WITH_SIBLINGS, undefined, { strategy: STRATEGY_THREE });

    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
    expect(result.coverage.dedicated).toEqual(['S-001', 'S-002', 'S-003']);
    expect(result.coverage.backward_sound).toEqual(['A-001', 'A-002', 'A-003']);
  });

  // §11.1 item 4(a) — per key, declared against actual.
  it('fails a declared count that the text does not match', () => {
    const result = runPhaseCheck('vision', VISION, { goals: 3 });

    expect(result.status).toBe('FAIL');
    expect(result.reasons).toEqual(['declared goals 3, actual 2']);
    expect(result.actual_counts).toEqual({ goals: 2 });
  });

  // §11.1 item 4(a) — a key the phase does not consume is not checked.
  it('ignores a declared key the phase does not consume', () => {
    const result = runPhaseCheck('vision', VISION, { goals: 2, tasks: 99 });

    expect(result.reasons).toEqual([]);
    expect(result.status).toBe('PASS');
  });

  // §11.1 item 4(a) — the specs junction binds to MUST actions only.
  it('counts only MUST actions as spec parents', () => {
    const tactics = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST

## A-002
- serves_pillar: S-001
- priority: SHOULD
`;
    const spec = `# spec.md

## SP-001
- serves_action: A-001
`;
    const result = runPhaseCheck('specs', spec, undefined, { tactics });

    expect(result.coverage.matrix).toEqual({ 'A-001': ['SP-001'] });
    expect(result.status).toBe('PASS');
  });

  // The tactics template carries the priority as a column, not a `priority:` line.
  // A line-only marker leaves the parent set empty, and an empty parent set makes
  // invariant A report nothing — a PASS over no rows.
  it('binds a MUST cell in the tactics table as a spec parent', () => {
    const tactics = `# tactics.md

| ID | Action Item | Priority | Strategy Pillar |
|----|-------------|----------|-----------------|
| A-001 | Login | MUST | Pillar 1 |
| A-002 | Audit | SHOULD | Pillar 1 |
`;
    const spec = `# spec.md

## SP-001
- serves_action: A-001
`;
    expect(runPhaseCheck('specs', spec, undefined, { tactics }).coverage.matrix).toEqual({ 'A-001': ['SP-001'] });
    expect(runPhaseCheck('specs', '', undefined, { tactics }).status).toBe('FAIL');
  });

  // The shipped template keeps its Infrastructure Requirements table after the
  // action table, and the last action's block runs to EOF. A cell matched
  // anywhere in a block therefore promotes the COULD action A-004 to a MUST
  // parent: a false "A-004 has no spec", and a spec serving A-004 accepted as if
  // A-004 were MUST.
  it('does not read a trailing table cell as the last action priority', () => {
    const tactics = `# tactics.md

| ID | Action Item | Priority | Strategy Pillar |
|----|-------------|----------|-----------------|
| A-001 | Login | MUST | Pillar 1 |
| A-002 | Session revocation | MUST | Pillar 1 |
| A-004 | Export to CSV | COULD | Pillar 2 |

## Infrastructure Requirements

| Requirement | Domain | Priority | Notes |
|-------------|--------|----------|-------|
| CI pipeline | Infrastructure | MUST | GitHub Actions |
`;
    const spec = `# spec.md

## SP-001
- serves_action: A-001

## SP-002
- serves_action: A-002

## SP-004
- serves_action: A-004
`;
    const result = runPhaseCheck('specs', spec, undefined, { tactics });

    expect(Object.keys(result.coverage.matrix)).toEqual(['A-001', 'A-002']);
    expect(result.reasons).toContain('SP-004 serves no known parent');
  });

  // §1 invariant B — a child that names no known parent is an orphan, and the
  // engine must say so. Without this case, deleting the B loop changes nothing.
  it('fails a child that serves a parent the prior artifact does not have', () => {
    const content = A001_WITH_SIBLINGS.replace('- serves_pillar: S-003', '- serves_pillar: S-999');
    const result = runPhaseCheck('tactics', content, undefined, { strategy: STRATEGY_THREE });

    expect(result.status).toBe('FAIL');
    expect(result.reasons).toContain('A-003 serves no known parent');
    expect(result.reasons).toContain('S-003 has no action item');
    expect(result.coverage.backward_sound).toEqual(['A-001', 'A-002']);
  });

  // The specs junction's count rule is `specs == count(SP blocks)`. The
  // filtered parent set is not the population `declaredCounts.actions`
  // describes, so a declared `actions` is not compared on a specs call.
  it('does not compare declared actions against the MUST-filtered parent set', () => {
    const tactics = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST

## A-002
- serves_pillar: S-001
- priority: SHOULD
`;
    const spec = `# spec.md

## SP-001
- serves_action: A-001
`;
    expect(runPhaseCheck('specs', spec, { specs: 1, actions: 2 }, { tactics }).reasons).toEqual([]);
    expect(runPhaseCheck('specs', spec, { specs: 2 }, { tactics }).reasons).toEqual([
      'declared specs 2, actual 1',
    ]);
    expect(runPhaseCheck('specs', spec, undefined, { tactics }).actual_counts).toEqual({ specs: 1 });
  });

  // A validation report is not a junction: 2.0.0 takes no commit input, so the
  // call fails closed instead of passing over nothing.
  it('fails closed on the phase 2.0.0 cannot check', () => {
    const result = runPhaseCheck('validate', '## TK-001\n- serves_component: PL-001\n', undefined, {
      vision: VISION,
    });

    expect(result.status).toBe('FAIL');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0]).toContain('vdd_chain_validate');
  });

  // §11.1 item 5 — a removed id names the phases that still reference it. The
  // stale `Impact Chain` header still names S-002 after its section is deleted,
  // which is the normal edit and the one a mention-counting diff cannot see.
  it('reports the downstream phases a removed id invalidates', () => {
    const header = '> Impact Chain: V-001 → S-001 → S-002 → S-003\n\n';
    const before = header + STRATEGY_THREE;
    const after = header + STRATEGY_THREE.replace(/## S-002[\s\S]*?(?=## S-003)/, '');

    const impacted = amendImpact('strategy', after, {
      strategy: before,
      tactics: '## A-002\n- serves_pillar: S-002\n',
      specs: '## SP-002\n- serves_action: A-002\n- impact: S-002\n',
      plan: '## PL-002\n- serves_spec: SP-002\n- note: S-002\n',
      tasks: '## TK-002\n- serves_component: PL-002\n- note: S-002\n',
      vision: VISION,
    });

    expect(impacted.map((entry) => entry.phase)).toEqual(['tactics', 'specs', 'plan', 'tasks']);
    expect(impacted[0].reason).toBe('references removed S-002');
  });

  // The boundary the per-revision fallback missed: when the amendment removes the
  // last section, the after-side has no block-opening id and would otherwise read
  // the stale header and report that nothing was removed.
  it('reports a removed section when the artifact keeps no block-opening id', () => {
    const header = '> Impact Chain: V-001 → S-001 → S-002\n\n';
    const before = header + '## S-002 Automate the gate\n- serves_goal: V-002\n';

    const impacted = amendImpact('strategy', header, {
      strategy: before,
      tactics: '## A-002\n- serves_pillar: S-002\n',
    });

    expect(impacted.map((entry) => entry.phase)).toEqual(['tactics']);
  });

  // The checkbox clause in `blockStart` is what lets a tasks artifact open one
  // block per item. A plain (unbolded) id is the discriminating fixture: the
  // bold form would open a block through the furniture class alone, and a
  // markdown link is the mention the clause must not admit.
  it('reads a checkbox item as a block start and a markdown link as a mention', () => {
    expect(opensBlocks('- [ ] TK-001 plain task\n  - serves_component: PL-001\n', 'tasks')).toBe(true);
    expect(opensBlocks('- [V-001](vdd/vision.md)\n', 'vision')).toBe(false);
  });

  // A parentless phase has no invariant that can fail, so an artifact declaring no
  // id would pass by having nothing to check. Vision is the only phase this
  // applies to — the constitution's children are prose names — and the guard must
  // not fire on a template that lists `- V-### → OBJ-###`.
  it('fails a vision artifact that declares no V-### id', () => {
    const empty = runPhaseCheck('vision', '# vision.md\n\n## Purpose\nProse only.\n');
    expect(empty.status).toBe('FAIL');
    expect(empty.reasons).toEqual(['vision declares no V-### id']);

    const template = runPhaseCheck('vision', '# vision.md\n\n## Chain projection\n- V-001 → OBJ-001\n');
    expect(template.status).toBe('PASS');
  });

  it('reports no impact when nothing was removed', () => {
    expect(amendImpact('strategy', STRATEGY_THREE, { strategy: STRATEGY_THREE, tactics: 'S-002' })).toEqual([]);
  });

});
