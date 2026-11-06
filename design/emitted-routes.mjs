// emitted-routes.mjs — which paths the build actually emits, read off the artifact.
//
//   import { emittedRoutes } from './emitted-routes.mjs';
//   emittedRoutes();                       // -> ['/', '/404', '/chat', '/schedule']
//   emittedRoutes('dist/client', { include404: false });
//
// Why this is a module and not a line in each probe. Three design tools used to carry their own literal
// list of routes — `['/', '/404', '/chat']` in `render-gate.mjs` and `line-length.mjs`, `['/']` in
// `pixel-ground.mjs` and `whitespace-survey.mjs`. A literal list is a memory, and the day `src/pages/
// schedule.astro` landed it was a wrong memory: the new page was invisible to every numeric rule the render
// gate enforces (control heights, contrast, one dark band, notice grammar, nav fit) until someone
// remembered to edit the probe. `scripts/check-content.mjs` already refused to remember its routes — its
// comment says "a route is a file, so `/chat` is `chat/index.html` and `/404` is `404.html`" — and the
// render probes now read the same artifact the same way.
//
// What a caller still passes explicitly: one route, when debugging one page (`node design/render-gate.mjs
// /schedule`), and the homepage-only probes (`check:space`, `check:ground`) whose question is about the
// landing page's emptiness and painted ground. Those keep a `--routes` argument and default to '/' — they
// are not stale, they are scoped, and each says so in its own header.
import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** @param {string} distDir @returns {string[]} route paths, '/' first, then alphabetical */
export const emittedRoutes = (distDir = resolve('dist/client')) => {
  if (!existsSync(distDir)) return [];
  const html = readdirSync(distDir, { recursive: true })
    .map((f) => String(f))
    .filter((f) => f.endsWith('.html'));
  const routes = html
    .map((f) => f.replace(/\\/g, '/').replace(/^\//, ''))
    .map((rel) => rel.replace(/\/index\.html$/, '').replace(/\.html$/, ''))
    .map((p) => (p === 'index' || p === '' ? '/' : `/${p}`));
  return [...new Set(routes)].sort((a, b) => (a === '/' ? -1 : b === '/' ? 1 : a.localeCompare(b)));
};
