import { describe, it, expect, vi, afterEach } from 'vitest';
import { crawlSite } from '../src/crawl.js';

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.BROWSERLESS_TOKEN;
});

const HOME = '<html lang="en"><head><title>Home</title><meta name="description" content="Welcome home"></head>' +
  '<body><h1>Hello</h1><p>This is a long enough paragraph for the home page extraction.</p>' +
  '<img src="/logo.png"><a href="/about">About</a><a href="https://external.com/x">Ext</a></body></html>';

const ABOUT = '<html lang="en"><head><title>About</title></head>' +
  '<body><h2>About Us</h2><p>Another long enough paragraph that meets the minimum length requirement.</p>' +
  '<a href="/">Home</a></body></html>';

describe('crawlSite (A-002)', () => {
  it('crawls pages via an injected fetcher and extracts the dataset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const fetcher = async (url: string) => (url.endsWith('/about') ? ABOUT : HOME);

    const ds = await crawlSite('https://example.com', { fetcher });

    expect(ds.root).toBe('https://example.com');
    expect(ds.pages).toHaveLength(2);

    const home = ds.pages.find((p) => p.path === '/')!;
    expect(home.title).toBe('Home');
    expect(home.description).toBe('Welcome home');
    expect(home.lang).toBe('en');
    expect(home.headings).toContain('Hello');
    expect(home.paragraphs.some((p) => p.includes('long enough paragraph'))).toBe(true);
    expect(home.images).toEqual(['https://example.com/logo.png']);
    expect(home.links).toEqual(['https://example.com/about']); // same-origin only

    const about = ds.pages.find((p) => p.path === '/about')!;
    expect(about.title).toBe('About');
  });

  it('prefers the browserless /content transport when BROWSERLESS_TOKEN is set', async () => {
    process.env.BROWSERLESS_TOKEN = 'tok';
    const mock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/content')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { url?: string };
        return new Response(body.url === 'https://example.com/' ? HOME : ABOUT, { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    vi.stubGlobal('fetch', mock);

    const ds = await crawlSite('https://example.com', {});
    expect(mock.mock.calls.some(([u]) => String(u).includes('/content'))).toBe(true);
    expect(ds.pages).toHaveLength(2);
    expect(ds.pages[0].title).toBe('Home');
    expect(ds.pages[1].title).toBe('About');
  });

  it('truncates at maxPages when more pages remain', async () => {
    const sitemap = '<?xml version="1.0"?><urlset>' +
      '<url><loc>https://example.com/a</loc></url>' +
      '<url><loc>https://example.com/b</loc></url>' +
      '<url><loc>https://example.com/c</loc></url></urlset>';
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/sitemap.xml')) {
        return new Response(sitemap, { status: 200, headers: { 'content-type': 'application/xml' } });
      }
      return new Response('', { status: 404 });
    }));
    const fetcher = async () => HOME;
    const ds = await crawlSite('https://example.com', { fetcher, maxPages: 2 });
    expect(ds.pages).toHaveLength(2);
    expect(ds.truncated).toBe(true);
  });

  it('rejects an invalid domain', async () => {
    await expect(crawlSite('not a url', {})).rejects.toThrow('INVALID_HOST');
  });

  it('skips bare relative footer links and keeps root-relative links', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const HOME = '<html lang="en"><head><title>Home</title></head><body><main><h1>Hello</h1>' +
      '<p>This is a long enough paragraph for the home page extraction.</p></main>' +
      '<a href="en/personal-data-policy">Privacy</a><a href="/about">About</a></body></html>';
    const fetcher = async (url: string) => (url.endsWith('/about') ? null : HOME);

    const ds = await crawlSite('https://example.com', { fetcher });
    const home = ds.pages.find((p) => p.path === '/')!;
    expect(home.links).toEqual(['https://example.com/about']);
    expect(ds.pages.some((p) => p.path.includes('personal-data-policy'))).toBe(false);
  });

  it('strips inline scripts and scopes headings/paragraphs to main content', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const HTML = '<html lang="en"><head><title>T</title></head><body>' +
      '<main><h1>Title <script>var junk = "x";</script>End</h1>' +
      '<p>This is a long enough paragraph for the extraction test to pass.</p></main>' +
      '<footer><h2>Footer Nav</h2><p>short</p></footer></body></html>';
    const ds = await crawlSite('https://example.com', { fetcher: async () => HTML });
    const home = ds.pages[0];
    expect(home.headings).toEqual(['Title End']);
    expect(home.headings).not.toContain('Footer Nav');
    expect(home.paragraphs.some((p) => p.includes('long enough paragraph'))).toBe(true);
  });

  it('extracts srcset/data-src lazy images and normalizes hosts + scheme', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const HTML = '<html><head><title>T</title></head><body><main>' +
      '<h1>Hi</h1><p>This is a long enough paragraph for the extraction test.</p>' +
      '<img data-src="/lazy.jpg">' +
      '<img srcset="/a.jpg 480w, /b.jpg 1280w">' +
      '<img src="http://staging.youdomain.hk/wp-content/logo.png">' +
      '<img src="http://www.example.com/x.jpg">' +
      '<img src="/wp-content/plugins/x/submit.svg">' +
      '</main></body></html>';
    const ds = await crawlSite('https://example.com', { fetcher: async () => HTML });
    const imgs = ds.pages[0].images;
    expect(imgs).toContain('https://example.com/lazy.jpg');
    expect(imgs).toContain('https://example.com/a.jpg');
    expect(imgs).toContain('https://example.com/b.jpg');
    expect(imgs).toContain('https://example.com/wp-content/logo.png'); // staging host → origin
    expect(imgs).toContain('https://example.com/x.jpg'); // www → apex, http → https
    expect(imgs.some((i) => i.includes('submit.svg'))).toBe(false); // plugin junk filtered
  });

  it('dedupes percent-encoding variants of the same path', async () => {
    const sitemap = '<?xml version="1.0"?><urlset>' +
      '<url><loc>https://example.com/tc/%E5%85%A8</loc></url>' +
      '<url><loc>https://example.com/tc/%e5%85%a8</loc></url></urlset>';
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/sitemap.xml')) {
        return new Response(sitemap, { status: 200, headers: { 'content-type': 'application/xml' } });
      }
      return new Response('', { status: 404 });
    }));
    const fetcher = async () =>
      '<html><head><title>T</title></head><body><main><h1>Hi</h1><p>Long enough paragraph for the extraction.</p></main></body></html>';

    const ds = await crawlSite('https://example.com', { fetcher });
    expect(ds.pages.filter((p) => p.path.includes('/tc/'))).toHaveLength(1);
  });

  it('refuses a non-public origin when enforcement is on', async () => {
    await expect(
      crawlSite('https://localhost', {
        enforcePublicTarget: true,
        lookup: async () => [{ address: '127.0.0.1', family: 4 }],
      }),
    ).rejects.toThrow(/refused/);
  });

  it('does not follow a redirect to a private address', async () => {
    const mock = vi.fn(async () =>
      new Response('', {
        status: 302,
        headers: { location: 'http://169.254.169.254/latest/meta-data/' },
      }),
    );
    vi.stubGlobal('fetch', mock);

    const ds = await crawlSite('https://public.example', {
      enforcePublicTarget: true,
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      maxPages: 1,
    });

    expect(ds.pages).toHaveLength(0);
    expect(mock.mock.calls.some(([u]) => String(u).includes('169.254'))).toBe(false);
    expect(ds.refused?.some((r) => r.includes('169.254'))).toBe(true);
  });
});
