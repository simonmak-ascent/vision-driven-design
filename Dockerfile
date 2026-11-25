# VDD MCP server — Streamable HTTP transport on port 3000.
#
# Builds the TypeScript monorepo and serves the 14 VDD MCP tools over the MCP
# Streamable HTTP transport, for self-hosting or any remote client.
#
# Note: Glama does NOT build from this file — it generates its own container
# from the stdio entrypoint (packages/vdd-mcp/dist/stdio.js), wrapped with
# mcp-proxy. This image is for self-hosting the HTTP transport.
#
# The stdio entrypoint remains available for local `npx @simonmak-ascent/mcp`
# use; this image runs the HTTP transport.
FROM node:22-alpine

# Install pnpm (workspace installs require it).
RUN npm install -g pnpm@10.30.3

WORKDIR /app

# Copy only what the TypeScript build needs. `--ignore-scripts` skips Playwright's
# browser download (an engine devDependency used for tests, not for compiling).
COPY pnpm-workspace.yaml package.json ./
COPY packages ./packages

RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build all workspace packages in topological order (engine → cli → mcp).
RUN pnpm -r build

# Run the streamable-HTTP MCP server. No environment variables or network
# access required. Port is configurable via $PORT (default 3000).
EXPOSE 3000
CMD ["node", "packages/vdd-mcp/dist/http-entry.js"]
