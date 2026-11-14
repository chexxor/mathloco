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
 * entry for exactly that reason until its art arrived. After the 2026-11-13 harvest the only CANCELLED row is
 * `2026-11-21-club-social-cancelled` (UID 99df9996), which has no entry here, so `isUpcoming` drops it and it
 * paints no box anywhere. The key story changed hands that day: UID 649bf59a, published CANCELLED on 2026-11-06
 * under the slug `2026-11-07-club-social-cancelled` (D225), came back in the feed as a Nov 21 meeting, so that
 * UID now holds the natural key `2026-11-21-club-social` and the suffix moved to the UID that went quiet (D299).
 * A dead row's key says it is dead (D223), and the key that renders is the one the art file is named for.
 *
 * Five rows print on `/schedule` today and two posters cover them: the three socials have byte-identical art
 * (sha256 1f54c290…, verified by hashing the fetch, not by comparing filenames) and the two study sessions share
 * another (0e26aa4894…). The build hashes each group to one asset URL, so the browser downloads two images
 * however many rows print and only the repo pays the duplicate names. The operator ruled
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
  // MS04: the four rows the operator added on 2026-11-13. Each entry is a claim about a specific file, so
  // every ratio below is read from that file's IHDR, not copied from the row it resembles (@measured
  // 2026-11-13 by reading the IHDR of each mirrored PNG; the fetch is `cmp`-identical to the file).
  '2026-11-25-common-denominator-study-session': {
    ratio: '1321 / 755',
    alt: 'The club\u2019s own event image for this study session',
  },
  '2026-12-05-matheapolis-bimonthly-social': {
    ratio: '954 / 460',
    alt: 'The club\u2019s own event image for this social',
  },
  '2026-12-09-common-denominator-study-session': {
    ratio: '1321 / 755',
    alt: 'The club\u2019s own event image for this study session',
  },
  '2026-12-19-matheapolis-bimonthly-social': {
    ratio: '954 / 460',
    alt: 'The club\u2019s own event image for this social',
  },
};

/** The art for a row, or null. An unknown slug is a row with no art, not a row with a default. */
export const artFor = (slug: string | null | undefined): EventArt | null =>
  (slug && SLOT_ART[slug]) || null;
