// MCP Streamable HTTP transport (stateless) for the VDD server — the canonical
// public endpoint at https://vdd.simonmak.com/api/mcp. It speaks JSON-RPC 2.0:
//   - POST /api/mcp  → every method, answered by the same handler stdio uses
//   - notifications (no id) → 202 Accepted
//   - GET /api/mcp   → accessible HTML docs page for browsers; 405 for MCP clients
//   - DELETE → 204 (there is no session to terminate)
//
// 2.0.0 is stateless: no `initialize` handshake and no `Mcp-Session-Id` is ever
// minted or exposed. The protocol work — `server/discover`, version negotiation,
// `resultType` — belongs to `@modelcontextprotocol/server`; this file adapts Node's
// request/response to it and bounds what a public endpoint will accept.
const { handleJsonRpc, isBrowser, html } = require('./_vdd-rpc.cjs');

function rpcError(res, httpStatus, code, message, id) {
  res.setHeader("Content-Type", "application/json");
  return res.status(httpStatus).json({ jsonrpc: "2.0", error: { code, message }, id: id ?? null });
}

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Authorization");
  // No `Mcp-Session-Id` in the expose list: this endpoint never issues one.

  if (req.method === "OPTIONS") return res.status(204).end();

  // No session state: accept termination as a no-op.
  if (req.method === "DELETE") return res.status(204).end();

  // Browsers get the human-readable docs page; MCP clients (no text/html Accept)
  // get 405 — this server has no server-initiated stream.
  if (req.method === "GET") {
    if (isBrowser(req)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    res.setHeader("Allow", "POST, DELETE, OPTIONS");
    return rpcError(res, 405, -32000, "Method Not Allowed: this server has no server-initiated stream");
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, DELETE, OPTIONS");
    return rpcError(res, 405, -32000, "Method Not Allowed");
  }

  const body = req.body;
  if (body === undefined || body === null || body === "") {
    return rpcError(res, 400, -32700, "Parse error: expected a JSON-RPC 2.0 body");
  }

  // This endpoint is public and unauthenticated: bound the work so a single
  // request cannot consume unbounded CPU or memory.
  const MAX_BODY_BYTES = 524288; // 512 KB
  const MAX_BATCH = 50;
  let bodySize = 0;
  try { bodySize = Buffer.byteLength(JSON.stringify(body)); } catch { /* unstringifiable — let the handler reject it */ }
  if (bodySize > MAX_BODY_BYTES) {
    return rpcError(res, 413, -32600, `Request too large: ${bodySize} bytes exceeds ${MAX_BODY_BYTES}`);
  }

  try {
    // JSON-RPC batch
    if (Array.isArray(body)) {
      if (body.length > MAX_BATCH) {
        return rpcError(res, 413, -32600, `Batch too large: ${body.length} messages exceeds ${MAX_BATCH}`);
      }
      const answered = await Promise.all(body.map((msg) => handleJsonRpc(msg, req.headers)));
      const responses = answered.map((entry) => entry.body).filter(Boolean);
      if (responses.length === 0) return res.status(202).end();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(responses);
    }

    // Notifications (no id) are acknowledged with 202 and no body.
    if (body.id === undefined || body.id === null) {
      await handleJsonRpc(body, req.headers);
      return res.status(202).end();
    }

    const { status, body: response } = await handleJsonRpc(body, req.headers);
    if (response === null) return res.status(202).end();
    res.setHeader("Content-Type", "application/json");
    return res.status(status).json(response);
  } catch (err) {
    return rpcError(res, 500, -32603, `Internal error: ${err.message}`, body && body.id);
  }
};
