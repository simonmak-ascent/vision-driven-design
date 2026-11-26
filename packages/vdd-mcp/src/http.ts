import http from 'node:http';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/server';
import { createVddMcpServer } from './server.js';

// Streamable-HTTP entrypoint for self-hosting. Serves the same three tools and
// the same nine skills as the stdio surface, and nothing else: 2.0.0 is
// stateless, so there is no session id to mint and no session state to scale.
//
// Returns the underlying http.Server so callers (and tests) can read the bound
// port and close it. PORT is read per-call so tests can pass 0 for an ephemeral
// port.
export async function startHttpServer(): Promise<http.Server> {
  const PORT = Number(process.env.PORT ?? 3000);
  const mcpServer = await createVddMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless: a per-request envelope, no `Mcp-Session-Id`, nothing to resume.
    sessionIdGenerator: undefined,
  });
  await mcpServer.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    try {
      const host = req.headers.host ?? 'localhost';
      const url = new URL(req.url ?? '/', `http://${host}`);

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }

      let body: string | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        body = Buffer.concat(chunks).toString('utf8');
      }

      const request = new Request(url, {
        method: req.method ?? 'GET',
        headers,
        body,
      });

      const response = await transport.handleRequest(request);

      res.statusCode = response.status;
      for (const [key, value] of response.headers.entries()) {
        res.setHeader(key, value);
      }

      if (response.body) {
        const reader = response.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (error) {
      res.statusCode = 500;
      res.end(String(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    // A port already in use must reject: a resolve-only promise leaves the caller
    // waiting on an 'error' event that never reaches it.
    httpServer.once('error', reject);
    httpServer.listen(PORT, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });
  const address = httpServer.address();
  const actualPort = typeof address === 'object' && address ? address.port : PORT;
  console.log(`VDD MCP Streamable HTTP listening on http://localhost:${actualPort}/`);
  return httpServer;
}
