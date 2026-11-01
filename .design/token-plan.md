# Apply plan — phase 4, against the ratified tokens

Ratify is done: the token block is in `src/styles/global.css`, the rules are in `DESIGN.md`, the
records are in `.design/records/`, and the worklist is `.design/token-map.md` (generated — rebuild it
with `node .design/gen-token-map.mjs`; it exits 1 if a class write in a replaced bucket has no
mapping, which is how `text-blue-600` on `bg-blue-100` survived to production).

Names below are the **ratified** ones. An earlier draft of this file proposed `text-cap`,
`keyline-*` and a 10-step space ladder; those names did not survive ratify — check the token block
and `DESIGN.md` before trusting anything else.

## Batch order (safest → riskiest), one commit each

1. **Dead weight first, no visual change.** Delete the 17 `shadow-*` writes, the dead
   `focus:shadow-outline-*` writes, the `border-transparent` boilerplate on 8 CTAs, the 13 leading
   writes that duplicate what the size token already carries, and the 2 `duration-300`/`ease-in-out`
   families that only ever animate colour (the `@theme` default is now 150ms + linear).
2. **Near-exact renames.** `text-gray-900/800 → text-ink`, `gray-700/600 → ink-2`, `gray-500 → ink-3`,
   `bg-book-gray → bg-ink`, `text-gray-50 → text-band-text`, `rounded-lg|md|xl → rounded-control|card`,
   `text-xs/sm/base/lg/xl/2xl/3xl → micro/label/body/lede/subhead/heading`.
3. **Tailwind palette → named roles, with the grammar fixed at the same time.** The CTA writes
   (`bg-blue-600 text-white`, `text-blue-600 bg-blue-100`) become primary (`bg-ink` + `text-band-text`)
   and secondary (`bg-tint` + `text-ink`). Do not map these one-for-one without the pairing: the
   shipped pair measured 4.30 and the naive rename measures 4.20, both under 4.5.
4. **Everything else.** The display ramp (the hero ramp inverts today: 36 → 60 → 48 → 60), the path
   hues into the calendar row, the layer bar, the notice states, the empty state.

## States to build (rules 11-14, and the operator's ruling of 2026-11-01)

- **No upcoming events → designed content, not a blank and not a build failure.** `UpcomingMeetups`
  renders `upcoming.length ? view('card') : (fallback ?? null)`, and `fallback` comes from
  `src/consts.ts`, so a feed with zero future events currently renders *literally nothing* in that
  section, and the only way to put copy there is to author a constant. There is no `{:else}` branch.
  Give it one: dated line ("No meetup scheduled yet"), one action ("Join Discord for announcements"),
  and a height reservation so the fix costs no layout shift.
- **The same treatment for the other data-driven surfaces** that can be empty or fail:
  `DiscordSummary` (loading, failed, 0 members), `EventCard` (a cancelled event currently says only
  "Cancelled" in `text-red-600` on `bg-red-50` — 1.09 against that fill = invisible), and any list
  that can come back empty.
- **`prefers-reduced-motion` guard** for the footer ∑ (3 s infinite pulse, currently ungated) and for
  any movement apply adds.
- **Past events never appear inside the upcoming section.** Whether they appear at all is a decision
  the operator deferred until after phase 5; when it is made, it lands as its own surface with its
  own date column carrying the date colour (D106: the date IS the colour — no dot).

## Gaps the token map found in the token block itself (fix before or during apply)

1. **No primary-hover fill token.** `hover:bg-blue-700` has no ratified equivalent; round 6 measured
   the hover at 7.33 against `band-text`, and ratify never wrote that value down. Solve `L` in the
   renderer (label ≥ 4.5 on the fill, fill vs `ink` ≥ 1.35) and add `--color-ink-hover`.
2. **No focus-ring pair for the dark band.** `outline-gold` is legal on paper (4.82) and illegal on
   ink (2.50); the band needs `outline-band-text` (10.19). Neither pair is asserted in the oracle yet.
3. **The footer ∑ is a coloured glyph on ink** (`text-pink-400` → `gold-on-ink`). Plain `gold` there
   measures 2.50 — the trap is that "accent" in prose means `gold`.
