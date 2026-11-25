import { describe, it, expect, vi, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PHASES } from '../src/index.js';

// The clone phase shells out to a real browser (best-effort) and crawls via
// fetch. Unit tests must not depend on Chromium or network, so stub both:
// the browser launch fails fast (browserless path), and fetch serves a
// minimal page so the crawl produces a deterministic single-page dataset.
vi.mock('playwright', () => ({
  chromium: { launch: vi.fn().mockRejectedValue(new Error('browser disabled in tests')) },
}));

const FIXTURE = '<html lang="en"><head><title>Home</title><meta name="description" content="Fixture"></head>' +
  '<body><h1>Hello</h1><p>A long enough paragraph for the crawl fixture page content.</p></body></html>';

// Keep the suite hermetic: the clone path now refuses anything that resolves to a non-public
// address, and an injected resolver stands in for DNS. `lookup` is a test seam on the input.
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const loopbackLookup = async () => [{ address: '127.0.0.1', family: 4 }];

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn(async () => {
    // Root page served; sitemap not found (404) so only the root is crawled.
    return new Response(FIXTURE, { status: 200, headers: { 'content-type': 'text/html' } });
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BROWSERLESS_TOKEN;
});

describe('clone phase', () => {
  it('AC-3/AC-1: normalizes domain, crawls dataset, and writes vdd/clone.md + vdd/clone-manifest.json', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'vdd-clone-'));
    try {
      stubFetch();
      const result = await PHASES['clone'](
        { description: 'https://www.ascent-partners.com', json: false, ssrfLookup: publicLookup } as never,
        { projectRoot: root, mode: 'auto' },
      );
      expect(result.success).toBe(true);
      expect(result.output?.normalized).toBe('https://ascent-partners.com');
      expect(result.output?.pages).toBe(1);

      const content = await fs.readFile(join(root, 'vdd/clone.md'), 'utf-8');
      expect(content).toContain('https://ascent-partners.com');
      expect(content).toContain('[x] A-001 domain normalization');
      expect(content).toContain('[x] A-002 crawl → 1 page');
      expect(content).toContain('[x] A-006 scaffold manifest');

      const manifest = await fs.readFile(join(root, 'vdd/clone-manifest.json'), 'utf-8');
      expect(JSON.parse(manifest).target).toBe('https://ascent-partners.com');
      const dataset = await fs.readFile(join(root, 'vdd/clone-dataset.json'), 'utf-8');
      expect(JSON.parse(dataset).pages).toHaveLength(1);
      const schema = await fs.readFile(join(root, 'vdd/clone-schema.json'), 'utf-8');
      expect(JSON.parse(schema).platform).toBe('unknown');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('AC-E1: rejects invalid domain (delegates to normalizeDomain)', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'vdd-clone-'));
    try {
      const result = await PHASES['clone'](
        { description: 'not a url', json: false },
        { projectRoot: root, mode: 'auto' },
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('INVALID_HOST');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('AC-E2: refuses a target that resolves to a non-public address', async () => {
    const root = await fs.mkdtemp(join(tmpdir(), 'vdd-clone-'));
    try {
      stubFetch();
      const result = await PHASES['clone'](
        { description: 'https://rebind.example', json: false, ssrfLookup: loopbackLookup } as never,
        { projectRoot: root, mode: 'auto' },
      );
      expect(result.success).toBe(false);
      expect(String(result.error)).toContain('non-public');
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
