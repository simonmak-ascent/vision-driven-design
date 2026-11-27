import { describe, expect, it } from 'vitest';

import { callTool } from './harness.js';

/**
 * The whole chain, end to end, through the hosted handler — every artifact of
 * every phase, every tool.
 *
 * The point is coverage of the *surface*, not of one fixture: a tool that passes
 * its unit tests and drops the fourth argument at the boundary is exactly what an
 * end-to-end run catches.
 */

const VISION = `# vision.md

## §3 Vision, goal, objectives
- OBJ-001 — metric: activation · baseline → target: 10% → 25%
- OBJ-002 — metric: retention · baseline → target: 40% → 55%

## Chain projection
- V-001 → OBJ-001
- V-002 → OBJ-002
`;

const STRATEGY = `# strategy.md

> Impact Chain: V-001 → S-001

## S-001 Make the chain inspectable
- serves_goal: V-001

## S-002 Automate the gate
- serves_goal: V-002

## S-003 Shorten the loop
- serves_goal: V-002
`;

const TACTICS = `# tactics.md

> Impact Chain: V-001 → S-001 → A-001

## A-001
- serves_pillar: S-001
- priority: MUST

## A-002
- serves_pillar: S-002
- priority: MUST

## A-003
- serves_pillar: S-003
- priority: MUST
`;

const SPECS = `# SP-001: Login endpoint

> Impact Chain: V-002 → S-002 → A-002 → SP-002

- serves_action: A-001
- acceptance: AC-1

# SP-002: Gate report

- serves_action: A-002
- acceptance: AC-2

# SP-003: Loop timing

- serves_action: A-003
- acceptance: AC-3
`;

const PLAN = `# plan.md

> Impact Chain: V-002 → S-002 → A-002 → SP-002 → PL-002

## PL-001 Login handler
- serves_spec: SP-001

## PL-002 Report builder
- serves_spec: SP-002

## PL-003 Timer
- serves_spec: SP-003
`;

const TASKS = `# tasks.md

> Impact Chain: V-002 → S-002 → A-002 → SP-002 → PL-002 → TK-002

- [ ] **TK-001** implement the handler
  - serves_component: PL-001

- [ ] **TK-002** implement the report
  - serves_component: PL-002

- [ ] **TK-003** implement the timer
  - serves_component: PL-003
`;

const ARTIFACTS = { vision: VISION, strategy: STRATEGY, tactics: TACTICS, specs: SPECS, plan: PLAN, tasks: TASKS };

const COUNTS = { goals: 2, pillars: 3, actions: 3, specs: 3, components: 3, tasks: 3 };

describe('end-to-end chain', () => {
  it('passes every phase of a complete chain through vdd_check', async () => {
    const prior: Record<string, string> = {};

    for (const [phase, content] of Object.entries(ARTIFACTS)) {
      const { content: result } = await callTool('vdd_check', {
        phase,
        content,
        declaredCounts: COUNTS,
        priorArtifacts: prior,
      });

      expect(result.status, `${phase}: ${JSON.stringify(result.reasons)}`).toBe('PASS');
      expect(result.reasons).toEqual([]);
      prior[phase] = content;
    }
  });

  it('validates the same chain in one call, with a per-phase breakdown', async () => {
    const { content } = await callTool('vdd_chain_validate', { artifacts: ARTIFACTS, declaredCounts: COUNTS });

    expect(content.status, JSON.stringify(content.reasons)).toBe('PASS');
    expect(content.phases.map((entry: { phase: string }) => entry.phase)).toEqual([
      'vision',
      'strategy',
      'tactics',
      'specs',
      'plan',
      'tasks',
    ]);
    // Every goal reaches a task: the cross-phase check has nothing to report.
    expect(content.reasons).toEqual([]);
  });

  it('fails the chain when an artifact loses its parent link', async () => {
    const broken = { ...ARTIFACTS, tasks: TASKS.replace('- serves_component: PL-002', '- serves_component: PL-999') };
    const { content } = await callTool('vdd_chain_validate', { artifacts: broken, declaredCounts: COUNTS });

    expect(content.status).toBe('FAIL');
    expect(content.reasons.join('\n')).toMatch(/PL-002 has no task/);
    expect(content.reasons.join('\n')).toMatch(/TK-002 serves no known parent/);
  });

  // The cross-phase check is the one behaviour `vdd_chain_validate` adds over six
  // `vdd_check` calls, so it needs a case that fails on it alone: every phase
  // passes its own invariants, and a goal still reaches no task because the action
  // that carried it is COULD, which is not a spec parent.
  it('fails a chain whose every phase passes but a goal reaches no task', async () => {
    const tactics = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: COULD

## A-002
- serves_pillar: S-002
- priority: MUST

## A-003
- serves_pillar: S-003
- priority: SHOULD
`;
    const artifacts = {
      vision: VISION,
      strategy: STRATEGY,
      tactics,
      specs: '# SP-001: only spec\n\n- serves_action: A-002\n',
      plan: '# plan.md\n\n## PL-001 One\n- serves_spec: SP-001\n',
      tasks: '# tasks.md\n\n- [ ] **TK-001** do it\n  - serves_component: PL-001\n',
    };

    const { content } = await callTool('vdd_chain_validate', { artifacts });

    expect(content.status).toBe('FAIL');
    // The cross-phase rule is the only failure: A-003 is SHOULD, so it covers
    // S-003 without becoming a spec parent, and every phase passes on its own.
    expect(content.reasons).toEqual(['V-001 reaches no task']);
    expect(content.phases.every((entry: { status: string }) => entry.status === 'PASS')).toBe(true);
  });

  it('reports the downstream artifacts a removed pillar invalidates', async () => {
    const amended = STRATEGY.replace(/## S-002[\s\S]*?(?=## S-003)/, '');
    const { content } = await callTool('vdd_amend', {
      content: amended,
      priorArtifacts: ARTIFACTS,
      changeDescription: 'drop the S-002 pillar',
    });

    expect(content.phase).toBe('strategy');
    expect(content.changeDescription).toBe('drop the S-002 pillar');
    expect(content.impactedArtifacts.map((entry: { phase: string }) => entry.phase)).toEqual([
      'tactics',
      'specs',
      'plan',
      'tasks',
    ]);
  });

  it('fails the A-001-only artifact, which is the failure mode 2.0.0 exists for', async () => {
    const partial = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST
`;
    const { content } = await callTool('vdd_check', {
      phase: 'tactics',
      content: partial,
      priorArtifacts: { strategy: STRATEGY },
    });

    expect(content.status).toBe('FAIL');
    expect(content.coverage.matrix).toEqual({ 'S-001': ['A-001'], 'S-002': [], 'S-003': [] });
  });

  it('fails closed on the phase 2.0.0 cannot check', async () => {
    const { content } = await callTool('vdd_check', { phase: 'validate', content: '# impact report\n' });

    expect(content.status).toBe('FAIL');
    expect(content.reasons).toHaveLength(1);
    expect(content.reasons[0]).toContain('vdd_chain_validate');
  });
});
