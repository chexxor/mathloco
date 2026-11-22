// changelog-version.mjs — the ONE reading of a changelog table in this rig.
//
// persona.md and grading-rule.md both keep an append-only changelog table outside their markers, and
// both harnesses have to stamp which version a round used: a question count means nothing next to
// another round's count unless the file names the reader that produced it, and a pile total means
// nothing unless it names the rule that sorted it. Two scripts reading that table with two different
// regexes is two answers to one question, so the reading lives here (the same reason
// `src/lib/rsvp.mjs` is the only place the platform list exists).
//
// The table's shape is `| version | date | round | ... |`. Rows are append-only and the LAST row wins,
// because the changelog describes the current text, not the first draft of it.
//
// @returns {{version:string,date:string,round:string}|null} null means the file has no changelog row
export function changelogVersion(raw) {
  const rows = [...raw.matchAll(/^\|\s*(\d+)\s*\|\s*([\d-]+)\s*\|\s*(\d+)\s*\|/gm)].map((m) => ({
    version: m[1],
    date: m[2],
    round: m[3],
  }));
  return rows.length ? rows[rows.length - 1] : null;
}
