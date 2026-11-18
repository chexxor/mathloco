/**
 * Which built routes a crawler must not index, and the one home that says so.
 *
 * Why a module (the same split `event-window.mjs` and `ics-data.mjs` make, D238): the fact is asserted
 * twice in the artifact, by two different machines. A page says it with the `<meta name="robots">` its
 * layout prints, and the sitemap integration says the opposite with a `<loc>` entry — and a route that
 * is forbidden to a crawler while a crawler's own index file lists it is a page a search engine is told
 * both, which is the class D245 names (an artifact whose parts disagree while every gate stays green).
 * So both readers open this list rather than each keeping a copy.
 *
 * What owns each row:
 *
 * **`/past`** — D404 (round-6 communication review, `/dates`/Remove): the letter's own words, "Unlink
 * until there are three completed meetings; `noindex` the route meanwhile." The route stays *built*
 * (D117: a path the build does not emit is a 404, and the band, the sitemap and the dead-path rule all
 * read the built routes); only the crawler is told not to file an empty shelf.
 *
 * **The trigger that un-parks it:** the day `pastWindow` in `src/lib/event-window.mjs` shows three
 * completed meetings, this row goes and the page's meta tag goes with it, in the same commit. Nothing
 * here computes that count: the rows come from `data/events.json`, which this JSON-free module has no
 * reason to open, and a list a session edits on a stated trigger is cheaper than a rule that decides
 * indexability from a snapshot the sitemap cannot see.
 */
export const NOINDEX_ROUTES = ['/past'];

/** Whether a built route must carry the `noindex` meta tag — the reader `src/pages/past.astro` and the
 *  sitemap filter in `astro.config.mjs` both call this, so the two cannot be edited apart. */
export const forbidsIndexing = (route) => NOINDEX_ROUTES.includes(route);
