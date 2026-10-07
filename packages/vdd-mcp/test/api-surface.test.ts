import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

import { PARAM_RELATIONSHIP_NOTES, PHASE_META, PHASE_NAMES } from '../../vdd-engine/src/meta.js';

// The Vercel handler is plain CommonJS at the repo root (not a workspace package).
const require = createRequire(import.meta.url);
const core = require('../../../api/_vdd-rpc.js') as {
  toolDefs: () => Array<{ name: string; title?: string; description: string; annotations?: Record<string, boolean> }>;
  handleJsonRpc: (msg: unknown) => { result?: { content: Array<{ text: string }> } } | null;
};

type ToolResult = {
  success: boolean;
  mode?: string;
  persisted?: boolean;
  delegation?: { id?: string; nextTool?: string; expectedReturn?: Record<string, unknown> };
  output?: {
    needsInput?: string[];
    clarificationCount?: number;
    items?: string[];
    writeTargets?: string[];
    [key: string]: unknown;
  };
};

const callTool = (name: string, args: Record<string, unknown> = {}): ToolResult => {
  const res = core.handleJsonRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args },
  });
  return JSON.parse(res!.result!.content[0].text) as ToolResult;
};

// MCP surface folds trace + analyze into `inspect`; e2e is CLI-only.
const MCP_PHASES = PHASE_NAMES.filter((name) => !['e2e', 'trace', 'analyze'].includes(name));

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

  it('annotates every hosted tool as read-only and not open-world (it delegates, never writes/fetches)', () => {
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint, tool.name).toBe(true);
      expect(tool.annotations?.destructiveHint, tool.name).not.toBe(true);
      expect(tool.annotations?.openWorldHint, tool.name).toBe(false);
    }
  });

  it('returns a delegation envelope (not a static string) for filesystem-dependent tools called without content', () => {
    const readTools = ['vdd_clarify', 'vdd_get_next_task', 'vdd_inspect', 'vdd_validate'];
    for (const name of readTools) {
      const result = callTool(name, name === 'vdd_clarify' || name === 'vdd_get_next_task' ? { feature: 'demo' } : {});
      expect(result.mode, name).toBe('hosted-delegated');
      expect(result.delegation?.nextTool, name).toBeTruthy();
    }
  });

  it('parses supplied artifactFiles instead of delegating', () => {
    const spec = ['# Demo', '', '## Acceptance Criteria', '', '### AC-1: Do a thing [MUST]', 'Given a', 'When b', 'Then c', '', '[NEEDS CLARIFICATION] Which scope?', '- [e.g., "example"]'].join('\n');
    const result = callTool('vdd_clarify', { feature: 'demo', artifactFiles: { 'vdd/specs/demo/spec.md': spec } });
    expect(result.mode).toBe('hosted-delegated');
    expect(result.output?.clarificationCount ?? 0).toBeGreaterThan(0);
  });

  it('marks artifact-producing tools persisted:false with writeTargets', () => {
    const result = callTool('vdd_init', {});
    expect(result.persisted).toBe(false);
    expect((result.output?.writeTargets ?? []).length).toBeGreaterThan(0);
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

  it('keeps server.json version in sync with the package', () => {
    const serverJson = require('../../../server.json') as { version: string };
    expect(serverJson.version).toBe(pkg.version);
  });
});

// Anti-drift guard: the hosted handler (api/_vdd-rpc.js) and the real engine
// (packages/vdd-engine) must agree when given the same supplied content. This is
// the exact failure mode of the original "hosted fork can't read fs" bug.
describe('engine ↔ hosted parity on supplied content', async () => {
  const { PHASES } = await import('../../vdd-engine/src/engine.js');
  const spec = [
    '# Demo', '', '## Acceptance Criteria', '',
    '### AC-1: Do a thing [MUST]', 'Given a', 'When b', 'Then c', '',
    '[NEEDS CLARIFICATION] Which scope?', '- [e.g., "example"]',
  ].join('\n');
  const tasks = [
    '# Tasks', '', '## Tasks', '',
    '- [x] **TASK-001** [S] done', '- [ ] **TASK-002** [M] next one', '- [ ] **TASK-003** [M] later',
  ].join('\n');
  const ctx = { projectRoot: '/tmp/vdd-parity-nonexistent', mode: 'auto' as const };

  it('clarify agrees on the number of unresolved items', async () => {
    const hosted = callTool('vdd_clarify', { feature: 'demo', artifactFiles: { 'vdd/specs/demo/spec.md': spec } });
    const engine = await PHASES.clarify(
      { feature: 'demo', artifactFiles: { 'vdd/specs/demo/spec.md': spec }, json: false },
      ctx,
    );
    expect(hosted.output?.clarificationCount).toBe((engine.output as { clarificationCount?: number } | undefined)?.clarificationCount);
  });

  it('get-next-task agrees on the next task line', async () => {
    const hosted = callTool('vdd_get_next_task', { feature: 'demo', artifactFiles: { 'vdd/specs/demo/tasks.md': tasks } });
    const engine = await PHASES['get-next-task'](
      { feature: 'demo', artifactFiles: { 'vdd/specs/demo/tasks.md': tasks }, json: false },
      ctx,
    );
    expect(hosted.artifact).toBe(engine.artifact);
    expect(hosted.artifact).toContain('TASK-002');
  });

  it('rejects traversal / out-of-allowlist artifactFiles keys', () => {
    const result = callTool('vdd_clarify', {
      feature: 'demo',
      artifactFiles: {
        '../../etc/passwd': 'x',
        '/abs/path': 'x',
        'vdd/specs/demo/spec.md': '[NEEDS CLARIFICATION] keep me',
      },
    });
    // Only the allowlisted key is accepted, so exactly one item is parsed.
    expect(result.output?.clarificationCount).toBe(1);
  });
});
