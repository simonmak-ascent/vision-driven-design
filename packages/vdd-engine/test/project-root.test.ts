import { describe, expect, it } from 'vitest';

import { allowedProjectRoots, isProjectRootAllowed, projectRootError } from '../src/project-root.js';

/**
 * `projectRoot` reaches `mkdir -p` + `writeFile`, so the surface must refuse a root outside a
 * declared allowlist. These are the containment cases: a sibling prefix must not pass a
 * `startsWith` check, and `..` segments must resolve before comparison.
 */
describe('projectRoot confinement', () => {
  const roots = ['/srv/project'];

  it.each(['/srv/project', '/srv/project/vdd/specs/alpha'])('allows %s', (p) => {
    expect(isProjectRootAllowed(p, roots)).toBe(true);
  });

  it.each([
    '/srv/project-evil',
    '/srv',
    '/etc',
    '/srv/project/../../../etc',
    '/srv/project/../../other',
  ])('rejects %s', (p) => {
    expect(isProjectRootAllowed(p, roots)).toBe(false);
  });

  it('defaults to cwd when VDD_ALLOWED_ROOTS is unset or empty', () => {
    expect(allowedProjectRoots('', '/srv/project')).toEqual(['/srv/project']);
    expect(allowedProjectRoots(undefined, '/srv/project')).toEqual(['/srv/project']);
  });

  it('splits VDD_ALLOWED_ROOTS on colons and drops blanks', () => {
    expect(allowedProjectRoots('/a:/b::', '/x')).toEqual(['/a', '/b']);
  });

  it('names the allowed roots in the refusal', () => {
    const message = projectRootError('/etc', roots);
    expect(message).toContain('/etc');
    expect(message).toContain('/srv/project');
    expect(message).toContain('VDD_ALLOWED_ROOTS');
  });
});
