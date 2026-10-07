# Security Policy

## Reporting a Vulnerability

Email **simon.pl.mak@gmail.com** with "SECURITY" in the subject. Please do not
open a public issue for a vulnerability. We aim to acknowledge within a few days.

## Supported Versions

The latest commit on `main` is the only supported version.

## Threat Model

VDD ships three deployment modes with different trust properties:

| Mode | Filesystem | Holds secrets | Reaches network |
|------|-----------|---------------|-----------------|
| Local stdio / CLI (`npx @simonmak-ascent/mcp`) | the caller's | no | at the user's direction |
| Local HTTP (self-host, `http-entry.js` / Docker) | the caller's | no | at the user's direction |
| Hosted public (`vdd.simonmak.com/api/mcp`) | **none (stateless)** | **no** | **no** |

The hosted endpoint is deliberately **stateless and credential-free**: it does not
read or write any caller filesystem, stores no user content, and holds no GitHub
or cloud credentials. When a phase needs project content it returns a
**delegation envelope** for the calling agent to execute locally, and it accepts
the result back via `artifactFiles`/`codebaseAudit`.

### Risks and controls

1. **Prompt injection into the local agent.** The hosted endpoint returns prompt
   templates and instructions that the host agent follows; the agent has filesystem
   and shell access. Caller-supplied content (`statement`, `description`,
   `researchFindings`, `artifactFiles`, `codebaseAudit`) is treated as **data, not
   instructions** and is only echoed into bounded result fields. Agents should
   treat MCP output as untrusted for *actions* and confirm destructive steps; the
   client's own permission gates remain the enforcement point.
2. **Data egress.** In hosted mode, artifact contents (`artifactFiles`,
   `codebaseAudit`) transit `vdd.simonmak.com`. Only `constitution.md`, `vdd/**`,
   `specs/**`, `references/**`, and `domain-primers/**` paths are accepted; never
   send secrets. For confidential repositories use the local stdio server, which
   keeps all content on the machine.
3. **Path handling.** `artifactFiles` keys and `writeTargets` are allowlisted to
   the paths above; absolute paths, drive letters, backslashes, and `..` segments
   are rejected. The server writes nothing, so `writeTargets` is advisory.
4. **Endpoint abuse.** The public endpoint is unauthenticated; it bounds request
   body size (512 KB), batch size (50 messages), and per-request `artifactFiles`
   (64 files / 256 KB total), and uses fixed (non-user-derived) regular
   expressions. Rate limiting is applied at the edge.
5. **Supply chain.** npm packages publish with provenance; dependencies are
   pinned; gitleaks secret scanning runs in CI.

### Out of scope

- A compromised client machine or agent.
- A malicious MCP server that impersonates this endpoint (pin the canonical URL).
- The `vdd_clone` pipeline, which performs outbound network requests — it is not
  available on the hosted endpoint and runs only on a filesystem-capable host at
  the user's direction.
