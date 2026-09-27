// MCP Streamable HTTP transport (stateless) for the VDD server — the canonical
// public endpoint at https://vdd.simonmak.com/api/mcp. It speaks JSON-RPC 2.0:
//   - POST /api/mcp  → initialize / tools/list / tools/call (JSON response)
//   - notifications (no id) → 202 Accepted
//   - GET /api/mcp   → accessible HTML docs page for browsers; 405 for MCP clients
//   - DELETE → 204 (no session state to terminate)
//
// Sessions are advisory: an `Mcp-Session-Id` is issued on initialize but not
// required afterwards, so the endpoint stays stateless and horizontally scalable.
// Tool definitions, dispatch, and the docs page are shared via api/_vdd-rpc.js.
const { handleJsonRpc, isBrowser, html } = require("./_vdd-rpc.js");

const PROTOCOL_HEADER = "Mcp-Protocol-Version";

function rpcError(res, httpStatus, code, message, id) {
  res.setHeader("Content-Type", "application/json");
  return res.status(httpStatus).json({ jsonrpc: "2.0", error: { code, message }, id: id ?? null });
}

module.exports = async function (req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", `Content-Type, Accept, Mcp-Session-Id, ${PROTOCOL_HEADER}`);
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

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

  try {
    // JSON-RPC batch
    if (Array.isArray(body)) {
      const responses = body.map((msg) => handleJsonRpc(msg)).filter(Boolean);
      if (responses.length === 0) return res.status(202).end();
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(responses);
    }

    // Notifications (no id) are acknowledged with 202 and no body.
    if (body.id === undefined || body.id === null) {
      handleJsonRpc(body);
      return res.status(202).end();
    }

    // Issue an advisory session id on initialize (ignored on later calls).
    if (body.method === "initialize") {
      const id = globalThis.crypto?.randomUUID?.() || `vdd-${Date.now()}`;
      res.setHeader("Mcp-Session-Id", id);
    }

    const response = handleJsonRpc(body);
    if (response === null) return res.status(202).end();
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(response);
  } catch (err) {
    return rpcError(res, 500, -32603, `Internal error: ${err.message}`, body && body.id);
  }
};
