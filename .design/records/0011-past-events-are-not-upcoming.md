# 0011 — Past events never sit inside the upcoming section; where they go is still open

**Recorded 2026-11-01 by operator ruling, with the placement question deliberately deferred.**

Settled: an event that has happened, or was cancelled, is **not** interleaved with upcoming events
and does not occupy a slot in the upcoming list. If it is shown at all, it is shown somewhere else.

Still open, on purpose: *whether* past events are shown at all, and where. The operator wants that
reviewed as a product question after the design pipeline and the exercise work, not resolved as a
side effect of a token migration.

Why the "not interleaved" half was worth freezing now: `UpcomingMeetups` already filters future-only
in JS, and the one place a past/cancelled event surfaces is `EventCard`, where it gets a status word
inside an upcoming card. Whatever the eventual answer is, that surface is the wrong home for it — so
any apply work should treat "Cancelled"/"Past" as a **status word on the item's own surface** (word +
keyline, rule 12; the date column already carries the date's colour, D106) rather than as a badge in
the upcoming row. A badge would need a colour that does not exist and would not survive the pairing
rule.

No token is reserved for it. If the deferred decision lands on showing past events, the surface gets
its own keyline and `ink-3` for its dated line (5.21), reusing roles — not a new colour.
