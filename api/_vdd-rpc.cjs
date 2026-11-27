'use strict';
// CJS shim over the ESM core, for the one file on this deployment that has to be
// CommonJS: Vercel's `api/` runtime loads `api/mcp.js` with `require`.
//
// 2.0.0 deleted the 1,536-line twin that used to live here. There is exactly one
// implementation of the tools (`packages/vdd-mcp/src/server.ts`) and one of the
// protocol (`@modelcontextprotocol/server`), and this file reaches both by dynamic
// import. Nothing about a tool — its schema, its checks, its output — is stated
// twice.

const SERVER_VERSION = '2.0.0';

const DOCS = {
  name: 'vdd',
  title: 'Vision Driven Design',
  version: SERVER_VERSION,
  tools: [
    ['vdd_check', 'Judge one artifact: invariants A, B, C and the declared counts.'],
    ['vdd_chain_validate', 'Judge a whole chain, plus every goal reaching a task.'],
    ['vdd_amend', 'Judge an amendment and list the downstream artifacts it invalidates.'],
  ],
  skills: 9,
};

let corePromise = null;

// Only this package's own build is imported: `@modelcontextprotocol/server` is
// resolved inside it, where the dependency is declared, because `api/` has no
// package of its own and a bare specifier does not resolve from here.
function core() {
  corePromise ??= import('../packages/vdd-mcp/dist/handler.js');
  return corePromise;
}

/** A browser wants the human-readable page; an MCP client sends no `text/html`. */
function isBrowser(req) {
  const accept = String((req.headers && req.headers.accept) || '');
  return accept.includes('text/html') && !accept.includes('application/json');
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>VDD MCP endpoint</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:44rem;margin:3rem auto;padding:0 1rem;color:#111}
code{background:#f3f3f3;padding:.1rem .3rem;border-radius:3px}td,th{text-align:left;padding:.2rem .8rem .2rem 0}</style>
<h1>Vision Driven Design — MCP endpoint</h1>
<p><strong>${DOCS.name}</strong> ${DOCS.version} speaks MCP revision
<code>2026-07-28</code> at <code>POST /api/mcp</code>. It is stateless: no
<code>initialize</code> handshake, no <code>Mcp-Session-Id</code>.</p>
<h2>Tools (${DOCS.tools.length})</h2>
<table><tr><th>Name</th><th>What it does</th></tr>
${DOCS.tools.map(([name, what]) => `<tr><td><code>${name}</code></td><td>${what}</td></tr>`).join('\n')}
</table>
<p>A tool judges an artifact; it never writes one. The procedure for writing one is
the phase's skill — ${DOCS.skills} of them, served as <code>skill://&lt;name&gt;/SKILL.md</code>
through <code>skills/list</code> and <code>skills/get</code>.</p>
<p>Removed in 2.0.0: the fourteen generation tools and the twenty prompts.
<code>docs/migration-2.0.md</code> names the successor for every one of them.</p>`;

/**
 * Serve one JSON-RPC message through the same handler the stdio surface uses.
 * The SDK owns the protocol — discover, version negotiation, `resultType` — so
 * this function is transport adaptation and nothing else.
 */
async function handleJsonRpc(message, headers = {}) {
  const { createVddHandler } = await core();
  const handler = createVddHandler();

  const forward = {};
  for (const [from, to] of [
    ['accept', 'accept'],
    ['mcp-protocol-version', 'mcp-protocol-version'],
    ['mcp-method', 'mcp-method'],
    ['mcp-name', 'mcp-name'],
    ['authorization', 'authorization'],
  ]) {
    if (headers[from]) forward[to] = String(headers[from]);
  }

  try {
    const request = new Request('https://vdd.simonmak.com/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...forward },
      body: JSON.stringify(message),
    });
    const response = await handler.fetch(request, { parsedBody: message });
    const text = await response.text();
    const type = response.headers.get('content-type') || 'application/json';

    // The SDK answers either a JSON body or a one-shot SSE stream, depending on
    // what the client accepts; both carry exactly one JSON-RPC message.
    let body = null;
    if (text) {
      if (type.includes('text/event-stream')) {
        const data = text
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());
        body = data.length > 0 ? JSON.parse(data[data.length - 1]) : null;
      } else {
        body = JSON.parse(text);
      }
    }

    return { status: response.status, body };
  } finally {
    await handler.close().catch(() => {});
  }
}

module.exports = { handleJsonRpc, isBrowser, html, SERVER_VERSION };
