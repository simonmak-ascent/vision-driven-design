import { createMcpHandler, type McpHttpHandler } from '@modelcontextprotocol/server';

import { createVddMcpServer } from './server.js';

/**
 * The fetch-shaped HTTP handler, exported so the CommonJS function in `api/` can
 * reach it without importing the SDK itself: `api/` has no package of its own, and
 * a bare `@modelcontextprotocol/server` specifier resolved from there finds no
 * `node_modules` under pnpm's layout. Resolution stays inside this package, where
 * the dependency is declared.
 */
export function createVddHandler(): McpHttpHandler {
  return createMcpHandler(() => createVddMcpServer());
}
