import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { META, callTool, rpc } from './harness.js';

const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, import.meta.url));

/** The specification's §8 reference fixture: one action, three pillars. */
const A001_ONLY = `# tactics.md

## A-001
- serves_pillar: S-001
- priority: MUST
`;

const A001_DEDICATED = `${A001_ONLY}
## A-002
- serves_pillar: S-002
- priority: MUST

## A-003
- serves_pillar: S-003
- priority: SHOULD
`;

const STRATEGY = `# strategy.md

## S-001 First
- serves_goal: V-001

## S-002 Second
- serves_goal: V-002

## S-003 Third
- serves_goal: V-002
`;

const VISION = `# vision.md

## §3 Vision, goal, objectives
- OBJ-001 — metric: activation · baseline → target: 10% → 25%
- OBJ-002 — metric: retention · baseline → target: 40% → 55%

## Chain projection
- V-001 → OBJ-001
- V-002 → OBJ-002
`;

describe('api surface', () => {
  it('1 · server/discover advertises 2026-07-28 and the server info', async () => {
    const { result, status } = await rpc('server/discover');

    expect(status).toBe(200);
    expect(result.supportedVersions).toContain('2026-07-28');
    // Named, not truthy: `capabilities` is also satisfied by the empty prompts
    // capability the server declares, which is not what this criterion asks for.
    expect(result.capabilities.tools).toBeTruthy();
    expect(result.capabilities.extensions['io.modelcontextprotocol/skills']).toBeTruthy();
    expect(result._meta['io.modelcontextprotocol/serverInfo'].version).toBeTruthy();
  });

  it('2 · tools/list returns exactly three', async () => {
    const { result } = await rpc('tools/list');
    expect(result.tools).toHaveLength(3);
  });

  it('3 · the A-001-only artifact fails with the specification reasons', async () => {
    const { content } = await callTool('vdd_check', {
      phase: 'tactics',
      content: A001_ONLY,
      priorArtifacts: { strategy: STRATEGY },
    });

    expect(content.status).toBe('FAIL');
    expect(content.resultType).toBe('complete');
    expect(content.reasons).toEqual([
      'S-002 has no action item',
      'S-003 has no action item',
      'action_count=1 < pillar_count=3',
    ]);
    expect(content.coverage.matrix).toEqual({ 'S-001': ['A-001'], 'S-002': [], 'S-003': [] });
  });

  it('4 · dedicated chains pass', async () => {
    const { content } = await callTool('vdd_check', {
      phase: 'tactics',
      content: A001_DEDICATED,
      priorArtifacts: { strategy: STRATEGY },
    });

    expect(content.resultType).toBe('complete');
    expect(content.reasons).toEqual([]);
    expect(content.status).toBe('PASS');
  });

  it('5 · a declared count the text does not match fails', async () => {
    const { content } = await callTool('vdd_check', {
      phase: 'vision',
      content: VISION,
      declaredCounts: { goals: 3 },
    });

    expect(content.status).toBe('FAIL');
    expect(content.resultType).toBe('complete');
    expect(content.reasons).toEqual(['declared goals 3, actual 2']);
  });

  it('6 · skills/list returns nine skills and skills/get returns one with its body', async () => {
    const list = await rpc('skills/list', {}, { id: 2 });

    expect(list.result.resultType).toBe('complete');
    expect(list.result.skills).toHaveLength(9);
    for (const skill of list.result.skills) expect(skill.uri).toMatch(/^skill:\/\/vdd-[a-z]+\/SKILL\.md$/);

    const one = await rpc('skills/get', { uri: 'skill://vdd-tactics/SKILL.md' }, { id: 3 });
    expect(one.result.skill.frontmatter.name).toBe('vdd-tactics');
    expect(one.result.skill.frontmatter.description.length).toBeGreaterThan(0);

    // v18's wire control. `skills/get` returns no body — only the entry, with each
    // file's server-computed digest and size (`buildSkillEntry`) — so the byte size
    // is what proves the served `vdd-vision/SKILL.md` is the file on disk.
    const vision = await rpc('skills/get', { uri: 'skill://vdd-vision/SKILL.md' }, { id: 4 });
    const resource = vision.result.skill.resources.find(
      (entry: { uri: string }) => entry.uri === 'skill://vdd-vision/SKILL.md',
    );
    expect(resource, 'vdd-vision/SKILL.md is not in resources').toBeTruthy();
    expect(resource.size).toBe(readFileSync(repo('skills/vdd-vision/SKILL.md')).length);

    // No negotiation: the methods answer a 2025-era client that sends no envelope
    // at all, because SEP-2640 governs whether a host uses the extension, not
    // whether the methods exist.
    const legacy = await rpc('skills/list', {}, { legacy: true });
    expect(legacy.result.skills).toHaveLength(9);
  });

  it('7 · a stray session id is ignored and never echoed', async () => {
    const response = await rpc('tools/list', {}, { headers: { 'mcp-session-id': 'stray' } });

    expect(response.status).toBe(200);
    expect(response.headers['mcp-session-id']).toBeUndefined();
  });

  it('8a · an unknown protocol version is refused with -32022', async () => {
    const unsupported = { ...META, 'io.modelcontextprotocol/protocolVersion': '2099-01-01' };
    const response = await rpc('tools/list', {}, {
      meta: unsupported,
      headers: { 'mcp-protocol-version': '2099-01-01' },
    });

    expect(response.status).toBe(400);
    expect(response.error?.code).toBe(-32022);
    expect((response.error?.data as { supported: string[] }).supported).toContain('2026-07-28');
  });

  it('8b · a known-but-old version header is refused with 400', async () => {
    const response = await rpc('tools/list', {}, { headers: { 'mcp-protocol-version': '2025-06-18' } });

    expect(response.status).toBe(400);
    expect(response.error?.message).toMatch(/disagree|version/i);
  });

  it('9 · every tool result carries coverage.matrix and resultType', async () => {
    for (const [name, args] of [
      ['vdd_check', { phase: 'vision', content: VISION }],
      ['vdd_chain_validate', { artifacts: { vision: VISION } }],
      ['vdd_amend', { content: VISION, priorArtifacts: {} }],
    ] as const) {
      const response = await callTool(name, args as Record<string, unknown>);
      expect(response.content.resultType, `${name} carries no resultType`).toBe('complete');
      expect(response.content.coverage.matrix, `${name} carries no matrix`).toBeDefined();
    }
  });

  it('10 · prompts/list is empty on the hosted surface', async () => {
    const { result } = await rpc('prompts/list');
    expect(result.prompts).toEqual([]);
  });

  it('11 · the eight version values are the MCP package version', () => {
    const mcp = JSON.parse(readFileSync(repo('packages/vdd-mcp/package.json'), 'utf8')).version;
    const engine = JSON.parse(readFileSync(repo('packages/vdd-engine/package.json'), 'utf8')).version;
    const cli = JSON.parse(readFileSync(repo('packages/vdd-cli/package.json'), 'utf8')).version;
    const server = JSON.parse(readFileSync(repo('server.json'), 'utf8'));

    const shim = /SERVER_VERSION = '([^']+)'/.exec(readFileSync(repo('api/_vdd-rpc.cjs'), 'utf8'))?.[1];
    const serverTs = /VDD_VERSION = '([^']+)'/.exec(readFileSync(repo('packages/vdd-mcp/src/server.ts'), 'utf8'))?.[1];
    const cliTs = /\.version\('([^']+)'\)/.exec(readFileSync(repo('packages/vdd-cli/src/cli.ts'), 'utf8'))?.[1];

    expect({
      mcp,
      engine,
      cli,
      serverJson: server.version,
      serverJsonPackage: server.packages?.[0]?.version,
      shim,
      serverTs,
      cliTs,
    }).toEqual(Object.fromEntries(['mcp', 'engine', 'cli', 'serverJson', 'serverJsonPackage', 'shim', 'serverTs', 'cliTs'].map((k) => [k, mcp])));
  });
});
