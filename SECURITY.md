# Security Policy

## Reporting a Vulnerability

Email **simon.pl.mak@gmail.com** with "SECURITY" in the subject. Please do not
open a public issue for a vulnerability. We aim to acknowledge within a few days.

## Supported Versions

The latest commit on `main` is the only supported version.

## Threat Model

VDD ships two transports with the same trust properties: the server is pure in both.

| Mode | Filesystem | Holds secrets | Reaches network |
|------|-----------|---------------|-----------------|
| Local stdio (`npx @simonmak-ascent/mcp`) | none — the server reads and writes nothing | no | no |
| Local CLI (`vdd check/chain/amend`) | reads the files you name; writes nothing | no | no |
| Local HTTP (self-host, `http-entry.js` / Docker) | none | no | no |
| Hosted public (`vdd.simonmak.com/api/mcp`) | **none (stateless)** | **no** | **no** |

The hosted endpoint is deliberately **stateless and credential-free**: it reads no caller
filesystem, stores no user content, issues no session, and holds no GitHub or cloud credentials.
There is no round trip in 2.0.0 — the artifact text is an argument and the verdict is the return
value, so no project content is ever requested back from the caller.

### Risks and controls

1. **Prompt injection into the local agent.** The endpoint returns a verdict and a coverage matrix,
   not instructions to follow; the nine skills are the procedures, and the host agent reads them
   knowingly. Artifact text (`content`, `priorArtifacts`) is treated as **data**: it is parsed for
   ids and `serves_*` fields and echoed into bounded result fields. Agents should still treat MCP
   output as untrusted for *actions*; the client's own permission gates remain the enforcement point.
2. **Data egress.** In hosted mode, the artifact text you pass transits `vdd.simonmak.com`. Send only
   what you would put in a ticket; for confidential repositories use the local stdio server, which
   keeps all content on the machine.
3. **Path handling.** No MCP tool takes a path, a project root or a filename, so the server has nothing
   to traverse: the only inputs are artifact text and count objects. The CLI does read the files you name
   on its command line — it is your shell, with your permissions — and writes only to stdout.
4. **Endpoint abuse.** The public endpoint is unauthenticated; it bounds request body size (512 KB)
   and batch size (50 messages), and uses fixed (non-user-derived) regular expressions. Rate limiting, if any,
   is the deployer's edge policy — `vercel.json` declares none.
5. **Supply chain.** npm packages publish with provenance; dependencies are pinned; gitleaks secret
   scanning runs in CI.

### Out of scope

- A compromised client machine or agent.
- A malicious MCP server that impersonates this endpoint (pin the canonical URL).
