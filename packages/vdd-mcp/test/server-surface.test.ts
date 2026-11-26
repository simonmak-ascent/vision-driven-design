import { describe, expect, it } from 'vitest';

import { rpc } from './harness.js';

/**
 * 2.0.0 registers three tools and no prompts. A fourth tool — or a prompt left
 * behind — is the drift this case exists to catch, because the count is the only
 * thing a host uses to decide what to show.
 */
describe('server surface', () => {
  it('registers exactly the three judging tools', async () => {
    const { result, status } = await rpc('tools/list');

    expect(status).toBe(200);
    expect(result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      'vdd_amend',
      'vdd_chain_validate',
      'vdd_check',
    ]);
  });

  it('registers every tool as read-only and idempotent', async () => {
    const { result } = await rpc('tools/list');

    for (const tool of result.tools) {
      expect(tool.annotations, `${tool.name} has no annotations`).toBeTruthy();
      expect(tool.annotations.readOnlyHint).toBe(true);
      expect(tool.annotations.destructiveHint).toBe(false);
      expect(tool.annotations.idempotentHint).toBe(true);
    }
  });

  it('registers no prompts', async () => {
    const { result, status } = await rpc('prompts/list');

    expect(status).toBe(200);
    expect(result.prompts).toEqual([]);
  });
});
