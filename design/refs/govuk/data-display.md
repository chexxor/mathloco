# GOV.UK — data display

Domain 12 of the fixed 18. Status: **EVIDENCED for tables and description lists; NO EVIDENCE for empty
states.** GOV.UK is the one system of the five that treats a table as a *design object* with a caption
element, a `scope` attribute, a density class, and a version gate on that class. It is also the system
with **zero** empty-state language anywhere — the word "empty" appears in the corpus only inside a class
name and a sentence about spacing.

Pages reached: `…/components/table/` (136,313 B), `…/components/summary-list/` (195,257 B),
`…/patterns/check-answers/` (95,989 B).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G12-data-01 | A table's name is an HTML **element**, not a class, and the reason is navigation. | rule | `https://design-system.service.gov.uk/components/table/#html` | "A caption helps users find, navigate and understand tables." | none |
| G12-data-02 | Column meaning is a markup attribute, and assistive technology is the stated beneficiary. | rule | `https://design-system.service.gov.uk/components/table/#table-headers` | "Use table headers to tell users what the rows and columns represent. Use the scope attribute to help users of assistive technology distinguish between row and column headers." | none |
| G12-data-03 | Caption size is a **modifier family** on the caption role, not a new caption type. | token | `https://design-system.service.gov.uk/components/table/#captions` | "You can use govuk-table__caption--s, govuk-table__caption--m, govuk-table__caption--l and govuk-table__caption--xl classes to make them larger or smaller from the default." | none |
| G12-data-04 | Density is decided before markup: fewer cells, or split the data across tables and pages. | rule | `https://design-system.service.gov.uk/components/table/#widths` | "If possible, you should aim to have less data in your tables. If you have a lot of data, try to organise it into multiple tables or multiple pages." | none |
| G12-data-05 | When the data cannot be split, the **type size goes down on small screens** — the inverse of responsive type growth, and it is a named class. | pattern | `https://design-system.service.gov.uk/components/table/#responsive-tables` | "This class reduces the size of the text on small screens so large amounts of data has more empty space around it." | none |
| G12-data-07 | The class carries a **version gate**, stated as a version number. | token | `https://design-system.service.gov.uk/components/table/#responsive-tables` | "The CSS class govuk-table--small-text-until-tablet is only available in version 5.2 of GOV.UK Frontend and later." | none |
| G12-data-08 | A summary list is a **semantics contract**: a description list means key-plus-value and nothing else. | rule | `https://design-system.service.gov.uk/components/summary-list/#when-not-to-use-the-summary-list` | "The summary list uses the description list ( <dl> ) HTML element, so only use it to present information that has a key and at least one value." | none |
| G12-data-09 | The refusal names the alternatives by element, so the choice of structure is checkable. | rule | `https://design-system.service.gov.uk/components/summary-list/#when-not-to-use-the-summary-list` | "Do not use it for tabular data or a simple list of information or tasks, like a Task list component." | none |
| G12-data-10 | A row can carry an **action**, and the action's meaning is visual: the keyline ties it to the row. | pattern | `https://design-system.service.gov.uk/components/summary-list/#row-actions` | "When navigating visually, the borders above and below each row help to show which row action is tied to which piece of information." | none |
| G12-data-11 | The same action must be **named out of context** for screen readers, with the pattern given as words. | rule | `https://design-system.service.gov.uk/components/summary-list/#row-actions` | "To give more context, add visually hidden text to the links. This means a screen reader user will hear the row action and the 'key' label for the information it will affect, like 'Change name' or 'Change date of birth'." | none |
| G12-data-12 | Going back to edit must **repopulate** what the user already entered. | behavior | `https://design-system.service.gov.uk/components/summary-list/#row-actions` | "If a user decides to go back to a previous answer through a card or row action, make sure information they've already entered is pre-populated." | none |
| G12-data-14 | **Absence:** no empty state, no "no results", no zero-data pattern exists in any fetched page. | absence | `https://design-system.service.gov.uk/#patterns` | "Help users complete common tasks like entering names and addresses, filling in forms and creating accounts." | none |

**Read against our system — measured.** There are **no HTML tables in `src/`**: `grep -rlE '<table'
src | wc -l` → 0 this session. `check:tables` in the gate set audits *markdown tables in the tracked
prose* (`gate-run.mjs --list`: "every markdown table row in the tracked prose has its header's cell
count"), not shipped markup. So rows 01–07 are draft gaps for an unshipped surface, and the only
ranked-eligible rows from this domain are the naming rules, which apply to what we ship.

- **Rows 10/11 are live and already half-enforced here.** Our links get an accessible-name check
  (`check:ext-links` selftest plants "a platform named twice in one accessible name"), which is the
  same family as their row-action hidden text — so the transferable gap is the *inbound* half: nothing
  fails a card action whose visible words do not name what it changes.
- **Row 05/06 is the one typographic idea worth pricing** even though the surface is unshipped: at
  dense-data widths they *shrink* text on small screens, and our type contract grows it. If we ever
  render a schedule table on the join path, that pair is a real contradiction inside our own ramp, and
  our `check:space`-class detectors would have to choose a winner.
- **Row 14 is the mirror of our own finding**: we ship a designed empty state ("Zero upcoming events
  converts", DESIGN.md:394 region; "Missing content is a designed state, never a build failure",
  DESIGN.md:403) and GOV.UK ships none — this system is **behind us** on the empty-data domain, and
  that is the row to record in §3, not §2.

**Pruned to 12 claims per table (the cap), with the reason:** `G12-data-06` is the sparse-table refusal that restates `G12-data-05`; `G12-data-13` is the review-surface structure that `navigation-wayfinding.md` already carries as the journey object.
