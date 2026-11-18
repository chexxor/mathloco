# Atlassian — PRIOR.md (quarantine)

Anything we know about Atlassian **without a locator in an artifact fetched this session** lives
here. Everything in this file is marked `UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS`: it may point
at where to look, and it may not be quoted, counted, ranked, or cited in `GAP-ANALYSIS.md`.

| Item | Why it is here |
|---|---|
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the numeric value of any Atlassian **color** token | The fetched registry prints hex pairs per token (light/dark columns). We carry the *rule* about roles and pairing; no hue from here may be proposed for our palette, and the corpus has no colour authority over us. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the shape of the `@atlaskit/tokens` JSON registry (design-tokens-toolkit or otherwise), and whether a token carries a `values`/`properties` migration map | The npm package was never opened and the registry page was not fetched. The `token()` call convention and "single source of truth" claim are carried; the file format is not. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — any rule about our own runtime (Astro, Tailwind, Svelte islands) expressed in Atlassian's terms | Their lint is `@atlaskit/eslint-plugin-*` over Compiled CSS-in-JS; nothing in the fetched docs maps it onto a Tailwind `@theme` block. Any such mapping would be our inference, not their claim. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — Atlassian's motion duration and easing **numbers** | The fetched docs name `motion.duration.xlong`, `motion.easing.out.practical`, `motion.keyframe.fade.in` and a `delayStep` default of 50. The ms/easing values behind the duration and easing tokens are not printed in any fetched artifact. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — what the two ESLint plugins do rule-by-rule | Only the styling standard's own rule headings ("No Styled Components", "No Dynamic Styles", "No Global Styles", "No Nested Selectors", "Design Token Usage") are in a fetched artifact. The `design-system/recommended` ruleset's contents were not fetched, so the plugin is cited as *existing*, never as enforcing a specific rule. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the `changelog` page of any package (the fetched pages show a "Changelog" tab exists) | Version *events* (e.g. when a token was renamed) were not fetched. The migration mechanism (codemod CLI) and the status labels (`early-access`, `general-availability`, DEPRECATED) are carried because they are in fetched artifacts. |
| UNGROUNDED — NOT ELIGIBLE FOR GAP ANALYSIS — the MCP server at `mcp.atlassian.com` answering anything | The index names it; it was not contacted. It is recorded as their agent-facing distribution mechanism, not as a working channel. |

**Rule for anyone extending this file:** a line moves out of here only when it acquires a fetched
locator and a ≤40-word verbatim quote in the same commit.
