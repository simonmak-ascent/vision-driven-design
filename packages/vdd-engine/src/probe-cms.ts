// A-002b — CMS probe (network, plain fetch — no browser required).
// Detects a WordPress site by probing the REST discovery endpoints and returns
// a typed CmsDescriptor: content types, taxonomies, and Polylang locales.
// Pure-adjacent: network I/O only; deterministic given the live site.

import type { CmsContentType, CmsDescriptor, CmsTaxonomy, I18nLocale } from './clone-types.js';

const UA = 'vdd-clone/1.0 (+https://github.com/simonmak-ascent/vision-driven-design)';

interface RawWpType {
  slug?: string;
  name?: string;
  rest_base?: string;
  hierarchical?: boolean;
  has_archive?: boolean;
  taxonomies?: string[];
}

interface RawWpTaxonomy {
  slug?: string;
  name?: string;
  rest_base?: string;
  types?: string[];
}

interface RawPolylangLanguage {
  slug?: string;
  name?: string;
  locale?: string;
  w3c?: string;
  home_url?: string;
  page_on_front?: number;
  is_default?: boolean;
}

async function getJson<T>(url: string, timeoutMs: number, guard?: (u: string) => Promise<boolean>): Promise<T | null> {
  // WordPress commonly 301s `/wp-json` to `/wp-json/`; follow at most two hops, gating each one.
  for (let hop = 0; hop <= 2; hop += 1) {
    if (guard && !(await guard(url))) return null;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'manual',
        headers: { 'user-agent': UA, accept: 'application/json' },
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return null;
        url = new URL(location, url).toString();
        continue;
      }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeLocale(raw: RawPolylangLanguage): I18nLocale {
  return {
    code: raw.slug ?? 'en',
    name: raw.name ?? raw.slug ?? 'en',
    locale: raw.locale ?? 'en_US',
    w3c: raw.w3c ?? 'en-US',
    homeUrl: raw.home_url ?? '',
    pageOnFront: typeof raw.page_on_front === 'number' ? raw.page_on_front : undefined,
    isDefault: raw.is_default === true,
  };
}

export async function probeCms(domain: string, timeoutMs = 15000, guard?: (u: string) => Promise<boolean>): Promise<CmsDescriptor> {
  const restBase = domain + '/wp-json';
  const empty: CmsDescriptor = {
    platform: 'unknown',
    detectedAt: new Date().toISOString(),
    contentTypes: [],
    taxonomies: [],
    languages: [],
  };

  // Quick root probe — is a REST API even present?
  const root = await getJson<{ name?: string; description?: string; routes?: Record<string, unknown> }>(
    restBase + '/',
    timeoutMs,
    guard,
  );
  if (!root) return empty;

  const types = await getJson<Record<string, RawWpType>>(restBase + '/wp/v2/types', timeoutMs, guard);
  const contentTypes: CmsContentType[] = types
    ? Object.values(types)
        .filter((t): t is RawWpType => !!t && typeof t === 'object')
        .map((t) => ({
          slug: t.slug ?? '',
          name: t.name ?? t.slug ?? '',
          restBase: t.rest_base ?? t.slug ?? '',
          hierarchical: t.hierarchical === true,
          hasArchive: t.has_archive === true,
          taxonomies: Array.isArray(t.taxonomies) ? t.taxonomies : [],
        }))
        .filter((t) => t.slug.length > 0)
    : [];

  const taxonomies = await getJson<Record<string, RawWpTaxonomy>>(restBase + '/wp/v2/taxonomies', timeoutMs, guard);
  const taxonomyList: CmsTaxonomy[] = taxonomies
    ? Object.values(taxonomies)
        .filter((t): t is RawWpTaxonomy => !!t && typeof t === 'object')
        .map((t) => ({
          slug: t.slug ?? '',
          name: t.name ?? t.slug ?? '',
          restBase: t.rest_base ?? t.slug ?? '',
          types: Array.isArray(t.types) ? t.types : [],
        }))
        .filter((t) => t.slug.length > 0)
    : [];

  const languages = await getJson<RawPolylangLanguage[]>(restBase + '/pll/v1/languages', timeoutMs, guard);
  const locales: I18nLocale[] = (languages ?? [])
    .filter((l): l is RawPolylangLanguage => !!l && typeof l === 'object')
    .map(normalizeLocale);

  return {
    platform: 'wordpress',
    detectedAt: new Date().toISOString(),
    version: undefined,
    name: root.name,
    description: root.description,
    restBase,
    contentTypes,
    taxonomies: taxonomyList,
    languages: locales,
  };
}
