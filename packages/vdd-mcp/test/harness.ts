import { createMcpHandler } from '@modelcontextprotocol/server';

import { createVddMcpServer } from '../src/server.js';

/**
 * The acceptance surface is the hosted handler: it is what a remote client talks
 * to, and it is built from the same `createVddMcpServer()` the stdio entrypoint
 * uses, so a tool that answers here answers there too.
 *
 * 2.0.0's envelope is per-request: `_meta` carries the protocol version and the
 * HTTP headers mirror the body's version and method.
 */
export const META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'vdd-test', version: '0.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};

export interface RpcResponse {
  status: number;
  headers: Record<string, string>;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
}

function parseBody(contentType: string, text: string): any {
  if (!text) return null;
  if (contentType.includes('text/event-stream')) {
    const data = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    return data.length > 0 ? JSON.parse(data[data.length - 1]) : null;
  }
  return JSON.parse(text);
}

export async function rpc(
  method: string,
  params: Record<string, unknown> = {},
  options: {
    headers?: Record<string, string>;
    meta?: Record<string, unknown>;
    id?: number;
    name?: string;
    /** A 2025-era client: no per-request envelope and none of its headers. */
    legacy?: boolean;
  } = {},
): Promise<RpcResponse> {
  const handler = createMcpHandler(() => createVddMcpServer());
  const body = {
    jsonrpc: '2.0',
    id: options.id ?? 1,
    method,
    params: options.legacy ? params : { ...params, _meta: options.meta ?? META },
  };
  const headers: Record<string, string> = options.legacy
    ? { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }
    : {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        'mcp-protocol-version': '2026-07-28',
        'mcp-method': method,
        ...(options.name ? { 'mcp-name': options.name } : {}),
        ...(options.headers ?? {}),
      };

  try {
    const response = await handler.fetch(
      new Request('http://localhost/api/mcp', { method: 'POST', headers, body: JSON.stringify(body) }),
      { parsedBody: body },
    );
    const text = await response.text();
    const message = parseBody(response.headers.get('content-type') ?? '', text);
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      result: message?.result,
      error: message?.error,
    };
  } finally {
    await handler.close().catch(() => {});
  }
}

/** A `tools/call` with the modern envelope, returning the tool's structured result. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<RpcResponse & { content: any }> {
  const response = await rpc('tools/call', { name, arguments: args }, { id: 7, name });
  const structured = response.result?.structuredContent ?? null;
  return { ...response, content: structured };
}
