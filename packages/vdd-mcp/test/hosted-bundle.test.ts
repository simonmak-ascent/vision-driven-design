import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { builtinModules } from 'node:module';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The Vercel function is one file plus a bundle, and this is the control that
 * keeps it that way.
 *
 * Measured 2026-11-27: production returned `Cannot find module
 * '/var/task/packages/vdd-mcp/dist/handler.js'` for every method, because the
 * feature package is not in the function's bundle. The commit under test is the
 * one that stops the deploy depending on `packages/` at all.
 */
const here = import.meta.url;
const repo = (path: string) => fileURLToPath(new URL(`../../../${path}`, here));
const require_ = createRequire(here);

describe('hosted bundle', () => {
  it('is current: the committed bytes equal a fresh build', () => {
    // Resolved from this file, not `process.cwd()`: the suite runs vitest with a
    // package directory as cwd, and a cwd-relative path resolves to a file that
    // does not exist — a harness failure dressed as a stale bundle.
    expect(() =>
      execFileSync('node', [repo('scripts/bundle-api.mjs'), '--check'], { stdio: 'pipe' }),
    ).not.toThrow();
  });

  it('carries the server: the bundle exports a working handler', () => {
    const bundle = require_(repo('api/_vdd-core.cjs')) as { createVddHandler?: unknown };
    expect(typeof bundle.createVddHandler).toBe('function');
  });

  it('loads in a directory with no node_modules above it, and answers', () => {
    // The property, measured where the deploy measures it: the three `api/` files
    // copied into a temporary directory whose ancestors hold no `node_modules`.
    // Requiring the bundle *in place* would leave the whole workspace on Node's
    // resolution path, so an `external:` in the generator could shave a megabyte,
    // keep this green, and 500 in production.
    const dir = mkdtempSync(join(tmpdir(), 'vdd-fn-'));
    for (const file of ['mcp.js', '_vdd-rpc.cjs', '_vdd-core.cjs']) {
      copyFileSync(repo(`api/${file}`), join(dir, file));
    }

    const script = `
      const handler = require(${JSON.stringify(join(dir, 'mcp.js'))});
      const meta = {'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'t',version:'0'},'io.modelcontextprotocol/clientCapabilities':{}};
      const body = {jsonrpc:'2.0', id:1, method:'tools/list', params:{_meta:meta}};
      let status = 0, payload = null;
      const res = {
        setHeader() {},
        status(code) { status = code; return this; },
        json(value) { payload = value; return this; },
        send(value) { payload = value; return this; },
        end() { return this; },
      };
      const req = { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2026-07-28', 'mcp-method': 'tools/list' }, body };
      Promise.resolve(handler(req, res)).then(() => {
        const names = (payload && payload.result && payload.result.tools || []).map((t) => t.name).sort();
        if (status !== 200 || JSON.stringify(names) !== JSON.stringify(['vdd_amend','vdd_chain_validate','vdd_check'])) {
          throw new Error('status ' + status + ': ' + JSON.stringify(payload).slice(0, 300));
        }
      }).then(() => process.exit(0), (e) => { console.error(e.message); process.exit(1); });
    `;
    try {
      execFileSync('node', ['-e', script], { cwd: dir, env: { ...process.env, NODE_PATH: '' }, stdio: 'pipe' });
    } catch (error) {
      const failure = error as { stderr?: Buffer };
      throw new Error(`the copied function failed outside the workspace:\n${failure.stderr?.toString() ?? ''}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('has no bare require outside dead ajv templates', () => {
    // esbuild inlines everything it can see. What it cannot see is a `require`
    // inside a string, and five of those survive: ajv's generated validators name
    // `ajv/dist/runtime/*` and `ajv-formats/dist/formats`. They are unreachable
    // from the three tool schemas (zod, with no `format`/`maxLength`/`uniqueItems`),
    // and this asserts the set stays exactly those five — so a schema that grows a
    // keyword which revives one fails here rather than at `/var/task`.
    const bundle = readFileSync(repo('api/_vdd-core.cjs'), 'utf8');
    const bare = new Set<string>();
    for (const match of bundle.matchAll(/require\("([^"]+)"\)/g)) {
      const id = match[1];
      if (id.startsWith('.') || id.startsWith('node:')) continue;
      if (builtinModules.includes(id.split('/')[0])) continue;
      bare.add(id);
    }
    expect([...bare].sort()).toEqual([
      'ajv-formats/dist/formats',
      'ajv/dist/runtime/equal',
      'ajv/dist/runtime/ucs2length',
      'ajv/dist/runtime/uri',
      'ajv/dist/runtime/validation_error',
    ]);
  });

  it('the shim reaches the bundle, not the workspace', () => {
    const shim = readFileSync(repo('api/_vdd-rpc.cjs'), 'utf8');
    expect(shim).toContain("require('./_vdd-core.cjs')");
    expect(shim).not.toMatch(/import\(/);
    expect(shim).not.toMatch(/\.\.\/packages\//);
  });
});
