# Project Constitution

> Impact Chain: Phase 0 — Constitution (immutable)

Version: 1.5.9
Last updated: 2026-09-03

## Architecture Principles

- **Skill-first**: This is primarily a static documentation skill deployed as a Vercel MCP server. All content is markdown.
- **Spec-first with AI**: Use VDD methodology to plan every change. SDD is optionally available as a simplified sub-mode.
- **Version as directory**: Major deliverables are snapshotted into versioned directories.
- **MCP as public service**: The Streamable HTTP endpoint at `vdd.simonmak.com/api/mcp` is the entry point for agent consumption.
- **Package boundaries**: Documentation (SKILL.md, references/, domain-primers/) stays build-free. Only `api/` and `packages/` require build infrastructure.
- **Dogfood VDD**: All significant changes follow the VDD chain (vision→strategy→tactics→specs→plan→tasks→implement→validate).

## Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Documentation | Markdown | All skill content, references, domain-primers |
| Web | Static HTML | GitHub Pages landing page (`index.html`) |
| MCP Server | Vercel Serverless | `api/mcp.js` — Streamable HTTP + JSON-RPC 2.0 (core `api/_vdd-rpc.js`) |
| Engine | TypeScript | `packages/vdd-engine` — 18 phase functions, Zod types |
| MCP Package | TypeScript | `packages/vdd-mcp` — 15 tools, stdio + Streamable HTTP transports |
| CLI | TypeScript | `packages/vdd-cli` — Commander, 17 subcommands, `--json` mode |

## Security Constraints

- The MCP endpoint is **public**, no API key. Rate-limited by Vercel.
- No user data is stored — the server is stateless.
- The `packages/vdd-cli` tool runs on the user's local machine; no outbound calls from the CLI.
- No secrets in commits. Use `.env` files (gitignored) for local configuration.

## Naming Conventions

- Files: kebab-case exce
  pt for AGENTS.md (UPPER) and LICENSE.md (UPPER)
- Skill frontmatter: OpenCode skill format
- MCP tools: snake_case (`vdd_init`, `vdd_get_next_task`)
- Package names: `@simonmak-ascent/engine`, `@simonmak-ascent/mcp`, `@simonmak-ascent/cli`

## Banned Patterns

- Never edit generated files directly (dist/) — always edit source
- Never reference absolute paths — use relative from project root
- Never duplicate content — each concept has one canonical source
- Never renumber anti-patterns or phases — append only
- Never change the skill frontmatter format without checking OpenCode spec
- Never hardcode API keys, tokens, or URLs that change per environment

## Domain Primitives

- webapp
- infrastructure

## Open Questions / Deferred Decisions

- [PENDING] [Multi-language docs]: Should domain-primers be translated to Korean/Japanese/Mandarin?
- [RESOLVED] [npm publish]: Published `@simonmak-ascent/engine`, `@simonmak-ascent/mcp`, `@simonmak-ascent/cli` (v1.5.9) under the `@simonmak-ascent` scope.
- [PENDING] [OAuth]: Should the MCP server add optional OAuth for rate-limited tiers?
