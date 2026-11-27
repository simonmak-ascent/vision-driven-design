import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startHttpServer } from '../src/http.js';

/**
 * The self-hosted Streamable-HTTP surface. 2.0.0 is stateless, so the case that
 * matters is the absence of a session: a header a client resumes from is a header
 * that makes the endpoint sticky, and there is nothing here to be sticky about.
 */
describe('self-hosted http transport', () => {
  let server: Awaited<ReturnType<typeof startHttpServer>>;
  let base: string;

  beforeAll(async () => {
    // Ephemeral port: binding 3000 turns a port clash into a timeout, not a red.
    process.env.PORT = '0';
    server = await startHttpServer();
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    base = `http://127.0.0.1:${port}/mcp`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('answers tools/list without issuing a session id', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBeNull();
    const text = await response.text();
    expect(text).toContain('vdd_check');
  });
});
