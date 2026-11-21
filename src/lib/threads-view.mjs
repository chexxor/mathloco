/**
 * threads-view.mjs — the one rule about what of the archive may reach a page (**S089**, **D465**).
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM `threads.mjs`. The rule is one sentence and must be stated once
 * (**D264**): the gate, the harvester and the rendered page have to agree on what "ratified" means, and two
 * paraphrases is how a file passes the tool that wrote it and fails the check. But `threads.mjs` is the *file*
 * module — it reads and writes `data/discord-threads.json`, so it imports `node:fs` and resolves the repo root
 * off `import.meta.url`. A page cannot carry that: Astro's prerender bundle keeps the root expression in the
 * chunk and evaluates it where `import.meta.url` is not a URL, and `/chat` died on `TypeError: Invalid URL
 * string` @measured 2026-11-21 by `npm run build`. So the file machinery and the publishing rule are separate
 * modules, and the page graph imports the rule alone: no `node:fs`, no path assumption, nothing to resolve at
 * request time in a Worker it never touches. `src/lib/threads.mjs` re-exports both functions, so every existing
 * caller (`scripts/check-thread-topics.mjs`, `scripts/harvest-threads.mjs`) keeps importing one home.
 *
 * WHAT THE VIEW IS. Signed topics, as `{ id, topic }`, sorted, frozen. Not aliases (model output that may carry
 * a handle), not evidence (channel and message ids and dates), not `_note`. A component cannot print what it was
 * not handed — that is the shape of the privacy rule **D461**, and it is why `check:thread-topics`'s dist half
 * is a backstop rather than the primary defence.
 */

/** Does this entry point at messages at all? An entry with no message ids is a claim, not a record. */
export const hasEvidence = (t) => (t?.evidence ?? []).some((e) => (e?.messageIds ?? []).length > 0);

/** A thread a human has signed, with the pointers to back it. This is the whole test for "may it be
 *  published", and it is stated once (D264) so the gate, the reader and the review surface agree.
 *
 *  There is deliberately no `--approve` flag on the harvester. A command that could write
 *  `approvedBy: "operator"` would let any session manufacture the operator's signature, which is the one
 *  authority this file exists to require (S088): names come from a model, publication comes from a human, and a
 *  signature is the human's edit, not a flag. `--review --links` brings the evidence to a person; the person
 *  signs in the file (@measured 2026-11-20: all 31 harvested entries were signed by hand that way, and
 *  `check:thread-topics` then reported 31 will render). */
export function isRatified(t) {
  return t?.status === 'approved' && !!t?.approvedBy && !!t?.approvedAt && hasEvidence(t);
}

/**
 * The only view the pages are allowed to take: approved topics, as `{ id, topic }`, frozen. No aliases, no
 * dates, no channel or message ids - a component cannot print what it was not handed, and an alias is model
 * output that may contain a handle, so it stays out of built bytes (D461).
 *
 * Sorted by topic, and undated by decision: the page shows what the club pulls on *now*, not a timeline of
 * what it did (S088).
 *
 * The JSDoc return type is load-bearing, not a comment: `astro check` types the .astro call sites from it, and
 * `topics.map((t) => …)` in `src/components/ThreadArchive.astro` is an implicit-any error without it
 * @measured 2026-11-21 by `npm run check` (ts7006, the only error in an otherwise warning-clean tree).
 *
 * @param {any} doc the archive document, or null
 * @returns {{ id: string, topic: string }[]} the signed topics, frozen
 */
export function publishedThreads(doc) {
  return (doc?.threads ?? [])
    .filter(isRatified)
    .map((t) => Object.freeze({ id: t.id, topic: t.topic }))
    .sort((a, b) => String(a.topic).localeCompare(String(b.topic)));
}
