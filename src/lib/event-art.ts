/**
 * PS-4 — the event-card thumb, filled for the rows that have art.
 *
 * **The table is EMPTY as of 2026-11-16: no row paints a plate, and no event asset is mirrored here at all.**
 *  The operator's rulings letter of 2026-11-16 (R7) owned the sweep that deleted the seven `src/assets/photos/event-*.png`
 *  in `src/assets/photos/`, and this file is one of the three references that sweep had to update (the harvest step,
 *  `EventArt.astro`, this one — the letter's own list). The map and the wiring stay rather than being deleted for two
 *  reasons: `/schedule` can gain a row's art without a component change, and a row with no entry already renders **no
 *  box at all**, so an empty table is the designed state rather than a hole. What R7 changed is the NAME such a file
 *  would carry, and this file is where a name is chosen, so it is where the rule gets stated.
 *
 * **The naming rule, superseding D190's.** D190 keyed a mirrored asset by the row — `event-<slug>.<ext>` — and a slug
 *  is a date, so one poster mirrored under seven rows became seven files naming seven dates. A decorative plate whose
 *  *name* is a false claim is still a false claim (round-4 §7.1, ruling D-D), and the date in the name was the whole
 *  reason the plate could not come back. The rule now (R7, R8) is **role + media identity, never date**:
 *
 *     <role>-<mediaUid>.<ext>          e.g. social-1f54c2.png, study-0e26aa.png
 *     role ∈ { social, study }         the two roles the club's own series vocabulary uses
 *
 * **Corrected 2026-11-23 (MS42).** The sentence below claims "the manifest in `data/events.json` records, per media,
 *  `reuseCount > 1` ⇒ `standing: true`". **It does not, and it never did** @measured 2026-11-23 by `grep -c
 *  'reuseCount\|standing' data/events.json` → **0**, and the same grep over `src/` and `scripts/` finds the words only
 *  in this comment. What the fetcher printed was a reuse count on **stdout** (DESIGN.md still quotes it that way), and
 *  the file's `image` field is a plain URL string — one of the sixteen row fields the handoff contract carries
 *  (`docs/spec/event-data-handoff.md`). So `standing: true` was a rule with a writer that never wrote it, and MS42
 *  deleted the writer: nothing in this repository computes a reuse count any more, and the handoff shape has no field
 *  for one. What still ships, and is checkable, is the naming half: `<role>-<mediaUid>.<ext>`, and no filename names a
 *  row. If `standing` is ever wanted, it is a field request to the publisher, not a number to re-derive here.
 *
 *  The repeat itself is still readable off the data: all 8 rows' `image` URLs resolve to two media uids
 *  (`1f54c290…`, `0e26aa48…`) @measured 2026-11-23 by `node -e` over `data/events.json`, which is what makes a
 *  standing asset an illustration OF A FORMAT rather than a photograph of one meeting — a claim a human makes, not one
 *  a build computes. The map is still keyed by
 *  the row, because a row has to find its art and the slug is the only handle a row has; what is gone is the file NAME
 *  derived from that key. Under D190 the slug and the filename were the same string, so a row's date was an asset's
 *  date; now an entry names the file it fills (`asset`, the role + media-uid stem the rule produces), and nothing in
 *  this file or in `EventArt.astro` can ask for a file whose name came from a date.
 *
 * **What the history below is for.** Every measurement in it is a measurement of a file that no longer exists — the
 *  ratios, the byte counts and the caps describe what shipped up to 2026-11-15, and they keep their dates because a
 *  future session reading them must not reprice them as today's. They are kept, not deleted, because each one is the
 *  reason a rule exists: an entry here is a claim about a specific file, so the shape of that claim is what a future
 *  entry has to satisfy.
 *
 * A `SLOT_ART` entry is therefore a claim about a specific file, and there is deliberately **no fallback ratio**:
 *  D168 ruled that art is not cropped to fit a box, and a default declared ratio that disagrees with the file is the
 *  reflow that rule exists to prevent — the old `?? '954 / 460'` would have quietly distorted the second image. The
 *  ratio is read from the file's own PNG header, never from its filename; the two posters that used to live here
 *  measured **954x460** (the social) and **1321x755** (the study session) @measured 2026-11-06 by reading the IHDR of
 *  the mirrored study-session PNG — a record that now lives on in `src/assets/photos/README.md`, which is where a
 *  deleted file's provenance stays.
 *
 * **An entry's `alt` is empty on purpose** when the frame has no sentence to quote (D324, 2026-11-14, superseding the
 *  strings this table used to carry: "The club's own event image for this social", 8 words that described the file
 *  rather than the picture). Nobody here has seen the frame — the session's model takes no images, and Mobilizon's
 *  `picture` objects are `{name, url, uuid}`, filenames rather than sentences — so D170 forbids inventing a description
 *  and the honest option was a declaration: WCAG's rule for an image whose information is already in the adjacent text
 *  is `alt=""`, and `scripts/check-alt.mjs` fails an empty alt that does not declare itself (`data-decorative="true"`
 *  on the wrapper, written by `EventArt.astro`), so a decorative plate is a decision on the page, not a gap. When the
 *  organizer supplies a sentence for an image, it replaces the empty alt verbatim and the declaration goes away.
 *
 * **A row with no entry renders NO box at all** — `PhotoSlot`'s fallback is its own `<slot />`, which is empty here.
 *  That is a designed absence, not a hole: DESIGN.md's states rule bars a "photo coming" box, and the hatched stand-in
 *  belongs in review rounds (`npm run round10`), not on the page. The `STATUS:CANCELLED` row is the standing example:
 *  it has no entry, `isUpcoming` drops it, and it paints no box anywhere. A dead row's key says it is dead (D223), and
 *  the key that renders used to be the one the art file was named for — that coupling is exactly what R7 removed, so
 *  the key story (a UID that went quiet keeps the `-cancelled` suffix, D299) now belongs to the row alone.
 *
 * **Posters repeat, and that repeat is now a property of the manifest rather than a fact remembered here.** Before the
 *  sweep this table held seven entries covering five printed rows for two upstream files — byte-identical art under
 *  seven names (sha256 `1f54c290…` and `0e26aa4894…`, verified by hashing the fetch rather than by comparing filenames),
 *  which is why the build hashed each group to one asset URL and a visitor downloaded two images however many rows
 *  printed. Under R7 that is `reuseCount` and `standing: true` per media — printed to stdout by the fetch run then in
 *  charge (`npm run events:harvest`, deleted with the fetchers under **MS42**) and **never written into the file**, as
 *  the correction above records
 *  (@measured 2026-11-16 by that run: 5 rows serve `1f54c2…`, 3 serve `0e26aa…`; the same two uids still serve all 8
 *  rows @measured 2026-11-23). The product call that used
 *  to live here — whether one poster should be *shown* on several rows, ruling 2a / D228 — is unchanged in kind and
 *  still the operator's; what changed is that the row of dates beside it can no longer contradict the asset's name.
 */
export type EventArt = { asset: string; ratio: string; alt: string };

/** Entries are keyed by the row that paints them, and each one names the file it fills (`asset`, the role + media-uid
 *  stem R7's rule produces — `social-1f54c2`, never `event-2026-11-07-club-social`), so the key story and the file
 *  story cannot drift apart by carrying different dates. There is no entry today, and an `alt` is empty only when the
 *  frame has no sentence to quote (D324); see the header. The strings this file used to carry ("The club's own event
 *  image for this social") are retired with the files that made them true.
 */
export const SLOT_ART: Record<string, EventArt> = {};

/** The art for a row, or null. An unknown slug is a row with no art, not a row with a default. */
export const artFor = (slug: string | null | undefined): EventArt | null =>
  (slug && SLOT_ART[slug]) || null;
