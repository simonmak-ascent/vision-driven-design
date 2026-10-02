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

async function getJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
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

export async function probeCms(domain: string, timeoutMs = 15000): Promise<CmsDescriptor> {
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
  );
  if (!root) return empty;

  const types = await getJson<Record<string, RawWpType>>(restBase + '/wp/v2/types', timeoutMs);
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

  const taxonomies = await getJson<Record<string, RawWpTaxonomy>>(restBase + '/wp/v2/taxonomies', timeoutMs);
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

  const languages = await getJson<RawPolylangLanguage[]>(restBase + '/pll/v1/languages', timeoutMs);
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
