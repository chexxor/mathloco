import { renderCalendar } from '../lib/ics.mjs';
import { snapshot } from '../lib/events.mjs';

/**
 * `GET /events.ics` — the feed a person pastes into Google/Apple/Outlook, and the primitive every outward
 * copy of this club's schedule hangs on (D70).
 *
 * Why a route and not a hand-editable file: the artifact is *generated* from `data/events.json`, so the same
 * rows drive the landing page and the calendar, and `npm run check:ics` can diff the shipped bytes against
 * what `src/lib/ics.mjs` renders — a feed that drifted from its data would go red rather than quietly
 * subscribe people to something the page does not say.
 *
 * Why `prerender = true` (measured on this tree, 2026-11-04): Astro writes the Response body out as
 * `dist/client/events.ics` — byte-exact, CRLF intact — and the asset layer answers it with
 * `content-type: text/calendar; charset=utf-8`. So serving the feed costs zero Worker CPU and zero upstream
 * fetch, which is the load-bearing half of D73: Mobilizon being unreachable must never be able to take the
 * schedule off the site. A redeploy is what publishes a change.
 *
 * The cache posture is the site's existing one (the apex already answers `/` and its images with
 * `cache-control: public, max-age=0, must-revalidate` behind a `cf-cache-status: HIT`), so the feed is no
 * staler than the page it came from. If that ever needs to differ, the route takes a `Cache-Control` header
 * and `check:ics` grows the matching assertion — do not leave a schedule that can go stale silently (M6).
 */
export const prerender = true;

export function GET() {
  return new Response(renderCalendar(snapshot), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      // `attachment` so a person who clicks the link gets a file their calendar app opens, not a page of raw
      // TEXT; a subscriber adding the URL by hand is unaffected by the disposition.
      'Content-Disposition': 'attachment; filename="minneapolis-math-book-club.ics"',
    },
  });
}
