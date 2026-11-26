# Deployment Modes

VDD's MCP server runs in two modes. They expose the **same 3 tools and 9 skills**; the
difference is only the transport.

- **stdio** — `npx -y @simonmak-ascent/mcp`, for a client that launches a process.
- **Streamable HTTP** — `POST /api/mcp`, for a remote client. Stateless: no handshake, no `Mcp-Session-Id`, MCP revision `2026-07-28`, `server/discover` advertised.

Every tool is pure. There is no `projectRoot`, no filesystem read or write, no callback and
no write flag: artifact text goes in, a verdict and a coverage matrix come out. The host agent
owns every edit.

## Local stdio / CLI

Runs as a child process of the agent. Same three tools, same nine skills, same purity: the process
reads no files on the server's behalf — the artifact text is passed in — but the agent that launched
it can read and write the project as it always could.

```jsonc
"vdd": { "type": "local", "command": ["npx", "-y", "@simonmak-ascent/mcp"], "enabled": true }
```

## Local HTTP (self-host)

The same server over Streamable HTTP on port 3000 — for a container, a shared box, or any remote
client. Stateless, like the hosted endpoint:

```bash
docker build -t vdd-mcp .
docker run -p 3000:3000 vdd-mcp
# url: http://localhost:3000/mcp
```

`PORT` is read at start-up; the transport is constructed with `sessionIdGenerator: undefined`, so no
`Mcp-Session-Id` is ever issued.

## Hosted (stateless)

`vdd.simonmak.com/api/mcp` holds no filesystem, no credentials and no session. It answers
`server/discover` with `supportedVersions: ["2026-07-28"]` and the skills extension, and it serves
the same `createVddMcpServer()` the stdio entrypoint does.

```jsonc
"vdd": { "type": "remote", "url": "https://vdd.simonmak.com/api/mcp", "enabled": true }
```

There is no round trip in 2.0.0. A phase that once needed project content now receives it as the
`content` and `priorArtifacts` arguments the agent already holds, so one call returns the verdict:

```
agent → vdd_check { phase: "tactics", content: "<tactics.md>", priorArtifacts: { "strategy": "<strategy.md>" } }
server → { status: "FAIL", reasons: [...], coverage: { matrix: {...} } }
```

## Capability contract

The MCP is the **verification** layer: it builds the coverage matrix and returns a verdict. The
templates live in `references/artifact-templates.md` and the procedures in the nine skills; the
**host agent** does the research, the audit and the implementation with its own tools.
See [`SECURITY.md`](../SECURITY.md) for the trust model and data handling.
