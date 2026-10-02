// A-002 — UI/UX capture (browser, Playwright → browserless → static).
// Captures the *actual* rendered UI, not just a handful of CSS variables:
//   • full serialized stylesheet rules (media queries preserved) — the single
//     most important input for a faithful clone
//   • every CSS custom property (color, spacing, radius, shadow, …)
//   • @font-face sources (so custom fonts survive, not just family names)
//   • the rendered outerHTML of the key layout regions (header/nav, hero, footer)
//   • real responsive breakpoints (from @media width conditions)
//   • real layout metrics (Playwright only)
//
// Transport order: Playwright (richest, requires chromium) → a static capture
// that fetches the HTML (via Browserless `/content` when configured, else plain
// fetch) and its linked stylesheets, then parses CSS vars / @font-face /
// breakpoints / regions without a browser. A server-rendered site (WordPress,
// etc.) gets a faithful design system even with no headless browser installed.

import type { CaptureBundle, FontFaceRef, LayoutMetrics, RegionCapture } from './clone-types.js';

const PROBE_WIDTHS = [320, 768, 1440];
const UA = 'vdd-clone/1.0 (+https://github.com/simonmak-ascent/vision-driven-design)';

// Loose structural view of a CSS rule so we can read subtype-specific members
// (media wrappers, @font-face, style declarations) without casting to `any`.
interface AnyRule {
  cssText?: string;
  conditionText?: string;
  cssRules?: CSSRuleList | null;
  style?: CSSStyleDeclaration | null;
}

async function evaluateCapture(): Promise<{
  html: string;
  css: string;
  tokens: Record<string, string>;
  fonts: string[];
  fontFaces: FontFaceRef[];
  regions: RegionCapture[];
  metrics: LayoutMetrics;
}> {
  try {
    await (document.fonts && document.fonts.ready);
  } catch {
    /* fonts API unavailable — continue */
  }

  const cssParts: string[] = [];
  const fontFaces: FontFaceRef[] = [];
  const seenFaces = new Set<string>();

  const ctorName = (rule: unknown): string => {
    const c = (rule as { constructor?: { name?: string } })?.constructor;
    return c?.name ?? '';
  };
  const safeCssText = (rule: unknown): string => {
    try {
      return (rule as { cssText?: string }).cssText ?? '';
    } catch {
      return '';
    }
  };

  for (const sheet of Array.from(document.styleSheets as unknown as CSSStyleSheet[])) {
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      continue; // cross-origin / inaccessible stylesheet
    }
    if (!rules) continue;
    for (const rule of Array.from(rules) as unknown as AnyRule[]) {
      const ctor = ctorName(rule);
      if (ctor === 'CSSMediaRule' || ctor === 'CSSSupportsRule') {
        const inner: string[] = [];
        try {
          for (const r of Array.from(rule.cssRules ?? []) as unknown as AnyRule[]) {
            inner.push(safeCssText(r));
          }
        } catch {
          /* ignore */
        }
        cssParts.push('@media ' + rule.conditionText + ' {\n' + inner.join('\n') + '\n}');
        for (const r of Array.from(rule.cssRules ?? []) as unknown as AnyRule[]) {
          if (ctorName(r) === 'CSSFontFaceRule') {
            const fam = (r.style?.getPropertyValue('font-family') ?? '').trim();
            const src = (r.style?.getPropertyValue('src') ?? '').trim();
            const key = fam + '|' + src;
            if (fam && src && !seenFaces.has(key)) {
              seenFaces.add(key);
              fontFaces.push({ family: fam, src });
            }
          }
        }
      } else if (ctor === 'CSSFontFaceRule') {
        const fam = (rule.style?.getPropertyValue('font-family') ?? '').trim();
        const src = (rule.style?.getPropertyValue('src') ?? '').trim();
        const key = fam + '|' + src;
        if (fam && src && !seenFaces.has(key)) {
          seenFaces.add(key);
          fontFaces.push({ family: fam, src });
        }
        cssParts.push(safeCssText(rule));
      } else {
        cssParts.push(safeCssText(rule));
      }
    }
  }

  for (const style of Array.from(document.querySelectorAll('style'))) {
    const t = style.textContent || '';
    if (t.trim()) cssParts.push(t);
  }

  const css = cssParts.filter(Boolean).join('\n');

  const outerOf = (sel: string): string => {
    const el = document.querySelector(sel);
    return el ? el.outerHTML : '';
  };
  const regions: RegionCapture[] = [];
  const nav = outerOf('nav');
  if (nav) regions.push({ name: 'nav', selector: 'nav', html: nav });
  const header = outerOf('header');
  if (header) regions.push({ name: 'header', selector: 'header', html: header });
  const heroEl =
    document.querySelector('main section:first-of-type') || document.querySelector('main > :first-child');
  if (heroEl) regions.push({ name: 'hero', selector: 'main section:first-of-type', html: heroEl.outerHTML });
  const mainEl =
    document.querySelector('main') ||
    document.querySelector('#main-content') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('.entry-content') ||
    document.querySelector('article');
  if (mainEl) regions.push({ name: 'main', selector: '#main-content, main, [role="main"], article', html: mainEl.outerHTML });
  const footer = outerOf('footer');
  if (footer) regions.push({ name: 'footer', selector: 'footer', html: footer });

  const cs = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = {};
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (name.startsWith('--')) tokens[name] = cs.getPropertyValue(name).trim();
  }

  const families = [...new Set(Array.from(document.fonts).map((f) => f.family))];

  const headerEl = document.querySelector('#main-header, header');
  const logoEl = document.querySelector('#logo, header img, nav img');
  const metrics: LayoutMetrics = {
    headerHeight: headerEl ? Math.round(headerEl.getBoundingClientRect().height) : undefined,
    logoHeight: logoEl ? Math.round(logoEl.getBoundingClientRect().height) : undefined,
    headerPosition: headerEl ? getComputedStyle(headerEl).position : undefined,
  };

  return {
    html: document.documentElement.outerHTML,
    css,
    tokens,
    fonts: families,
    fontFaces,
    regions,
    metrics,
  };
}

// Extract real responsive breakpoints from @media width conditions in the
// captured CSS, falling back to the probe widths when none are found.
function extractBreakpoints(css: string): number[] {
  const widths = new Set<number>();
  const re = /@media[^{]*?\((?:min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    const v = parseFloat(m[1]);
    if (Number.isFinite(v)) widths.add(Math.round(v));
  }
  const sorted = [...widths].sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : PROBE_WIDTHS;
}

// --- Static capture (no headless browser) ---

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/css,*/*' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchRenderedHtml(domain: string, timeoutMs: number): Promise<string | null> {
  const host = process.env.BROWSERLESS_HOST || 'http://localhost:3000';
  const token = process.env.BROWSERLESS_TOKEN || '';
  if (token) {
    try {
      const sep = host.includes('?') ? '&' : '?';
      const res = await fetch(`${host}/content${sep}token=${encodeURIComponent(token)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: domain, waitForTimeout: 1500, rejectResourceTypes: ['image', 'font', 'media'] }),
      });
      if (res.ok) {
        const text = await res.text();
        if (/<html|<body|<title/i.test(text.slice(0, 500))) return text;
      }
    } catch {
      /* fall through to plain fetch */
    }
  }
  return fetchText(domain, timeoutMs);
}

function extractElement(html: string, tag: string): string {
  const m = new RegExp('<' + tag + '(\\s[^>]*)?>', 'i').exec(html);
  if (!m) return '';
  const close = html.toLowerCase().indexOf('</' + tag + '>', m.index);
  return close !== -1 ? html.slice(m.index, close) : html.slice(m.index);
}

export async function staticCapture(domain: string, options?: { timeoutMs?: number }): Promise<CaptureBundle> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const html = (await fetchRenderedHtml(domain, timeoutMs)) ?? '';
  const base = new URL(domain + '/');

  const cssParts: string[] = [];
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    if (m[1].trim()) cssParts.push(m[1]);
  }
  const seenSheets = new Set<string>();
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    const href = m[1].trim();
    if (seenSheets.has(href)) continue;
    seenSheets.add(href);
    const u = absolutizeUrl(base, href);
    if (!u) continue;
    const css = await fetchText(u, timeoutMs);
    if (css) cssParts.push(css);
  }
  const css = cssParts.join('\n');

  const tokens: Record<string, string> = {};
  for (const m of css.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)[;}]/g)) {
    tokens[m[1]] = m[2].trim();
  }

  const fontFaces: FontFaceRef[] = [];
  for (const m of css.matchAll(/@font-face\s*{([^}]*)}/g)) {
    const fam = (m[1].match(/font-family\s*:\s*([^;}]+)/i) || [, ''])[1].trim().replace(/['"]/g, '');
    const src = (m[1].match(/src\s*:\s*([^;}]+)/i) || [, ''])[1].trim();
    if (fam && src) fontFaces.push({ family: fam, src });
  }

  const families = new Set<string>();
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const v = m[1].replace(/['"]/g, '').split(',')[0].trim();
    if (v && !v.startsWith('var(')) families.add(v);
  }

  const regions: RegionCapture[] = [];
  const nav = extractElement(html, 'nav');
  if (nav) regions.push({ name: 'nav', selector: 'nav', html: nav });
  const header = extractElement(html, 'header');
  if (header) regions.push({ name: 'header', selector: 'header', html: header });
  const main = extractElement(html, 'main');
  if (main) regions.push({ name: 'main', selector: 'main', html: main });
  const footer = extractElement(html, 'footer');
  if (footer) regions.push({ name: 'footer', selector: 'footer', html: footer });

  return {
    domain,
    html,
    css,
    cssTokens: tokens,
    fonts: [...families],
    fontFaces,
    breakpoints: extractBreakpoints(css),
    regions,
    metrics: {},
  };
}

function absolutizeUrl(base: URL, raw: string): string | null {
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

export async function capture(domain: string, options?: { timeoutMs?: number }): Promise<CaptureBundle> {
  // 1. Playwright — richest capture (computed tokens, metrics, full rules).
  let pw: typeof import('playwright') | null = null;
  try {
    pw = await import('playwright');
  } catch {
    pw = null;
  }
  if (pw) {
    let browser: Awaited<ReturnType<typeof pw.chromium.launch>> | null = null;
    try {
      browser = await pw.chromium.launch();
      const page = await browser.newPage();
      await page.goto(domain, { timeout: options?.timeoutMs ?? 60000, waitUntil: 'domcontentloaded' });
      const result = await page.evaluate(evaluateCapture);
      return {
        domain,
        html: result.html,
        css: result.css,
        cssTokens: result.tokens,
        fonts: result.fonts,
        fontFaces: result.fontFaces,
        breakpoints: extractBreakpoints(result.css),
        regions: result.regions,
        metrics: result.metrics,
      };
    } catch {
      /* launch/navigation failed — fall through to static capture */
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }

  // 2. Static capture — browserless HTML + fetched stylesheets, no browser.
  return staticCapture(domain, options);
}
