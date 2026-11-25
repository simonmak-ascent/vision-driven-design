import { describe, it, expect } from 'vitest';
import { runClone } from '../src/clone-pipeline.js';
import type { SiteDataset } from '../src/clone-types.js';

// Hermetic resolver: the gate refuses non-public answers, so the suite injects one.
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('runClone (pure, browser + crawl disabled)', () => {
  it('normalizes and produces deterministic empty output without network', async () => {
    const r = await runClone('https://www.example.com', { browser: false, crawl: false, lookup: publicLookup });
    expect(r.normalized).toEqual({ scheme: 'https', host: 'example.com' });
    expect(r.browserSkipped).toBe(true);
    expect(r.crawlSkipped).toBe(false);
    expect(r.dataset).toBeUndefined();
    expect(r.model.platform).toBe('unknown');
    expect(r.model.entities).toEqual([]);
    expect(r.backend.migrations).toEqual([]);
    expect(r.backend.payloadCollections).toEqual([]);
    expect(r.manifest).toBeUndefined();
    expect(r.tools).toHaveLength(6);
  });

  it('rejects an invalid domain', async () => {
    await expect(runClone('not a url', { browser: false, crawl: false })).rejects.toThrow('INVALID_HOST');
  });

  it('reuses a provided dataset without crawling (idempotency)', async () => {
    const dataset: SiteDataset = {
      root: 'https://example.com',
      crawledAt: new Date().toISOString(),
      maxPages: 200,
      truncated: false,
      pages: [
        {
          url: 'https://example.com/',
          path: '/',
          title: 'Home',
          description: '',
          lang: 'en',
          headings: ['Hello'],
          paragraphs: ['A long enough paragraph for the reuse test.'],
          images: [],
          links: [],
        },
      ],
    };
    const r = await runClone('https://example.com', { browser: false, crawl: true, reuseDataset: dataset, lookup: publicLookup });
    expect(r.dataset).toBe(dataset);
    expect(r.crawlSkipped).toBe(false);
    expect(r.manifest).toBeDefined();
    expect(r.manifest!.dataset.pageCount).toBe(1);
  });
});
