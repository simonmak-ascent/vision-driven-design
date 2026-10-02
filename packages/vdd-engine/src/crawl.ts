// A-002 — Site crawler (network, browserless-first).
// Crawls a same-origin site and extracts a structured dataset (title,
// description, lang, headings, paragraphs, images, links) per page.
//
// Transport order: an injected `fetcher` (tests) → Browserless `/content`
// (JS-rendered HTML; `BROWSERLESS_HOST` + `BROWSERLESS_TOKEN` env) → plain
// `fetch` fallback. Browserless failures degrade per-URL to plain fetch, so a
// server-rendered site still crawls when Browserless is down or absent.
//
// Discovery: the origin root plus any URLs listed in `sitemap.xml` /
// `sitemap_index.xml`, then a bounded-concurrency BFS over same-origin
// `<a href>` links (root-relative / absolute only — bare relative hrefs in
// footers are skipped as boilerplate), capped by `maxPages`.

import type { CrawledPage, CrawlOptions, PageFetcher, SiteDataset } from './clone-types.js';
import { normalizeDomain } from './normalize-domain.js';
import { probeCms } from './probe-cms.js';

const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ico|css|js|json|xml|pdf|zip|mp4|webm|woff2?|ttf|eot|html)$/i;
const UA = 'vdd-clone/1.0 (+https://github.com/simonmak-ascent/vision-driven-design)';

// Paths that are never editorial content — feeds, WP plumbing, WooCommerce,
// and static-tour surfaces.
const JUNK_PATH = /(\/feed\/?$|\/wp-json(\/|$)|\/wp-admin|\/xmlrpc\.php|\/booth_tour\/|\/cart\/?$|\/checkout\/?$|\/my-account\/?$|\/wp-login)/i;
// Assets that are boilerplate, not editorial images.
const JUNK_IMAGE = /(s\.w\.org|\/wp-includes\/|\/wp-content\/plugins\/|favicon|\/emoji\/|\.gif$)/i;
// Boilerplate headings that can leak into the content region (a11y menus, etc).
const HEADING_BLOCK = /^(text size|shortcut|menu|skip to content|find us on:|endorsement disclaimer|chrome|firefox|edge|opera|safari)$/i;
// A staging-host placeholder (youdomain.hk is the default staging domain many
// agencies leave behind); map any such host to the page origin.
const STAGING_HOST = /\.youdomain\.hk$/i;

function stripTags(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove <script>/<style>/<noscript> blocks (whole-document) so heading /
// paragraph regexes can't span inline JS or template-string leakage.
function stripNonContent(html: string): string {
  return html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ');
}

function firstMatch(html: string, re: RegExp): string {
  const m = html.match(re);
  return m ? (m[1] ?? '') : '';
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(name + '\\s*=\\s*["\']([^"\']+)["\']', 'i'));
  return m ? m[1] : null;
}

function absolutize(base: URL, raw: string): URL | null {
  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
}

// Human-facing path for storage (keeps percent-encoding, strips trailing slash).
function displayPath(pathname: string): string {
  let p = pathname.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

// Dedupe key — origin + decoded, trailing-slash-normalized path, so
// `/en/experience` and `/en/experience/`, and `%E5…` vs `%e5…`, collapse.
function dedupeKey(u: URL): string {
  let p = u.pathname;
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep raw on malformed encoding */
  }
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return u.origin.toLowerCase() + (p === '' ? '/' : p);
}

function isSameOrigin(a: URL, b: URL): boolean {
  return a.origin === b.origin;
}

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/css,*/*' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json') || ct.includes('xml') || ct.includes('text/plain') || ct.includes('text/css')) return await res.text();
    const text = await res.text();
    if (/\b(xml|html)\b/i.test(text.slice(0, 200))) return text;
    return ct.includes('text/html') || ct.includes('text/css') ? text : null;
  } catch {
    return null;
  }
}

async function fetchBrowserless(host: string, token: string, url: string, timeoutMs: number): Promise<string | null> {
  try {
    const sep = host.includes('?') ? '&' : '?';
    const res = await fetch(`${host}/content${sep}token=${encodeURIComponent(token)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, waitForTimeout: 1500, rejectResourceTypes: ['image', 'font', 'media'] }),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text && /<html|<body|<title/i.test(text.slice(0, 500)) ? text : null;
  } catch {
    return null;
  }
}

async function resolveFetcher(options: CrawlOptions): Promise<PageFetcher> {
  if (options.fetcher) return options.fetcher;
  const host = process.env.BROWSERLESS_HOST || 'http://localhost:3000';
  const token = process.env.BROWSERLESS_TOKEN || '';
  const timeoutMs = options.timeoutMs ?? 15000;
  if (token) {
    return async (url) =>
      (await fetchBrowserless(host, token, url, timeoutMs)) ?? (await fetchText(url, timeoutMs));
  }
  return async (url) => fetchText(url, timeoutMs);
}

// The editorial content region — `<main>` or `<article>` — so footer/nav
// boilerplate headings and paragraphs are excluded. Falls back to the whole
// document when neither exists.
function mainContent(html: string): string {
  for (const tag of ['main', 'article']) {
    const m = new RegExp('<' + tag + '(\\s[^>]*)?>', 'i').exec(html);
    if (m) {
      const close = html.toLowerCase().indexOf('</' + tag + '>', m.index);
      if (close !== -1) return html.slice(m.index, close);
    }
  }
  return html;
}

function extractLinks(html: string, base: URL): string[] {
  const out = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    if (!raw || raw.startsWith('#')) continue;
    if (/^(javascript:|mailto:|tel:)/i.test(raw)) continue;
    // Skip bare relative hrefs (`en/foo` — no leading slash, no scheme). These
    // are almost always broken footer links that resolve to nested junk paths.
    if (!raw.startsWith('/') && !/^https?:\/\//i.test(raw)) continue;
    const u = absolutize(base, raw);
    if (u && isSameOrigin(base, u) && !ASSET_EXT.test(u.pathname) && !JUNK_PATH.test(u.pathname)) {
      out.add(dedupeKey(u));
    }
  }
  return [...out];
}

function normalizeImageUrl(u: URL, base: URL): string {
  // Map staging-host placeholders to the page origin, strip www, force https.
  const host = STAGING_HOST.test(u.hostname) ? base.hostname : u.hostname.replace(/^www\./i, '');
  return 'https://' + host + u.pathname + u.search;
}

function extractImages(html: string, base: URL): string[] {
  const out = new Set<string>();
  const imgRe = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html))) {
    const tag = m[0];
    const src =
      attr(tag, 'src') || attr(tag, 'data-src') || attr(tag, 'data-lazy-src') || attr(tag, 'data-original');
    if (src && !/^data:/i.test(src)) {
      const u = absolutize(base, src);
      if (u && !JUNK_IMAGE.test(u.pathname)) out.add(normalizeImageUrl(u, base));
    }
    const srcset = attr(tag, 'srcset');
    if (srcset) {
      for (const cand of srcset.split(',')) {
        const url = cand.trim().split(/\s+/)[0];
        if (!url) continue;
        const u = absolutize(base, url);
        if (u && !JUNK_IMAGE.test(u.pathname)) out.add(normalizeImageUrl(u, base));
      }
    }
  }
  return [...out];
}

function extractHeadings(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = stripTags(m[2]);
    if (!t) continue;
    if (HEADING_BLOCK.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function extractParagraphs(html: string): string[] {
  const out: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const t = stripTags(m[1]);
    if (t && t.length >= 20) out.push(t);
  }
  return out;
}

function extractCanonical(html: string, base: URL): URL | null {
  const raw =
    firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    firstMatch(html, /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i);
  if (!raw) return null;
  return absolutize(base, raw);
}

async function discoverSitemap(root: string, timeoutMs: number): Promise<string[]> {
  const locs: string[] = [];
  for (const name of ['sitemap.xml', 'sitemap_index.xml']) {
    const txt = await fetchText(root + '/' + name, timeoutMs);
    if (!txt) continue;
    const children = extractLocs(txt);
    if (/<sitemapindex/i.test(txt)) {
      let fetched = 0;
      for (const loc of children) {
        if (fetched >= 20) break;
        const child = await fetchText(loc, timeoutMs);
        if (child) {
          for (const l of extractLocs(child)) locs.push(l);
          fetched++;
        }
      }
    } else {
      for (const l of children) locs.push(l);
    }
  }
  return locs;
}

async function fetchPage(fetcher: PageFetcher, url: string): Promise<CrawledPage | null> {
  const html = await fetcher(url);
  if (!html) return null;
  const requested = new URL(url);
  const canonical = extractCanonical(html, requested);
  const u = canonical && isSameOrigin(canonical, requested) ? canonical : requested;
  const clean = stripNonContent(html);
  const content = mainContent(clean);
  const title = stripTags(firstMatch(clean, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const description = firstMatch(clean, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || firstMatch(clean, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const lang = firstMatch(clean, /<html[^>]*\slang=["']([^"']*)["']/i);
  return {
    url: u.toString(),
    path: displayPath(u.pathname),
    title,
    description,
    lang,
    headings: extractHeadings(content),
    paragraphs: extractParagraphs(content),
    images: extractImages(html, u),
    links: extractLinks(html, u),
  };
}

export async function crawlSite(domain: string, options: CrawlOptions = {}): Promise<SiteDataset> {
  const normalized = normalizeDomain(domain);
  if ('code' in normalized) throw new Error(normalized.code + ': ' + normalized.message);
  const root = normalized.scheme + '://' + normalized.host;
  const maxPages = options.maxPages ?? 200;
  const timeoutMs = options.timeoutMs ?? 15000;
  const concurrency = options.concurrency ?? 8;

  const fetcher = await resolveFetcher(options);
  const origin = new URL(root + '/');

  const queue: string[] = [];
  const seen = new Set<string>();
  const seenPages = new Set<string>();
  const pages: CrawledPage[] = [];
  let stopped = false;
  let truncated = false;

  const enqueue = (raw: string) => {
    if (stopped) return;
    const u = absolutize(origin, raw);
    if (!u || !isSameOrigin(origin, u)) return;
    if (ASSET_EXT.test(u.pathname) || JUNK_PATH.test(u.pathname)) return;
    const key = dedupeKey(u);
    if (!seen.has(key)) {
      seen.add(key);
      queue.push(key);
    }
  };

  const addPage = (page: CrawledPage) => {
    if (stopped) return;
    if (pages.length >= maxPages) {
      stopped = true;
      return;
    }
    const key = dedupeKey(new URL(page.url));
    if (seenPages.has(key)) return;
    seenPages.add(key);
    pages.push(page);
    for (const l of page.links) enqueue(l);
  };

  enqueue(root + '/');
  for (const loc of await discoverSitemap(root, timeoutMs)) enqueue(loc);

  // Fetch the root synchronously first so the dataset starts with the origin
  // (deterministic ordering for tests and consumers).
  const rootKey = queue.shift();
  if (rootKey) {
    const rootPage = await fetchPage(fetcher, rootKey);
    if (rootPage) addPage(rootPage);
  }

  const worker = async () => {
    while (!stopped) {
      const url = queue.shift();
      if (!url) return;
      if (pages.length >= maxPages) {
        stopped = true;
        return;
      }
      const page = await fetchPage(fetcher, url);
      if (page) addPage(page);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));

  // Truncated when the cap was hit while more distinct pages had been
  // discovered than were actually stored.
  if (pages.length >= maxPages && seen.size > pages.length) truncated = true;

  const cms = await probeCms(root, timeoutMs);

  return { root, crawledAt: new Date().toISOString(), maxPages, truncated, pages, cms };
}
