#!/usr/bin/env node
// vdd-clone-scaffold — turn a vdd/clone-manifest.json into a buildable,
// deployable Next.js (App Router) + Payload CMS + Postgres project.
//
// Usage:
//   node scripts/vdd-clone-scaffold.mjs --manifest vdd/clone-manifest.json --out .
//
// Emits the manifest-derived surface: Payload collections (with localization
// + relationships), payload.config.ts, the admin/REST routes (canonical Payload
// 3 route files), a token-faithful frontend shell, docker-compose (self-hosted
// Postgres), and a seed script. Pins Payload 3.69.0 + Next 15.4.10 (Node 22).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const manifestPath = resolve(arg('--manifest', 'vdd/clone-manifest.json'));
const outDir = resolve(arg('--out', '.'));

const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

const collections = manifest.collections ?? [];
const locales = manifest.locales ?? [];
const defaultLocale = locales.find((l) => l.isDefault)?.code ?? locales[0]?.code ?? 'en';

// ---------- fidelity: dataset + captured design system ----------

// The crawled dataset (title/headings/paragraphs/images per page) lives next to
// the manifest; read it so the scaffold can seed *real* content, not a dummy page.
// `manifest.dataset.path` is project-root-relative (e.g. `vdd/clone-dataset.json`)
// while the manifest itself sits at `<root>/vdd/clone-manifest.json`, so try the
// project root first and fall back to the manifest's own directory.
const projectRoot = dirname(dirname(manifestPath));
let dataset = null;
if (manifest.dataset?.path) {
  const p = manifest.dataset.path;
  for (const candidate of [resolve(projectRoot, p), resolve(dirname(manifestPath), '..', p), resolve(dirname(manifestPath), p)]) {
    try {
      dataset = JSON.parse(await readFile(candidate, 'utf-8'));
      break;
    } catch {
      dataset = null;
    }
  }
}
const crawledPages = dataset?.pages ?? [];

// The content collection that backs rendered pages (defaults to `pages` for
// WordPress-derived models, else the first plural collection).
const pageCollection =
  collections.find((c) => c.slug === 'pages')?.slug ??
  collections.find((c) => c.slug.endsWith('s'))?.slug ??
  collections[0]?.slug ??
  'pages';
const pageCol = collections.find((c) => c.slug === pageCollection);
const titleField = pageCol?.useAsTitle && pageCol.useAsTitle !== 'id' ? pageCol.useAsTitle : 'title';

// Design system: full token set (colors are a subset), captured CSS, font faces,
// and the rendered region HTML (header/nav, hero, main, footer) from the live site.
const tokens = { ...(manifest.designSystem?.colors ?? {}), ...(manifest.designSystem?.tokens ?? {}) };
const capturedCss = manifest.designSystem?.css ?? '';
const fontFaces = manifest.designSystem?.fontFaces ?? [];
const regions = manifest.designSystem?.regions ?? [];

// The captured region HTML references the original's relative asset paths
// (images, fonts) that don't exist in the clone. Rewrite `src`/`srcset`/media
// attributes to the original origin (hotlink) so the clone renders the same
// imagery; leave `href` links internal (they should point into the clone).
function absolutizeAssetSrcs(html, target) {
  if (!html) return html;
  let origin = 'https://example.com';
  try { origin = new URL(target).origin; } catch { /* keep default */ }
  const abs = (u) => {
    const p = (u || '').trim();
    if (!p || /^(https?:|data:|#|\/\/)/i.test(p)) return u;
    if (p.startsWith('/')) return origin + p;
    return origin + '/' + p.replace(/^(\.\.?\/)+/, '');
  };
  return html
    .replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (_m, q, val) => {
      const out = val.split(',').map((seg) => {
        const mm = seg.trim().match(/^(\S+)(.*)$/);
        return mm ? abs(mm[1]) + mm[2] : seg;
      }).join(',');
      return `srcset=${q}${out}${q}`;
    })
    .replace(/\b(src|poster|data-src|data-bg)\s*=\s*(["'])(.*?)\2/gi, (_m, attr, q, val) => `${attr}=${q}${abs(val)}${q}`);
}

const headerHtml = absolutizeAssetSrcs(regions.find((r) => r.name === 'header')?.html || regions.find((r) => r.name === 'nav')?.html || '', manifest.target);
const footerHtml = absolutizeAssetSrcs(regions.find((r) => r.name === 'footer')?.html || '', manifest.target);
const heroHtml = absolutizeAssetSrcs(regions.find((r) => r.name === 'hero')?.html || '', manifest.target);
const mainHtml = absolutizeAssetSrcs(regions.find((r) => r.name === 'main')?.html || '', manifest.target);

// ---------- helpers ----------

const FIELD_MAP = {
  text: 'text',
  textarea: 'textarea',
  richText: 'richText',
  number: 'number',
  boolean: 'checkbox',
  date: 'date',
  email: 'email',
  select: 'select',
  relationship: 'relationship',
  upload: 'upload',
  array: 'array',
};

function payloadField(f, indent = '    ') {
  const type = FIELD_MAP[f.type] ?? 'text';
  const parts = [`name: '${f.name}'`, `type: '${type}'`];
  if (f.localized && type !== 'relationship') parts.push('localized: true');
  if (f.required) parts.push('required: true');
  if (type === 'select' && Array.isArray(f.options)) {
    parts.push(`options: [${f.options.map((o) => `'${o}'`).join(', ')}]`);
  }
  if (type === 'relationship') {
    parts.push(`relationTo: '${f.relationTo}'`);
    if (f.hasMany) parts.push('hasMany: true');
  }
  if (type === 'upload') parts.push("relationTo: 'media'");
  return indent + `{\n${indent}  ${parts.join(', ')}\n${indent}}`;
}

function labelFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function pascal(kebab) {
  return kebab.split('-').filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

function slugFromPath(path) {
  const clean = (path || '/').replace(/^\/+|\/+$/g, '');
  if (!clean) return 'home';
  return clean.replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase();
}

// Real content rows (slug + title) for the seed script, derived from the crawl.
const seedRows = crawledPages.map((p) => ({
  slug: slugFromPath(p.path),
  title: p.title || p.headings?.[0] || p.path || 'Untitled',
}));

function collectionFile(c) {
  const useAsTitle = c.useAsTitle || 'title';
  const fields = c.fields
    .filter((f) => f.name !== 'id' && f.name !== 'language')
    .map((f) => payloadField(f))
    .join(',\n');
  const label = c.label || labelFromSlug(c.slug);
  return `import type { CollectionConfig } from 'payload'

export const ${pascal(c.slug)}: CollectionConfig = {
  slug: '${c.slug}',
  labels: { singular: '${label}', plural: '${label}' },
  admin: { useAsTitle: '${useAsTitle}' },
  access: { read: () => true },
  fields: [
${fields}
  ],
}
`;
}

// ---------- collections ----------

const collectionImports = collections.map((c) => `import { ${pascal(c.slug)} } from './collections/${pascal(c.slug)}'`).join('\n');
const collectionRegistry = collections.map((c) => pascal(c.slug)).join(', ');

// ---------- design tokens ----------

const fontStack = manifest.designSystem?.fonts?.length
  ? manifest.designSystem.fonts.map((f) => (f.includes(' ') ? `"${f}"` : f)).join(', ') + ', sans-serif'
  : 'sans-serif';

const tokenVars = Object.entries(tokens)
  .filter(([, v]) => v && String(v).trim())
  .map(([k, v]) => `  ${k}: ${v};`)
  .join('\n');

const fontFaceCss = fontFaces
  .filter((f) => f && f.family && f.src)
  .map((f) => `@font-face { font-family: ${f.family.includes(' ') ? `"${f.family}"` : f.family}; src: ${f.src}; }`)
  .join('\n');

const siteName = manifest.name || 'Cloned Site';
const target = manifest.target;

// ---------- files ----------

const files = {};

files['package.json'] = JSON.stringify({
  name: 'clone-site',
  version: '1.0.0',
  private: true,
  type: 'module',
  // Pin pnpm so the Docker image (corepack) uses the same version that honors
  // `pnpm.onlyBuiltDependencies` below — otherwise sharp/esbuild postinstall
  // scripts are ignored and `pnpm install` fails inside the container.
  packageManager: 'pnpm@10.30.3',
  scripts: {
    dev: 'next dev',
    build: 'payload generate:importmap && next build',
    start: 'next start',
    payload: 'payload',
    'generate:importmap': 'payload generate:importmap',
    'generate:types': 'payload generate:types',
    seed: 'payload run src/seed.ts',
  },
  dependencies: {
    next: '15.4.10',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    payload: '3.69.0',
    '@payloadcms/next': '3.69.0',
    '@payloadcms/ui': '3.69.0',
    '@payloadcms/db-postgres': '3.69.0',
    '@payloadcms/richtext-lexical': '3.69.0',
    graphql: '^16.8.1',
    sharp: '0.33.5',
    dotenv: '^16.4.5',
  },
  devDependencies: {
    typescript: '^5.6.0',
    '@types/node': '^22.0.0',
    '@types/react': '^19.0.0',
    '@types/react-dom': '^19.0.0',
  },
  pnpm: {
    // pnpm 10 blocks postinstall scripts by default; sharp/esbuild need them
    // for their native binaries, otherwise `next build` and image handling fail.
    onlyBuiltDependencies: ['sharp', 'esbuild'],
  },
}, null, 2) + '\n';

files['next.config.mjs'] = `import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    localPatterns: [{ pathname: '/api/media/file/**' }],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: path.resolve(dirname) },
}

export default withPayload(nextConfig)
`;

files['tsconfig.json'] = JSON.stringify({
  compilerOptions: {
    lib: ['DOM', 'DOM.Iterable', 'ES2022'],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: 'esnext',
    moduleResolution: 'bundler',
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: 'react-jsx',
    incremental: true,
    plugins: [{ name: 'next' }],
    paths: {
      '@/*': ['./src/*'],
      '@payload-config': ['./src/payload.config.ts'],
    },
    target: 'ES2022',
  },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
  exclude: ['node_modules'],
}, null, 2) + '\n';

files['src/payload.config.ts'] = `import sharp from 'sharp'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { buildConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
${collectionImports}

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, ${collectionRegistry}],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  localization: {
    locales: [${locales.map((l) => `'${l.code}'`).join(', ')}],
    defaultLocale: '${defaultLocale}',
    fallback: true,
  },
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI || '' } }),
  sharp,
})
`;

files['src/collections/Users.ts'] = `import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [{ name: 'email', type: 'email', required: true }],
}
`;

for (const c of collections) {
  files[`src/collections/${pascal(c.slug)}.ts`] = collectionFile(c);
}

files['src/app/(payload)/layout.tsx'] = `import config from '@payload-config'
import '@payloadcms/next/css'
import type { ServerFunctionClient } from 'payload'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'
import { importMap } from './admin/importMap.js'

type Args = { children: React.ReactNode }

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({ ...args, config, importMap })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
`;

files['src/app/(payload)/admin/[[...segments]]/page.tsx'] = `import type { Metadata } from 'next'
import config from '@payload-config'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const Page = ({ params, searchParams }: Args) =>
  RootPage({ config, params, searchParams, importMap })

export default Page
`;

files['src/app/(payload)/admin/[[...segments]]/not-found.tsx'] = `import type { Metadata } from 'next'
import config from '@payload-config'
import { generatePageMetadata, NotFoundPage } from '@payloadcms/next/views'
import { importMap } from '../importMap.js'

type Args = {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams })

const NotFound = ({ params, searchParams }: Args) =>
  NotFoundPage({ config, importMap, params, searchParams })

export default NotFound
`;

files['src/app/(payload)/api/[...slug]/route.ts'] = `import config from '@payload-config'
import '@payloadcms/next/css'
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from '@payloadcms/next/routes'

export const GET = REST_GET(config)
export const POST = REST_POST(config)
export const DELETE = REST_DELETE(config)
export const PATCH = REST_PATCH(config)
export const PUT = REST_PUT(config)
export const OPTIONS = REST_OPTIONS(config)
`;

// ---------- frontend ----------

// The captured CSS can carry relative `url(...)` asset references (fonts,
// images) that don't exist in the clone. Next/webpack parses `globals.css` and
// fails on unresolvable urls, so the captured CSS is instead written to
// `public/` (served raw, never parsed) with `url(...)` refs rewritten to the
// original origin (hotlink), and pulled in via a <link> tag.
function absolutizeCssUrls(css, target) {
  let origin = 'https://example.com';
  try { origin = new URL(target).origin; } catch { /* keep default */ }
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_m, q, u) => {
    const p = (u || '').trim();
    if (/^(https?:|data:|#|\/\/)/i.test(p)) return _m; // already absolute / data / anchor
    if (p.startsWith('/')) return `url(${q}${origin}${p}${q})`;
    const clean = p.replace(/^(\.\.?\/)+/, '');
    return `url(${q}${origin}/${clean}${q})`;
  });
}

// Base reset + tokens only (webpack-safe: no url() refs). A minimal fallback
// shell is injected only when nothing was captured.
const BASE_CSS = absolutizeCssUrls(`:root {
${tokenVars || '  --color-fg: #140D14;\n  --color-bg: #FFFFFF;'}
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: ${fontStack}; }
a { color: inherit; }
`, target);

const FALLBACK_SHELL_CSS = `body { color: var(--color-fg, #140D14); background: var(--color-bg, #FFFFFF); }
.site-header { display: flex; align-items: center; gap: 2rem; padding: 1rem 2rem; border-bottom: 1px solid var(--color-border, #e8e8e8); }
.site-header .brand { font-weight: 700; }
.site-nav { display: flex; gap: 1.25rem; }
.site-footer { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; padding: 2rem; border-top: 1px solid var(--color-border, #e8e8e8); }
main { padding: 2rem; max-width: 1080px; margin: 0 auto; }
@media (max-width: 768px) { .site-footer { grid-template-columns: 1fr; } .site-nav { display: none; } }
`;

// Pin JS-driven layout sizes to the values measured on the live site. Page
// builders (Divi, Elementor, …) often set logo/header dimensions at runtime;
// without their JS the clone renders them at intrinsic size and breaks layout.
const metrics = manifest.designSystem?.metrics ?? {};
const normParts = [];
if (metrics.logoHeight) {
  normParts.push(`#logo { height: ${metrics.logoHeight}px !important; width: auto !important; max-height: ${metrics.logoHeight}px !important; }`);
}
// A fixed header overlays the content; offset it by the measured header height,
// but only on desktop — mobile header heights differ and are JS-driven.
if (metrics.headerPosition === 'fixed' && metrics.headerHeight) {
  normParts.push(`@media (min-width: 981px) { main { padding-top: ${metrics.headerHeight}px; } }`);
}
const NORMALIZE_CSS = normParts.length
  ? '/* layout normalization — sizes measured on the live site */\n' + normParts.join('\n') + '\n'
  : '';

files['src/app/(frontend)/globals.css'] = BASE_CSS + (capturedCss ? NORMALIZE_CSS : FALLBACK_SHELL_CSS);

if (capturedCss || fontFaceCss) {
  const raw = (fontFaceCss ? fontFaceCss + '\n' : '') + (capturedCss || '') + NORMALIZE_CSS;
  files['public/captured.css'] = absolutizeCssUrls(raw, target) + '\n';
}

files['src/app/(frontend)/layout.tsx'] = `import React from 'react'
import './globals.css'

export const metadata = { title: '${siteName}' }

const HEADER_HTML = ${JSON.stringify(headerHtml)};
const FOOTER_HTML = ${JSON.stringify(footerHtml)};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/captured.css" />
      </head>
      <body>
        {HEADER_HTML ? (
          <div className="site-header-root" dangerouslySetInnerHTML={{ __html: HEADER_HTML }} />
        ) : (
          <header className="site-header">
            <span className="brand">${siteName}</span>
            <nav className="site-nav">
              <a href="/">Home</a>
              <a href="/admin">Admin</a>
            </nav>
          </header>
        )}
        {children}
        {FOOTER_HTML ? (
          <div className="site-footer-root" dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />
        ) : (
          <footer className="site-footer">
            <div>${siteName}</div>
            <div>Locales: ${locales.map((l) => l.code).join(', ') || '—'}</div>
            <div>Payload + Next.js</div>
            <div>Clone of ${target}</div>
          </footer>
        )}
      </body>
    </html>
  )
}
`;

files['src/app/(frontend)/page.tsx'] = `const MAIN_HTML = ${JSON.stringify(mainHtml)};
const HERO_HTML = ${JSON.stringify(heroHtml)};

export default function Home() {
  return (
    <main>
      {MAIN_HTML ? (
        <div className="site-main-root" dangerouslySetInnerHTML={{ __html: MAIN_HTML }} />
      ) : HERO_HTML ? (
        <div className="site-hero-root" dangerouslySetInnerHTML={{ __html: HERO_HTML }} />
      ) : (
        <h1>${siteName}</h1>
      )}
    </main>
  )
}
`;

files['docker-compose.yml'] = `services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "\${PG_PORT:-5433}:5432"
    environment:
      POSTGRES_USER: clone
      POSTGRES_PASSWORD: clone
      POSTGRES_DB: clone
    volumes:
      - clone-pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clone"]
      interval: 5s
      timeout: 3s
      retries: 10

  app:
    build: .
    ports:
      - "\${APP_PORT:-3001}:3000"
    environment:
      DATABASE_URI: postgres://clone:clone@postgres:5432/clone
      PAYLOAD_SECRET: \${PAYLOAD_SECRET:-dev-secret-change-me}
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  clone-pg:
`;

files['Dockerfile'] = `FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json ./
RUN pnpm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm generate:importmap && pnpm build

FROM base AS run
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
`;

files['src/seed-data.json'] = JSON.stringify(seedRows, null, 2) + '\n';

files['src/seed.ts'] = `import { getPayload } from 'payload'
import config from '@payload-config'
import { readFileSync } from 'fs'

async function seed() {
  const payload = await getPayload({ config })
  const existing = await payload.find({ collection: '${pageCollection}', limit: 1 })
  if (existing.totalDocs > 0) {
    console.log('${pageCollection} already seeded; skipping')
    return
  }
  let rows: Array<{ slug: string; title: string }> = []
  try {
    rows = JSON.parse(readFileSync(new URL('./seed-data.json', import.meta.url), 'utf-8'))
  } catch {
    rows = []
  }
  let created = 0
  for (const row of rows) {
    try {
      await payload.create({
        collection: '${pageCollection}',
        data: { slug: row.slug, ${titleField}: row.title, status: 'published' },
      })
      created++
    } catch {
      // skip rows that fail (e.g. unknown field in a non-WordPress model)
    }
  }
  console.log('seeded ' + created + ' ${pageCollection} from src/seed-data.json')
}

await seed()
`;

files['.env.example'] = `DATABASE_URI=postgres://clone:clone@localhost:5432/clone
PAYLOAD_SECRET=replace-me-with-a-long-random-string
`;

files['.dockerignore'] = `node_modules
.next
.env
.git
vdd
run-clone.mjs
*.log
`;

files['.gitignore'] = `node_modules
.next
.env
payload-types.ts
src/app/(payload)/admin/importMap.js
`;

// ---------- write ----------

let count = 0;
for (const [rel, content] of Object.entries(files)) {
  const abs = resolve(outDir, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  count++;
}

console.log(`scaffolded ${count} files from ${manifestPath} -> ${outDir}`);
console.log(`collections: ${collections.map((c) => c.slug).join(', ') || '(none)'}`);
console.log(`locales: ${locales.map((l) => l.code).join(', ') || '(none)'}`);
console.log('next steps:');
console.log('  1. cp .env.example .env  (set PAYLOAD_SECRET)');
console.log('  2. pnpm install && pnpm build   (on the build box if building remotely)');
console.log('  3. docker compose up -d  (self-hosted Postgres + app)');
