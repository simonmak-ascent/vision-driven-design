import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// Drives the real Streamable HTTP transport over a loopback socket. The stdio
// surface is covered by server-surface.test.ts; this proves the HTTP entrypoint
// (packages/vdd-mcp/dist/http-entry.js) actually serves the 15 tools.
describe('HTTP transport (Streamable HTTP)', () => {
  let server: Server;
  let base: string;
  let sessionId: string | null = null;

  const reqHeaders = () => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    };
    if (sessionId) h['mcp-session-id'] = sessionId;
    return h;
  };

  const post = (payload: unknown) =>
    fetch(base, { method: 'POST', headers: reqHeaders(), body: JSON.stringify(payload) });

  // The Streamable HTTP transport may answer with application/json or with an
  // SSE stream (event: message / data: {...}); decode either.
  const readRpc = async (res: Response): Promise<Record<string, unknown>> => {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      const text = await res.text();
      const line = text.split('\n').find((l) => l.startsWith('data: '));
      return JSON.parse(line!.slice('data: '.length)) as Record<string, unknown>;
    }
    return (await res.json()) as Record<string, unknown>;
  };

  beforeAll(async () => {
    process.env.PORT = '0';
    const mod = await import('../src/http.js');
    server = await mod.startHttpServer();
    const addr = server.address() as AddressInfo;
    base = `http://127.0.0.1:${addr.port}/`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('answers initialize and issues a session id', async () => {
    const res = await post({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'vitest', version: '1' } },
    });
    expect(res.status).toBe(200);
    sessionId = res.headers.get('mcp-session-id');
    expect(sessionId).toBeTruthy();
    const body = (await readRpc(res)) as { result?: { serverInfo?: { name?: string } } };
    expect(body.result?.serverInfo?.name).toBe('vdd');

    // Clients acknowledge initialization before issuing requests.
    await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
  });

  it('lists the 15 tools over HTTP', async () => {
    const res = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    expect(res.status).toBe(200);
    const body = (await readRpc(res)) as { result?: { tools?: unknown[] } };
    expect(body.result?.tools?.length).toBe(15);
  });

  it('calls a tool over HTTP', async () => {
    const res = await post({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'vdd_detect_environment', arguments: { availableTools: ['filesystem'] } },
    });
    expect(res.status).toBe(200);
    const body = (await readRpc(res)) as { result?: { content?: Array<{ text: string }> } };
    const parsed = JSON.parse(body.result!.content![0].text) as { success: boolean };
    expect(parsed.success).toBe(true);
  });
});
