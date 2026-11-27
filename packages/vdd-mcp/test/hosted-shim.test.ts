import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

/**
 * The deployed adapter, exercised directly. Every other surface test builds the
 * SDK handler itself; this one goes through `api/_vdd-rpc.cjs` — the file Vercel
 * loads — so the path that ships is the path that is tested.
 *
 * The shim itself needs no build: it requires the committed bundle. The
 * workspace build is a precondition of `hosted-bundle.test.ts`, whose `--check`
 * compares those committed bytes against a fresh build of `dist/`; that file
 * owns the packaging control.
 */
const require = createRequire(import.meta.url);
const { handleJsonRpc, isBrowser, SERVER_VERSION } = require('../../../api/_vdd-rpc.cjs');

const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'vdd-test', version: '0.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};
const MODERN = { 'mcp-protocol-version': '2026-07-28' };

describe('hosted CJS adapter', () => {
  it('answers tools/list with the three tools', async () => {
    const { status, body } = await handleJsonRpc(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: META } },
      { ...MODERN, 'mcp-method': 'tools/list' },
    );

    expect(status).toBe(200);
    expect(body.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual([
      'vdd_amend',
      'vdd_chain_validate',
      'vdd_check',
    ]);
  });

  it('carries Mcp-Name to tools/call, which the envelope requires', async () => {
    const { body } = await handleJsonRpc(
      {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'vdd_check',
          arguments: { phase: 'vision', content: '## Chain projection\n- V-001 → OBJ-001\n' },
          _meta: META,
        },
      },
      { ...MODERN, 'mcp-method': 'tools/call', 'mcp-name': 'vdd_check' },
    );

    expect(body.result.structuredContent.status).toBe('PASS');
  });

  it('sends a browser to the docs page and an MCP client to 405', () => {
    expect(isBrowser({ headers: { accept: 'text/html' } })).toBe(true);
    expect(isBrowser({ headers: { accept: 'application/json' } })).toBe(false);
  });

  it('names the same three tools the endpoint serves', async () => {
    const { html } = require('../../../api/_vdd-rpc.cjs');
    const { body } = await handleJsonRpc(
      { jsonrpc: '2.0', id: 5, method: 'tools/list', params: { _meta: META } },
      { ...MODERN, 'mcp-method': 'tools/list' },
    );

    // The page repeats the tool names for a human reader; this keeps the copy
    // from drifting away from the surface it describes.
    for (const tool of body.result.tools) expect(html).toContain(tool.name);
  });

  it('reports the MCP package version', () => {
    expect(SERVER_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
