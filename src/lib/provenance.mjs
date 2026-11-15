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

/** The ruled window, in days (D322). */
export const WINDOW = 30;

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

/** How long ago a stamp was taken, in words: "today", "yesterday", "11 days ago", "3 months ago". */
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
 * One provenance format for every "how current is this" line on the site: relative inside `WINDOW`
 * days, absolute beyond it. A surface ruled date-free (`/`, D306) passes `allowDate: false` and gets
 * the age form of the same rule.
 */
export const provenanceStamp = (iso, { allowDate = true, now = new Date() } = {}) => {
  const days = daysSince(iso, now);
  if (days === null || days < 0) return 'recently';
  const stamp = String(iso ?? '').slice(0, 10);
  if (!allowDate || days < WINDOW) return ageSince(stamp, now);
  return `on ${formatSince(stamp)}`;
};
