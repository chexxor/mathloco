/**
 * PS-4 — the event-card thumb, filled for the rows that have art (operator ruling 10(a), 2026-11-04, D190).
 *
 * This table used to live inside `Schedule.astro`. It moved here on the day the schedule grew a second
 * surface (a homepage card of the next date and a `/schedule` page of every date): a table of art keyed by
 * slug that exists in two files is two calendars, and the whole point of the split is that the two surfaces
 * cannot disagree about a row. `EventRow.astro` is now the only caller.
 *
 * Keyed by slug, because the file in `src/assets/photos/` is named after the row (`event-<slug>.png`,
 * D190's filename rule) and `PhotoSlot` resolves it by filename prefix. The `ratio` is **the art's own**,
 * measured from each file's PNG header rather than from its filename: the social's art is 954x460 and
 * Parallel Learning's is **1321x755**
 * @measured 2026-11-06 by reading the IHDR of `src/assets/photos/event-2026-11-11-parallel-learning.png`.
 * There is deliberately **no fallback ratio**: D168 ruled that art is not cropped to fit a box, and a default
 * declared ratio that disagrees with the file is the reflow that rule exists to prevent — the old
 * `?? '954 / 460'` would have quietly distorted the second image. A `SLOT_ART` entry is therefore a claim
 * about a specific file.
 *
 * The `alt` states only what the file's role proves. It does **not** describe the frame: this session's model
 * takes no images, and D170's rule ("alt text and provenance are quoted from the picture page, not inferred")
 * is exactly the rule that forbids writing what nobody read. The organizer's own sentence for either image is
 * asked for in `.notes/NEXT.md`; when it arrives it replaces these strings verbatim.
 *
 * A row with no entry renders NO box at all: `PhotoSlot`'s fallback is its own `<slot />`, which is empty
 * here. That is a designed absence, not a hole — DESIGN.md's states rule bars a "photo coming" box, and the
 * hatched stand-in belongs in review rounds (`npm run round10`), not on the page. The 2026-11-07 social had no
 * entry for exactly that reason until its art arrived; the row the feed dropped is now
 * `STATUS:CANCELLED` under the slug `2026-11-07-club-social-cancelled`, so `isUpcoming` drops it and it gets
 * no entry. The meeting itself still happened: the organizer re-issued it under a fresh UID at 05:44:52Z
 * (D225), and that row's slug is `2026-11-07-club-social` — the natural key, which is why the dead row was
 * renamed rather than the live one (D223's filename rule, `event-<slug>.png`).
 *
 * Two rows on one page now carry the same poster: the Nov 7 and Nov 21 socials have byte-identical art
 * (sha256 1f54c290…, verified by hashing the fetch, not by comparing filenames). The build hashes both PNGs to
 * one asset URL, so the browser downloads it once and only the repo pays the duplicate. The operator ruled
 * 2026-11-07 (ruling 2a, D228): ship the duplicate as the source supplies it; asking the club for a distinct
 * Nov 21 poster is a request for new material, not a change to this table. On `/schedule` the two rows sit
 * twelve days apart on one page, which is where a repeated poster is most visible — noted here so the next
 * session does not "fix" it by suppressing sourced art, a product call that is the operator's.
 */
export type EventArt = { ratio: string; alt: string };

export const SLOT_ART: Record<string, EventArt> = {
  '2026-11-07-club-social': {
    ratio: '954 / 460',
    alt: 'The club\u2019s own event image for this social',
  },
  '2026-11-21-club-social': {
    ratio: '954 / 460',
    alt: 'The club\u2019s own event image for this social',
  },
  '2026-11-11-parallel-learning': {
    ratio: '1321 / 755',
    alt: 'The club\u2019s own event image for this study session',
  },
};

/** The art for a row, or null. An unknown slug is a row with no art, not a row with a default. */
export const artFor = (slug: string | null | undefined): EventArt | null =>
  (slug && SLOT_ART[slug]) || null;
