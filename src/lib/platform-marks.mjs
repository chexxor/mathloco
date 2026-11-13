/**
 * The platform marks: one glyph per platform the club signs people up on (S026, D294).
 *
 * Why a table instead of three inline `<svg>`s in the component: the same three path strings would otherwise
 * be pasted once per link, and a schedule page with ten rows would ship ten copies of a 2.4KB glyph. The
 * sprite (`src/components/PlatformMarks.astro`) prints each path once per page and every link references it
 * by id, so the glyph data ships once and the links stay short. One table also means the gate that checks
 * the *bytes* (`scripts/check-rsvp-page.mjs`) and the probe that checks the *pixels*
 * (`design/render-gate.mjs`) are reading the same list of ids — a mark named for a platform the club does
 * not declare is caught, not waved through (D238's "one home per rule").
 *
 * Provenance, verified on the day these were copied (2026-11-13, Linux native, curl): each `d` string is
 * the single `<path>` the Simple Icons CDN serves for that name at 24x24, and the upstream license is
 * **CC0 1.0 Universal** (https://raw.githubusercontent.com/simple-icons/simple-icons/develop/LICENSE.md),
 * which is why no attribution string is required in the markup. The three URLs below are the exact requests
 * the paths came from, so a future session can re-fetch and diff them:
 *
 *   curl -sL https://cdn.simpleicons.org/meetup
 *   curl -sL https://cdn.simpleicons.org/discord
 *   curl -sL https://cdn.simpleicons.org/facebook
 *
 * They are drawn in `currentColor`, never in a brand colour: DESIGN.md's role rule (D82/D88 — no off-palette
 * colour painted on the site) does not care who owns the logo, and a brand-blue Discord glyph next to an
 * ink label is a colour the palette has no token for. `currentColor` also makes the mark turn gold on hover
 * with the label, for free.
 *
 * The ids are `pm-` + the lower-cased platform name (`pm-meetup`), and `markId()` is the only place that
 * spelling is written. `src/components/SignUpLinksCluster.svelte` builds the same string from the platform
 * the resolver already gave it; a link whose mark id does not match its platform is a gate failure, not a typo
 * nobody notices.
 */
export const MARKS = [
  {
    platform: 'Meetup',
    source: 'https://cdn.simpleicons.org/meetup',
    license: 'CC0 1.0 Universal',
    d: 'M6.98.555a.518.518 0 0 0-.105.011.53.53 0 1 0 .222 1.04.533.533 0 0 0 .409-.633.531.531 0 0 0-.526-.418zm6.455.638a.984.984 0 0 0-.514.143.99.99 0 1 0 1.02 1.699.99.99 0 0 0 .34-1.36.992.992 0 0 0-.846-.482zm-3.03 2.236a5.029 5.029 0 0 0-4.668 3.248 3.33 3.33 0 0 0-1.46.551 3.374 3.374 0 0 0-.94 4.562 3.634 3.634 0 0 0-.605 4.649 3.603 3.603 0 0 0 2.465 1.597c.018.732.238 1.466.686 2.114a3.9 3.9 0 0 0 5.423.992c.068-.047.12-.106.184-.157.987.881 2.47 1.026 3.607.24a2.91 2.91 0 0 0 1.162-1.69 4.238 4.238 0 0 0 2.584-.739 4.274 4.274 0 0 0 1.19-5.789 2.466 2.466 0 0 0 .433-3.308 2.448 2.448 0 0 0-1.316-.934 4.436 4.436 0 0 0-.776-2.873 4.467 4.467 0 0 0-5.195-1.656 5.106 5.106 0 0 0-2.773-.807zm-5.603.817a.759.759 0 0 0-.423.135.758.758 0 1 0 .863 1.248.757.757 0 0 0 .193-1.055.758.758 0 0 0-.633-.328zm15.994 2.37a.842.842 0 0 0-.47.151.845.845 0 1 0 1.175.215.845.845 0 0 0-.705-.365zm-8.15 1.028c.063 0 .124.005.182.014a.901.901 0 0 1 .45.187c.169.134.273.241.432.393.24.227.414.089.534.02.208-.122.369-.219.984-.208.633.011 1.363.237 1.514 1.317.168 1.199-1.966 4.289-1.817 5.722.106 1.01 1.815.299 1.96 1.22.186 1.198-2.136.753-2.667.493-.832-.408-1.337-1.34-1.12-2.26.16-.688 1.7-3.498 1.757-3.93.059-.44-.177-.476-.324-.484-.19-.01-.34.081-.526.362-.169.255-2.082 4.085-2.248 4.398-.296.56-.67.694-1.044.674-.548-.029-.798-.32-.72-.848.047-.31 1.26-3.049 1.323-3.476.039-.265-.013-.546-.275-.68-.263-.135-.572.07-.664.227-.128.215-1.848 4.706-2.032 5.038-.316.576-.65.76-1.152.784-1.186.056-2.065-.92-1.678-2.116.173-.532 1.316-4.571 1.895-5.599.389-.69 1.468-1.216 2.217-.892.387.167.925.437 1.084.507.366.163.759-.277.913-.412.155-.134.302-.276.49-.357.142-.06.343-.095.532-.094zm10.88 2.057a.468.468 0 0 0-.093.011.467.467 0 0 0-.36.555.47.47 0 0 0 .557.36.47.47 0 0 0 .36-.557.47.47 0 0 0-.464-.37zm-22.518.81a.997.997 0 0 0-.832.434 1 1 0 1 0 1.39-.258 1 1 0 0 0-.558-.176zm21.294 2.094a.635.635 0 0 0-.127.013.627.627 0 0 0-.48.746.628.628 0 0 0 .746.483.628.628 0 0 0 .482-.746.63.63 0 0 0-.621-.496zm-18.24 6.097a.453.453 0 0 0-.092.012.464.464 0 1 0 .195.908.464.464 0 0 0 .356-.553.465.465 0 0 0-.459-.367zm13.675 1.55a1.044 1.044 0 0 0-.583.187 1.047 1.047 0 1 0 1.456.265 1.044 1.044 0 0 0-.873-.451zM11.4 22.154a.643.643 0 0 0-.36.115.646.646 0 0 0-.164.899.646.646 0 0 0 .899.164.646.646 0 0 0 .164-.898.646.646 0 0 0-.54-.28z',
  },
  {
    platform: 'Discord',
    source: 'https://cdn.simpleicons.org/discord',
    license: 'CC0 1.0 Universal',
    d: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  },
  {
    platform: 'Facebook',
    source: 'https://cdn.simpleicons.org/facebook',
    license: 'CC0 1.0 Universal',
    d: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
];

/** The id the sprite gives a platform's glyph, and the only place that spelling is written. */
export const markId = (platform) => `pm-${String(platform).toLowerCase()}`;

export const MARK_COUNT = MARKS.length;

/** The platforms that have a glyph, as the resolver names them. A destination whose platform is not here
 *  gets no mark — and `check:rsvp-page` fails a build that paints one anyway. */
export const MARKED_PLATFORMS = MARKS.map((m) => m.platform);

/** One sprite per page render, claimed by the first cluster that renders in it.
 *
 *  Why a claim instead of a page list: the sprite is only ever read by a cluster, so the component that paints
 *  a cluster is the component that knows whether the glyph bytes are wanted. A list of "pages with clusters"
 *  would be a second home for that fact and would drift the day a page gains or loses its calendar row
 *  (D238). Astro renders a page's components in one synchronous pass, so the first cluster emits the sprite in
 *  front of itself and every later `<use>` on that page resolves to it.
 *
 *  The key is the render, never the path. This module is loaded once per process and `output: 'server'`
 *  (astro.config.mjs) means one process serves many requests: a claim keyed on `Astro.url.pathname` answered
 *  the *first* request for `/` and every request after it, so a long-running dev server - and any Worker warm
 *  from a previous request - painted three `<use>` references pointing at a sprite that was never emitted,
 *  i.e. three empty 16px boxes. The built pages are each rendered once, so every dist-based gate saw a correct
 *  page and could not see it (D297). `Astro.locals` is the request-scoped object Astro creates per request and
 *  shares with every component in that render @measured 2026-11-13 by `node design/sprite-claim.mjs` (Linux
 *  native, Node 24.22.1, `astro dev`): three consecutive requests to `/` each carry 3 `<symbol>` defs and 3
 *  `<use>` refs. The two-cluster case was measured on a throwaway fixture page rendering two clusters in one render:
 *  3 `<symbol>` defs and 6 `<use>` refs, on three requests in a row - one sprite, never two. The fixture was
 *  deleted after the measurement; the rule it proved is held by `check:sprite-claim`.
 *
 *  The sprite is worth its bytes: @measured 2026-11-13 by `node design/mark-cost.mjs` (Linux native, Node
 *  24.22.1) it adds +2,195 gzip to `/` and +2,190 to `/schedule` against +2,117 / +2,121 for inlining the same
 *  three glyphs, so it breaks even at two clusters on a page - which is what `/schedule` becomes as the
 *  calendar fills (D294). A page that paints no mark asks for no sprite: `/chat` would pay +2,201 gzip, 41.3%
 *  of its 5,327 gzip bytes, for drawings it never paints.
 */
const spriteClaims = new WeakSet();
export function spriteFor(locals) {
  // No render object to key on means we cannot know whether this render already emitted a sprite; emitting is
  // the safe answer, because a missing sprite is an invisible glyph and a duplicate one is only wasted bytes.
  if (!locals || typeof locals !== 'object') return true;
  if (spriteClaims.has(locals)) return false;
  spriteClaims.add(locals);
  return true;
}
