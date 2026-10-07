# Deployment Modes

VDD's MCP server runs in three modes. They expose the **same 15 tools**; the
difference is whether the server itself can touch a filesystem.

| Mode | Entry point | Filesystem | Network | Full VDD |
|------|-------------|-----------|---------|----------|
| **Local stdio** | `npx -y @simonmak-ascent/mcp` | the caller's | user-directed | ✅ |
| **Local HTTP** | `packages/vdd-mcp/dist/http-entry.js` (or the root `Dockerfile`) on `:3000` | the caller's | user-directed | ✅ |
| **Hosted** | `https://vdd.simonmak.com/api/mcp` | none (stateless) | none | via delegation |

## Local stdio / CLI

Runs as a child process of the agent, so it reads and writes the real project
filesystem. Returns `mode: "local"`, `persisted: true` for artifact-producing
phases. This is the mode to use for confidential repositories or when the agent
must persist artifacts directly.

```jsonc
"vdd": { "type": "local", "command": ["npx", "-y", "@simonmak-ascent/mcp"], "enabled": true }
```

## Local HTTP (self-host)

The same engine over MCP Streamable HTTP on port 3000 — for a container, a shared
box, or any remote client. Still has a real filesystem (the host's).

```bash
docker build -t vdd-mcp .
docker run -p 3000:3000 vdd-mcp
# url: http://localhost:3000/mcp
```

## Hosted (stateless, delegated)

`vdd.simonmak.com/api/mcp` holds no filesystem and no credentials. It returns:

- **Artifacts** for write phases, with `persisted: false` and `writeTargets` —
  the agent writes them.
- A **delegation envelope** (`mode: "hosted-delegated"`, `delegation`) for phases
  that need project content. The agent executes locally and re-calls the same
  tool with `artifactFiles` (plus `codebaseAudit` for `vdd_tactics`) to receive
  the real result.

```jsonc
"vdd": { "type": "remote", "url": "https://vdd.simonmak.com/api/mcp", "enabled": true }
```

The delegation loop:

```
agent → vdd_clarify { feature }
server → { mode: "hosted-delegated", delegation: { nextTool: "vdd_clarify", expectedReturn: { artifactFiles: {...} } } }
agent (reads spec.md locally) → vdd_clarify { feature, artifactFiles: { "vdd/specs/<feature>/spec.md": "..." } }
server → { success: true, output: { clarificationCount, items } }
```

## Capability contract

The MCP is the **orchestration + verification** layer: it emits templates, gate
logic, research dispatch specs, and (hosted) delegation envelopes. The **host
agent** executes research, codebase audit, and implementation with its own tools.
See [`SECURITY.md`](../SECURITY.md) for the trust model and data handling.
