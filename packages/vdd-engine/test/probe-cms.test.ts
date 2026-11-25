import { afterEach, describe, expect, it, vi } from 'vitest';

import { probeCms } from '../src/probe-cms.js';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * The CMS probe runs inside the gated clone path, so it must follow redirects itself rather than
 * let `fetch` do it — otherwise a public site can 302 `/wp-json/` into metadata and the body is
 * persisted to `vdd/clone-dataset.json`.
 */
describe('probeCms', () => {
  it('follows a 301 on /wp-json/ and detects the site', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        calls.push(url);
        if (url.endsWith('/wp-json/')) {
          return new Response('', {
            status: 301,
            headers: { location: 'https://example.com/wp-json-final/' },
          });
        }
        if (url.endsWith('/wp-json-final/')) return json({ name: 'Example' });
        return new Response('', { status: 404 });
      }),
    );

    const cms = await probeCms('https://example.com', 1000, async () => true);

    expect(cms.name).toBe('Example');
    expect(calls.some((u) => u.endsWith('/wp-json-final/'))).toBe(true);
  });

  it('refuses a redirect to a non-public host', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return new Response('', {
          status: 302,
          headers: { location: 'http://169.254.169.254/x' },
        });
      }),
    );

    const cms = await probeCms('https://example.com', 1000, async (u) => !u.includes('169.254'));

    expect(cms.name).toBeUndefined();
    expect(calls.some((u) => u.includes('169.254'))).toBe(false);
  });
});
