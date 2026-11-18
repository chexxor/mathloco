# Material — feedback / notices & status (domain 11)

Domain 11 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for help and for an error *state*,
NOT evidenced for a notice as an object or for any status vocabulary** — `material.io/design/communication/help-feedback.html`
(the twin; the m2 path returned the shell) owns help placement, the two named icons and help writing;
`m2.material.io/design/interaction/states.html` owns the eleven-state vocabulary; `m2.material.io/design/color/color-usage.html` owns the
rule that a brand colour may not double as a meaning. Nothing here defines a dismissable notice, a severity
ladder, or a status word, and the absence is stated as such in the last rows.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M11-help-01 | An error is a **state of a component**, not a message on a page — the whole of their error contract in one clause. | behavior | `https://m2.material.io/design/interaction/states.html#types-of-states` | "An error state communicates a user or system mistake." | none |
| M11-help-02 | Words can carry state, and that is admitted as an *additional* signifier rather than the primary one. | pattern | `https://m2.material.io/design/interaction/states.html#messaging` | "Messaging may be additional signifiers of state." | none |
| M11-help-03 | A meaning colour and a brand colour must be different colours — the collision is refused, with a reason — so their alert colour is required to be **outside the brand**, which is the mirror of our own refusal. | rule | `https://m2.material.io/design/color/color-usage.html#meaning` | "Since red is a brand color, don't also use it to convey an error state. ... Choose alternative alert colors that don't use brand coloring." | none — and no alert colour is proposed anywhere in the fetched corpus |
| M11-help-05 | A state change should be signalled in more than colour, and the alternatives are named. | rule | `https://m2.material.io/design/color/color-usage.html#state` | "It's best to indicate a change of state in more than one way, such as by displaying an icon or moving the location of an element." | none |
| M11-help-06 | Colour-alone is refused for meaning, in the data case as well as the UI case. | rule | `https://m2.material.io/design/communication/data-visualization.html#color-indicates-meaning` | "Don't use color alone to indicate meaning." | none |
| M11-help-07 | Help has a **placement decision procedure** keyed to whether the app has a drawer and how complex it is. | pattern | `https://material.io/design/communication/help-feedback.html#placement` | "If your app is complex and has a navigation drawer, place a link to"Help"both in the navigation drawer and the app bar." | none — the three cases are prose; nothing can check that a product picked one |
| M11-help-08 | Order in a drawer is a rule, and it is stated for help **and** for sign-out — the last-slot invariant. | rule | `https://material.io/design/communication/help-feedback.html#navigation-drawer` | "Anytime"Sign out"appears in a navigation drawer, it should be the last item in the list." | none |
| M11-help-09 | Urgent problems get the help affordance promoted into the app bar, and the examples are *payment* examples. | rule | `https://material.io/design/communication/help-feedback.html#app-bar` | "To provide help for urgent issues, such as payments and refunds, place a Help icon in the app bar." | none |
| M11-help-10 | The help icon is a **named icon**, and the variation is refused twice — speech bubbles, bugs, chat. | rule | `https://material.io/design/communication/help-feedback.html#icons` | "Don't use icon variations, such as chat or bug icons." | none |
| M11-help-11 | Help writing is bounded twice: short, and free of jargon. | rule | `https://material.io/design/communication/help-feedback.html#writing` | "Keep explanations as short as possible, without giving details that aren't relevant to typical usage." | none; the pair's second bound is "Avoid using technical terms in help content where possible." |
| M11-help-12 | **Absence:** this system names an error *state* and a help *channel*, and never states a severity ladder, a status vocabulary, or when a notice is dismissable. | absence | `https://m2.material.io/design/interaction/states.html#types-of-states` | "Messaging may be additional signifiers of state." | none — the state vocabulary runs enabled/hover/focused/selected/activated/pressed/dragged/disabled/error/loading and stops there |
| M11-help-13 | **Absence, stated against a fetched page:** the recovery path for a problem is a *person* asking, not the page correcting itself. | absence | `https://material.io/design/communication/help-feedback.html#send-feedback` | "Users can submit comments, report bugs, and ask questions that are not already answered by the help content." | none |

**Read against our system — ours is the notice, and it is a fully specified object theirs does not have.**
DESIGN.md's notice grammar: a notice is **word + keyline** on the page's own ground, edge `inset-shadow-rule`
(3.66 paper / 3.85 panel / 3.10 tint / 4.69 band), word `ink`, body `ink-2`, meta `ink-3`, padding 12/16,
one-line notice 48px, two-line body 64px, **no fill**; the caution variant takes the `accent` keyline and
word (5.77 on paper, 4.89 on a tint) because our system has **no signal hue** — *"**Never** add a signal hue:
the system has no red and no amber, and severity is carried by the notice's keyline and word"*.
And it is gated: `check:render` fails a `role="status"`/`alert` block on a fill, on an inset other than 1px,
on a keyline under the 3.0 graphic bar, on text under the 4.5 bar, or on a block under 48px.

- Rows 03 and 05–06 are the same family our system holds **more strictly**: we have no alert colour at all, so the
  brand-collision they refuse cannot occur, and the thing that carries severity is the keyline's role and the
  status word. Theirs is a rule about avoiding a colour; ours is a rule about which device carries severity.
- Row 08 is the one portable invariant with no counterpart today: **the last slot is a fixed meaning.** Our
  nav is one row at every width with four labels, and nothing states what the last label must be; if a help
  or sign-out path is ever added, that row is the rule that would apply.
- Row 11's two bounds on help prose are the shape our `check:alt` and `check:line-art` caps already use
  (12-word alt cap, 12-word figure-label cap) — same intent, ours with numbers and a selftest.
- Rows 12–13 are the honest half: this system cannot inform our notice grammar, its status words
  (`Scheduled` / `Cancelled` / `Past`) or its freshness register (relative inside 30 days, absolute beyond,
  D322). Those are the parts where the corpus's five-system spread matters, and the systems that carry a
  mechanism there are GOV.UK and Carbon, not Material.
