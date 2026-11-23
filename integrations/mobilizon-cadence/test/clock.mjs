/**
 * test/clock.mjs - the day the cadence tests reason about, in one home.
 *
 * `01 Config` stamps `runAt: new Date().toISOString()` (nodes/01-config.js:18,35) and `04 Plan & decide`
 * plans against `cfg.runAt` (nodes/04-plan.js:58). So every case that asserts a **date** was asserting about
 * the day it happened to run on: this suite baked the run day as "today" and went red on its own as the
 * calendar moved - 4 cases on 2026-11-21, 5 by 2026-11-23, all of them the same defect (D192 names the class:
 * a planted date that stops sitting on the side of today its case assumes; D226 records the day it fired).
 * `test/watchers.test.mjs` already pins the heartbeat's `runAt` for exactly this reason; this is the same
 * move, with the day stated once instead of per file.
 *
 * The pin is **the instant the calendar snapshot was taken**, read out of the fixture's own note, so the
 * rehearsal runs the club's rows on the day those rows were true. It is data, not a `Date` override: the
 * config node still executes its real text, and only the field the chain reads is replaced
 * (`lib/sandbox.mjs`'s `runAt`). If a future session saves a newer fixture, the pin moves with it - and if
 * the note ever stops naming an instant, this throws rather than quietly planning against a day nobody chose.
 *
 * Why the pin lives here and not in `nodes/01-config.js`, and what the alternatives cost: **D473**.
 */
export const runAtOf = (fixture) => {
  const m = /saved (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/.exec(fixture?.note ?? "");
  if (!m) {
    throw new Error(
      `test/clock.mjs: the fixture note does not name a saved instant, so the run day cannot be derived. ` +
      `note was ${JSON.stringify(fixture?.note)}. State the run day rather than letting the wall clock choose it (D192).`,
    );
  }
  return m[1];
};
