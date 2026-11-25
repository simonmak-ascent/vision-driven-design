import { realpathSync } from 'node:fs';
import { delimiter, resolve, sep } from 'node:path';

/**
 * `projectRoot` is a write primitive: `writeArtifact()` does `mkdir -p` + `writeFile` under it, so
 * an unconstrained value lets a caller create directories anywhere the process can write. The
 * engine itself must stay usable from library tests with any temp root, so confinement is a
 * *surface* control applied by the CLI and the MCP server, using this module.
 *
 * Allowed roots come from `VDD_ALLOWED_ROOTS` (colon-separated) or, when unset, the process's cwd.
 */

function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    // A path that does not exist yet cannot be resolved; compare it lexically instead.
    return resolve(p);
  }
}

export function allowedProjectRoots(
  env: string | undefined = process.env.VDD_ALLOWED_ROOTS,
  cwd: string = process.cwd(),
): string[] {
  const configured = (env ?? '')
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  return (configured.length > 0 ? configured : [cwd]).map((p) => safeRealpath(resolve(p)));
}

export function isProjectRootAllowed(
  root: string,
  roots: string[] = allowedProjectRoots(),
): boolean {
  const target = safeRealpath(resolve(root));
  return roots.some((base) => target === base || target.startsWith(base.endsWith(sep) ? base : base + sep));
}

export function projectRootError(root: string, roots: string[] = allowedProjectRoots()): string {
  return (
    `projectRoot ${JSON.stringify(root)} is outside the allowed roots ` +
    `(${roots.join(', ')}). Set VDD_ALLOWED_ROOTS to a colon-separated list to widen it.`
  );
}
