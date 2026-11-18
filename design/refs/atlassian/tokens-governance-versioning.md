# Atlassian — tokens governance & versioning

Domain 18 of the fixed 18. Status: **EVIDENCED**. This is the system whose governance model our
gate model is compared against, so the `enforcement in source` column here is the point.

Artifacts reached: `https://atlassian.design/llms.txt`,
`https://atlassian.design/llms-tokens.txt`,
`https://atlassian.design/llms-styling.txt`,
`https://atlassian.design/llms-primitives.txt`,
`https://atlassian.design/llms-a11y.txt`,
`https://atlassian.design/llms-components.txt`.

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| A18-gov-01 | The registry declares itself the single home of design decisions. | pattern | `https://atlassian.design/llms.txt#Design-Tokens` | "Single source of truth for design decisions" | none (a purpose line) |
| A18-gov-02 | The registry repeats it, then makes it a closed set in imperatives. | rule | `https://atlassian.design/llms-tokens.txt#Tokens-list` | "You must ONLY use tokens listed in this document, do not make up values." | lint (the value contract; typescript errors at write time) |
| A18-gov-03 | Two plugins, both configured as `recommended` presets, so enforcement is opt-in per codebase and the preset is the unit of policy. | pattern | `https://atlassian.design/llms.txt#Linters-and-Scanners` | "plugin:@atlaskit/ui-styling-standard/recommended" | lint |
| A18-gov-04 | Their rules are **named as refusals**, in the negative: no styled components, no dynamic styles, no global styles, no nested selectors. | rule | `https://atlassian.design/llms-styling.txt#Key-Rules` | "No usage of nested selectors within CSS styling, eg. `& > div` or `& span`" | lint |
| A18-gov-05 | A suppression of their own type check is forbidden — a rule that exists to stop the enforcement being turned off. | rule | `https://atlassian.design/llms-styling.txt#Typescript-errors-with-atlaskitcss` | "Do not ever `@ts-ignore` or `@ts-expect-error` these." | lint (and none can suppress) |
| A18-gov-06 | Failure is diagnosed as legality: if it errors, the value was never allowed. | pattern | `https://atlassian.design/llms-styling.txt#Common-issues` | "If a CSS value is failing, that value is not allowed, you typically require a token value" | lint |
| A18-gov-07 | A token rename is a **machine migration**, run by a named CLI with named packages. | pattern | `https://atlassian.design/llms.txt#Migration-Tools` | "--packages=@atlaskit/tokens#theme-to-design-tokens" | gate (a codemod is run, not a hunt) |
| A18-gov-08 | Deprecation is stated in the index itself, and the replacement is named next to the thing being removed. | pattern | `https://atlassian.design/llms.txt#Core-Packages` | "Package: `@atlaskit/primitives` (legacy, deprecated)" | none (prose in the index) |
| A18-gov-09 | Every component carries an availability status, and `early-access` is one of the values — a feature flag inside a design system. | token | `https://atlassian.design/llms-components.txt#Motion-component` | "**Status:** early-access" | none |
| A18-gov-10 | The docs are published **for agents**: machine sub-indexes, an MCP server, and a skill bundle "generated from the same content as this file". | pattern | `https://atlassian.design/llms.txt#Internal-skill-atlassian-design-system-Atlassian-only` | "generated from the same content as this file" | none |
| A18-gov-11 | Their index is the enumeration: five sub-indexes are named, so "what exists and what is missing" is a file, not a crawl. | pattern | `https://atlassian.design/llms.txt#Links-to-other-sets` | "The complete ADS documentation including all other sets and this file" | none |
| A18-gov-12 | **Absence:** no version number, no changelog rule, no deprecation *date*, and no policy for how long a deprecated token stays live — all in fetched artifacts, none stated. | absence | `https://atlassian.design/llms-primitives.txt#Overview` | "The original `@atlaskit/primitives` package is deprecated." | none |

**Read against our system:** this is the corpus's most valuable file for §2 and §3, and the reading
is deliberately split:

- **What our model already beats (DIVERGENT-KEEP):** rows 03, 05, 06 — their enforcement is a
  write-time type/lint contract that a project opts into, and nothing proves it ran on a given
  codebase; our enforcement is a ship-time gate set that a deploy cannot pass without, and each
  gate's selftest plants its defect. Their strongest property (05: no suppression) is the property
  ours already has by construction.
- **What we lack and should steal (the mechanism, not the plugin):** row 07 — a *migration*
  mechanism. Our system has no answer to "a token was renamed", and the cost of hunting one is the
  cost our own `check:decisions` and `audit-references` already pay for ids and paths; that pair is
  the reason a rename migration is a real gap for us rather than a future one.
- **What their governance is behind on:** row 12. We version by milestone with tracked status
  (`MILESTONES.md`) and append-only ids; they state a deprecation without a date, a duration, or a
  removal rule.
