import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { PHASE_META, PHASE_NAMES } from '../../vdd-engine/src/meta.js';

// The Vercel handler is plain CommonJS at the repo root (not a workspace package).
const require = createRequire(import.meta.url);
const core = require('../../../api/_vdd-rpc.js') as {
  toolDefs: () => Array<{ name: string; title?: string; description: string; annotations?: Record<string, boolean> }>;
};

const DESTRUCTIVE = ['init', 'vision', 'strategize', 'tactics', 'specify', 'plan', 'tasks', 'clone'];
const PHASE_NAMES_NO_E2E = PHASE_NAMES.filter((name) => name !== 'e2e');
const OPEN_WORLD = ['strategize', 'clone'];

const phaseOf = (name: string) => name.replace(/^vdd_/, '').replace(/_/g, '-');
const toolName = (phase: string) => `vdd_${phase.replace(/-/g, '_')}`;

describe('hosted MCP tool surface (api/_vdd-rpc.js)', () => {
  const tools = core.toolDefs();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  it('exposes 16 tools', () => {
    expect(tools).toHaveLength(16);
  });

  it('has a title and annotations for every tool', () => {
    for (const tool of tools) {
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.annotations, tool.name).toBeTruthy();
    }
  });

  it('classifies destructive writers vs read-only tools', () => {
    for (const phase of DESTRUCTIVE) {
      expect(byName.get(toolName(phase))?.annotations?.destructiveHint, phase).toBe(true);
      expect(byName.get(toolName(phase))?.annotations?.readOnlyHint, phase).toBeUndefined();
    }
    expect(byName.get(toolName('clarify'))?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get(toolName('implement'))?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get(toolName('amend'))?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get(toolName('validate'))?.annotations?.destructiveHint).toBe(false);
  });

  it('marks openWorldHint on every tool, true only for strategize and clone', () => {
    for (const tool of tools) {
      expect(typeof tool.annotations?.openWorldHint, tool.name).toBe('boolean');
      expect(tool.annotations?.openWorldHint, tool.name).toBe(OPEN_WORLD.includes(phaseOf(tool.name)));
    }
  });

  it('keeps every description in sync with the engine PHASE_META', () => {
    const phases = new Set<string>(PHASE_NAMES_NO_E2E);
    for (const tool of tools) {
      const phase = phaseOf(tool.name);
      expect(phases.has(phase), tool.name).toBe(true);
      expect(tool.description, tool.name).toBe(PHASE_META[phase as keyof typeof PHASE_META].description);
    }
  });
});
