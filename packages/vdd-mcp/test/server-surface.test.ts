import { describe, expect, it } from 'vitest';

import { MCP_TOOL_PHASES, TOOL_ANNOTATIONS } from '../src/server.js';

const DESTRUCTIVE = ['init', 'vision', 'strategize', 'tactics', 'specify', 'plan', 'tasks', 'clone'];
const READ_ONLY = ['clarify', 'get-next-task', 'implement', 'trace', 'analyze', 'amend', 'detect-environment'];
const OPEN_WORLD = ['strategize', 'clone'];

describe('MCP server tool metadata (stdio + Streamable HTTP)', () => {
  it('exposes 16 tools (e2e excluded)', () => {
    expect(MCP_TOOL_PHASES).toHaveLength(16);
  });

  it('has a title and annotations for every tool', () => {
    for (const phase of MCP_TOOL_PHASES) {
      const meta = TOOL_ANNOTATIONS[phase];
      expect(meta, phase).toBeTruthy();
      expect(meta.title, phase).toBeTruthy();
      expect(meta.annotations, phase).toBeTruthy();
    }
  });

  it('classifies destructive writers vs read-only tools', () => {
    for (const phase of DESTRUCTIVE) {
      expect(TOOL_ANNOTATIONS[phase].annotations.destructiveHint, phase).toBe(true);
      expect(TOOL_ANNOTATIONS[phase].annotations.readOnlyHint, phase).toBeUndefined();
    }
    for (const phase of READ_ONLY) {
      expect(TOOL_ANNOTATIONS[phase].annotations.readOnlyHint, phase).toBe(true);
      expect(TOOL_ANNOTATIONS[phase].annotations.destructiveHint, phase).not.toBe(true);
    }
    expect(TOOL_ANNOTATIONS.validate.annotations.destructiveHint).toBe(false);
  });

  it('marks openWorldHint on every tool, true only for strategize and clone', () => {
    for (const phase of MCP_TOOL_PHASES) {
      const openWorld = TOOL_ANNOTATIONS[phase].annotations.openWorldHint;
      expect(typeof openWorld, phase).toBe('boolean');
      expect(openWorld, phase).toBe(OPEN_WORLD.includes(phase));
    }
  });
});
