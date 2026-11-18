# Material — overlay surfaces (dialog, popover, menu, tooltip) (domain 14)

Domain 14 of the fixed 18 (see `../README.md`). Status: **EVIDENCED for the state-overlay model, NOT
evidenced for overlay *geometry*** — `m2.material.io/design/interaction/states.html` (15,862 B) owns the state-overlay
mechanism, `m2.material.io/design/color/dark-theme.html` carries the dark-theme variant, `material.io/design/environment/elevation.html`
carries the one sentence about a dialog in front of other surfaces and the scrim. The component pages
(`dialogs`, `bottom sheets`, `navigation drawer`, `tooltips`) are outside the 83-URL guidelines index
and are client-rendered (`COVERAGE.md`; the m3 buttons probe returns a 3-byte digest), so **no geometry,
dismissal, or scrim-opacity number exists in this corpus** and none is claimed here.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| M14-ov-01 | A state is carried by a **covering on the element**, not by changing the element. | pattern | `https://m2.material.io/design/interaction/states.html#overlay` | "An overlay is a semi-transparent covering on an element that indicates its state." | none |
| M14-ov-02 | The overlay inherits the foreground colour, so one number moves with the pair rather than being authored twice. | pattern | `https://m2.material.io/design/interaction/states.html#overlay` | "The overlay color matches the color of the text or icon on the element that it's applied to." | none |
| M14-ov-03 | The pairing is against the **end** state's colour, which is what makes it survive a colour change mid-transition. | behavior | `https://m2.material.io/design/interaction/states.html#overlay` | "If the text or icon changes color during a state change, the overlay should match the end state's color." | none |
| M14-ov-04 | State layers are exclusive, and the precedence is stated as an example rather than as a rule table. | rule | `https://m2.material.io/design/interaction/states.html#overlay` | "Only one state layer is applied at a time." | none — and the follow-on sentence only illustrates it: focus then hover returns to focus, which is the only place the precedence is written |
| M14-ov-05 | The shape of the covering is a choice, and one of the two options is a circle. | pattern | `https://m2.material.io/design/interaction/states.html#overlay` | "An overlay can be applied to an entire element or in a circular shape." | none |
| M14-ov-06 | The ladder is stated in words per state, and the reason is always what else signals it; the words are backed by numbers, so the same surfaces across states give an increasing ladder. | token | `https://m2.material.io/design/interaction/states.html#overlay-opacity-values` | "Hover overlays should be at lower opacities to avoid distracting from content. ... Focus overlays should be at higher opacities as they are not indicated otherwise by visual cues. ... Overlay: 12% #000000 ... Overlay: 16% #000000" | none — the values are inside figure captions, not a table and not a file |
| M14-ov-08 | The opacity is not a constant: it must be re-solved for every text-on-surface combination. | rule | `https://m2.material.io/design/interaction/states.html#overlay-opacity-values` | "To ensure proper visibility and color contrast accessibility, the opacity value of overlays should be adjusted for every different combination of text on a surface." | none — stated as a requirement, and no tool in their system computes one |
| M14-ov-09 | In a dark theme the state layer does not fork; it reuses the light values and is then tuned for AA. | behavior | `https://m2.material.io/design/color/dark-theme.html#states` | "In a dark theme, states should use the same overlay values as their default (or light) theme, and they can be adjusted to pass AA-level contrast standards." | none |
| M14-ov-10 | The dark theme splits containers into two kinds, and the overlay colour is decided by which kind it is. | pattern | `https://m2.material.io/design/color/dark-theme.html#primary-containers` | "For surface containers that use the"Primary"color, their state overlay is white." | none |
| M14-ov-11 | A disabled component in a dark theme gets **two** numbers, one for its edges and one for its content. | token | `https://m2.material.io/design/color/dark-theme.html#disabled-states` | "All disabled components are displayed using 12% White for container outlines and fills and 38% White for content such as labels or icons." | none |
| M14-ov-12 | A scrim is a statement about elevation, and it is the only overlay-in-depth rule this system states. | pattern | `https://material.io/design/environment/elevation.html#depicting-elevation` | "When the background is scrimmed in a UI, it expresses that the content above it is at a higher elevation." | none |
| M14-ov-13 | **Absence, stated against what was fetched:** nothing in this corpus gives a dialog or popover its geometry, its dismissal path, or a scrim value; the model stops at "something is in front". | absence | `https://material.io/design/environment/elevation.html#the-elevation-system` | "Focus attention on the highest elevation, such as a dialog temporarily appearing in front of other surfaces." | none — the component pages that would carry geometry are client-rendered and out of the 83-URL index (`COVERAGE.md`) |

**Read against our system.** Our system currently has **no overlay surface at all**: DESIGN.md's elevation
section ships `shadow-e1` and `shadow-e2` as *"ship-defined-but-unused"* because *"No modal or dropdown is
in `src/` today"*. So most of this file is pre-loading, and only rows 01–06 and 08 are about something we do have:
our states are **fills and keylines, never a covering** — DESIGN.md's *"**Never** let a coloured fill express
a state (every shipped state fill measures 1.05–1.18 = flat)"*, and `check:render` fails a `role="status"`/`alert`
block on a fill or an inset other than 1px.

- Row 04 is the one genuinely portable idea: state layers are **exclusive**, and if two signals are needed
  both must be shown. Our nav date chip and a future hover ring are exactly the pair that could collide.
- Rows 09–11 are where they are **behind** us: a dark theme's numbers are published as prose and figure
  captions, and the state layer is expected to be re-solved per pair by hand. Our palette solves pairs
  mechanically (`check:contrast` reads the tokens out of `src/styles/global.css`) and carries `-on-ink`
  twins for the one dark ground we ship. Nothing in their system could fail a wrong pair.
- Rows 13 and the geometry absence make this file a **draft section, not a gap section**: any GAP row built
  here is about a component we do not build. It goes in §2's "pre-loading decisions before we build it"
  block, flagged as a draft, with its exit criterion being the first time a dialog exists in `src/`.
