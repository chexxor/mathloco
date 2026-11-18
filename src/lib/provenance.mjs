/**
 * The provenance rule, in one plain-JS module (D322, 2026-11-14).
 *
 * Why it lives here rather than inside `src/lib/content.ts`: the site needs the wording and the gate
 * (`scripts/check-provenance.mjs`) needs the arithmetic, and a gate that re-implements the rule it is
 * checking is the drift `check:schedule-window` exists to prevent (D238). Node cannot import a `.ts`
 * file that uses `import.meta.glob`, so the rule has to be in a module both sides can read.
 *
 * The rule, as ruled: a "how current is this" line says **how long ago** inside 30 days and **when**
 * beyond it. `allowDate: false` is not an escape hatch — it is D306's ruling that `/` may print no
 * calendar date, expressed as an argument, so the threshold, the wording and the calendar arithmetic
 * still live here.
 */

/**
 * How long an **age** form stays honest, in days, on an artifact this repo ships (**D431**, 2026-11-18; supersedes
 * the 30-day threshold `WINDOW` of D322, which is kept as a decision rather than renumbered).
 *
 * D322's reason for 30 was register: one site, one register, so a reader can compare two stamps. It left a second
 * fact unexamined - the only stamp this site prints is `data/events.json`'s `source.fetchedAt`, and that is set by a
 * step a human runs (`npm run events:harvest`; the 2026-11-13 stamp is still in the file on 2026-11-18 because no
 * harvest has run since). So an age is never corrected against a newer read, and it grows into a self-pitying number:
 * "5 days ago" reads as *apologetic* rather than as *stale*, and it spends the reader's arithmetic on an epoch the
 * page never states. Round-7 review put that in words the reviewer used - "an absolute date ('checked Nov 17') ages
 * honestly; '4 days ago' ages into an apology" - and the page agreed with it. Past this constant the form is the
 * calendar date, which a reader can check against their own clock and which cannot decay. The age form is still what
 * a surface ruled date-free prints (D306's ruling, carried as `allowDate: false`): such a surface has no date to
 * print, so an age is the only honest freshness it can carry, and `ageSince`'s own coarsening (days → months → years)
 * is what keeps a stale age from pretending precision.
 */
export const AGE_HONEST = 1;

/** Whole days between an ISO calendar date and `now`, or null when the string is not a date. */
export const daysSince = (iso, now = new Date()) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(y, m - 1, d)) / 86_400_000);
  return Number.isFinite(days) ? days : null;
};

/** "Nov 3, 2026" from an ISO calendar date — parsed as a calendar date, never as an instant, so a build
 * running in UTC cannot print the day before. */
export const formatSince = (iso) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return String(iso ?? '');
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
};

/** How long ago a stamp was taken, in the digits a visitor can compare: "today", "yesterday", "<n> days ago", "3 months ago". */
export const ageSince = (iso, now = new Date()) => {
  const [y, m, d] = String(iso ?? '').split('-').map(Number);
  if (!y || !m || !d) return 'recently';
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(y, m - 1, d)) / 86_400_000);
  if (!Number.isFinite(days) || days < 0) return 'recently';
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 45) return `${days} days ago`;
  const months = Math.round(days / 30.44);
  if (months < 18) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365.25);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

/**
 * One provenance format for every "how current is this" line on the site: **an age only for a stamp taken
 * today or yesterday, the calendar date beyond that** (D322's register, D431's threshold). A surface ruled
 * date-free (`/`, D306) passes `allowDate: false` and gets the age form of the same rule, coarsened by
 * `ageSince` - it has no date to print, so an age is the only freshness it can carry.
 */
export const provenanceStamp = (iso, { allowDate = true, now = new Date() } = {}) => {
  const days = daysSince(iso, now);
  if (days === null || days < 0) return 'recently';
  const stamp = String(iso ?? '').slice(0, 10);
  if (!allowDate || days <= AGE_HONEST) return ageSince(stamp, now);
  return `on ${formatSince(stamp)}`;
};
