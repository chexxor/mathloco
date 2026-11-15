# 0028 — a series carries two names, and the two surfaces print different ones

**The question the round-3 read raised.** The read asked whether the club's event names are a
vocabulary or whatever the organizer typed. It is not a copy question: it is the question of which
name a reader is given, on which surface, and whether the answer can change without anyone editing
the page.

**What the code already does** (`src/lib/event-groups.mjs:64`, read 2026-11-15). A row carries
`series` — the club's own name for the meeting — and `summary` — the organizer's `SUMMARY`, verbatim.
`asUpcomingItems()` prints `series`; the feed publishes `summary` (§D189: a quotation, not the club's
claim). `meetingKind` exists so grouping and a description template can both use a name without
comparing spellings, and it says so: `MPLS Math Club - Bimonthly Social` and `Matheapolis -
Bimonthly Social` are the same meeting under either spelling.

**The measurement** (2026-11-15, this tree, over `data/events.json`, `dist/client/events.ics` and
`dist/client/schedule/index.html`; the full dump is `.design/tmp-naming-2026-11-15.txt`, gitignored):

| surface | what it prints | rows | distinct names |
|---|---|---|---|
| `data/events.json` (`series`) | `MPLS Math Club Social` ×5, `Common Denominator - Study Session` ×2, `Parallel Learning for Mathematical Minds` ×1 | 8 | **3** |
| `data/events.json` (`summary`) | `Matheapolis - Bimonthly Social` ×3, `Common Denominator - Study Session` ×2, `MPLS Math Club - Bimonthly Social` ×2, `Parallel Learning for Mathematical Minds` ×1 | 8 | **4** |
| `dist/client/events.ics` (`SUMMARY:` lines) | same four strings; the one CANCELLED row is superseded per D318's grouping note | 7 | **4** |
| `dist/client/schedule/index.html` (`<h2>` row heads) | `MPLS Math Club Social` ×3, `Common Denominator - Study Session` ×2 | 5 | **2** |

**What the measurement says.** Two different names, both correct, printed by two surfaces of one
record: the feed says `Matheapolis - Bimonthly Social`, the schedule page says `MPLS Math Club
Social`, and both come off the same UID (`649bf59a…`, CONFIRMED). That is D189's rule working — the
feed quotes the organizer, the page speaks in the club's vocabulary — and it is also the reason a
reader cannot tell that the two are the same meeting. `seriesNote` is read by the code and written by
nothing: **0 of 8 rows carry one** @measured 2026-11-15, which is the shape the read's
"bold name plus a muted clause" ask would land in without a new field. Nothing in the repo asserts that the club's
vocabulary has a fixed list of members, which is why the disagreement is not a defect the gates can
see: `check:ics` compares *kinds* (`event-groups.mjs`'s own comment: "a byte-level gate can only
compare kinds, not names"), and `check:naming` owns page names, not series names.

**What the code would make worse, measured before anyone proposed it** (this is the reason to decide
the vocabulary first):

| shape | what it touches | why |
|---|---|---|
| rename inside `summary` | the organizer's verbatim field | D92's copy rule and `check:ics`'s read-verbatim rule; and the next harvest overwrites it, because the harvest writes what Mobilizon typed |
| rename inside `series` | the club's own vocabulary, one field per row | legal today; an editor's re-typed series name can drift from the other rows |
| one canonical name in both | the feed quotation | makes the club's word a quotation attributed to the organizer — it isn't one (D189) |
| a `seriesNote` beside the series | one new optional field | already read by the code (`row.seriesNote` is consulted at `event-groups.mjs:64`) and not yet written by the data |

**The escalation, not the decision.** Which names are *in* the club's vocabulary — is
`Common Denominator` a series the club runs, or one meeting the club attended? — is the operator's
(the N1 ruling on series names, still open). A delegate that picked names would be inventing what the
club calls its own meetings, which is the D309 one-name-per-page class and the MS25 ask in the same
breath.
