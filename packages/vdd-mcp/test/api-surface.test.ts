import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { PARAM_RELATIONSHIP_NOTES, PHASE_META, PHASE_NAMES } from '../../vdd-engine/src/meta.js';

// The Vercel handler is plain CommonJS at the repo root (not a workspace package).
const require = createRequire(import.meta.url);
const core = require('../../../api/_vdd-rpc.js') as {
  toolDefs: () => Array<{ name: string; title?: string; description: string; annotations?: Record<string, boolean> }>;
  handleJsonRpc: (msg: unknown) => { result?: { content: Array<{ text: string }> } } | null;
};

const callTool = (name: string, args: Record<string, unknown> = {}) => {
  const res = core.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  return JSON.parse(res!.result!.content[0].text) as { success: boolean; output?: { needsInput?: string[] } };
};

const DESTRUCTIVE = ['init', 'vision', 'strategize', 'tactics', 'specify', 'plan', 'tasks', 'clone'];
// MCP surface folds trace + analyze into `inspect`; e2e is CLI-only.
const MCP_PHASES = PHASE_NAMES.filter((name) => !['e2e', 'trace', 'analyze'].includes(name));
const OPEN_WORLD = ['strategize', 'clone'];

const phaseOf = (name: string) => name.replace(/^vdd_/, '').replace(/_/g, '-');
const toolName = (phase: string) => `vdd_${phase.replace(/-/g, '_')}`;

describe('hosted MCP tool surface (api/_vdd-rpc.js)', () => {
  const tools = core.toolDefs();
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  it('exposes 15 tools', () => {
    expect(tools).toHaveLength(15);
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
    expect(byName.get(toolName('inspect'))?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get(toolName('validate'))?.annotations?.destructiveHint).toBe(false);
  });

  it('marks openWorldHint on every tool, true only for strategize and clone', () => {
    for (const tool of tools) {
      expect(typeof tool.annotations?.openWorldHint, tool.name).toBe('boolean');
      expect(tool.annotations?.openWorldHint, tool.name).toBe(OPEN_WORLD.includes(phaseOf(tool.name)));
    }
  });

  it('returns actionable success (not a hard error) when a tool is called with no arguments', () => {
    const selectorTools = new Set([
      'vdd_vision',
      'vdd_specify',
      'vdd_clarify',
      'vdd_plan',
      'vdd_tasks',
      'vdd_get_next_task',
      'vdd_implement',
      'vdd_amend',
    ]);
    for (const tool of tools) {
      const result = callTool(tool.name);
      expect(result.success, tool.name).toBe(true);
      if (selectorTools.has(tool.name)) {
        expect(result.output?.needsInput?.length ?? 0, tool.name).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every description in sync with the engine PHASE_META', () => {
    const phases = new Set<string>(MCP_PHASES);
    for (const tool of tools) {
      const phase = phaseOf(tool.name);
      expect(phases.has(phase), tool.name).toBe(true);
      expect(tool.description, tool.name).toBe(
        PHASE_META[phase as keyof typeof PHASE_META].description +
          (PARAM_RELATIONSHIP_NOTES[phase as keyof typeof PARAM_RELATIONSHIP_NOTES] ?? ''),
      );
    }
  });
});

describe('hosted ↔ stdio parity (schemas, prompts, version)', async () => {
  const { z } = await import('zod');
  const { PHASE_INPUT_SCHEMAS } = await import('../src/server.js');
  const { PROMPTS } = await import('../src/prompts.js');
  const pkg = require('../package.json') as { version: string };
  const hosted = require('../../../api/_vdd-rpc.js') as {
    toolDefs: () => Array<{ name: string; inputSchema: { properties: Record<string, unknown>; required?: string[] }; outputSchema?: unknown }>;
    handleJsonRpc: (msg: unknown) => { result?: Record<string, any>; error?: { code: number } } | null;
    listPrompts: () => Array<{ name: string; arguments: Array<{ name: string; required: boolean }> }>;
    getPrompt: (name: string, args: Record<string, string>) => { messages: Array<{ content: { text: string } }> };
    SERVER_VERSION: string;
  };
  const rpc = (method: string, params: Record<string, unknown> = {}) =>
    hosted.handleJsonRpc({ jsonrpc: '2.0', id: 1, method, params });

  it('advertises the same per-tool parameters and required fields as the stdio server', () => {
    for (const tool of hosted.toolDefs()) {
      const shape = PHASE_INPUT_SCHEMAS[phaseOf(tool.name)];
      expect(Object.keys(tool.inputSchema.properties).sort(), tool.name).toEqual(Object.keys(shape).sort());
      const json = z.toJSONSchema(z.object(shape), { io: 'input' }) as { required?: string[] };
      expect((tool.inputSchema.required ?? []).sort(), tool.name).toEqual((json.required ?? []).sort());
      expect(tool.outputSchema, tool.name).toBeTruthy();
    }
  });

  it('returns structuredContent tagged with the phase', () => {
    const res = rpc('tools/call', { name: 'vdd_inspect', arguments: {} });
    expect(res?.result?.structuredContent?._phase).toBe('inspect');
    expect(res?.result?.structuredContent?.success).toBe(true);
  });

  it('serves the same prompts as the stdio server', () => {
    expect(hosted.listPrompts().map((p) => p.name)).toEqual(PROMPTS.map((p) => p.name));
    for (const prompt of PROMPTS) {
      const args = Object.fromEntries(prompt.arguments.map((a) => [a.name, 'example']));
      expect(hosted.getPrompt(prompt.name, args).messages[0].content.text, prompt.name).toBe(prompt.text(args));
    }
    expect(rpc('prompts/get', { name: 'implement_next_task', arguments: {} })?.error?.code).toBe(-32602);
  });

  it('answers ping and empty resource lists instead of method-not-found', () => {
    expect(rpc('ping')?.result).toEqual({});
    expect(rpc('resources/list')?.result?.resources).toEqual([]);
  });

  it('reports the package version in serverInfo', () => {
    expect(hosted.SERVER_VERSION).toBe(pkg.version);
    expect(rpc('initialize')?.result?.serverInfo?.version).toBe(pkg.version);
  });
});
