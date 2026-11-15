/**
 * src/lib/links.mjs — the wording of the accessible-name suffix every link that LEAVES the site carries.
 *
 * Why a file of its own (S041, D317, 2026-11-14). The commissioned read (§5.5) asked for
 * `target="_blank" rel="noopener"` plus an arrow and `<span class="sr-only">(opens in a new tab)</span>`,
 * "consistent on every page". Checked against the artifact, the rel and the arrow were already there and the
 * qualifier was already sr-only — what was missing was consistency: four outbound anchors carried no
 * qualifier at all, and where one existed it repeated the platform the label had just named
 * ("Sign up on Meetup Meetup, opens in a new tab"). A rule that lives in four components is a rule that
 * drifts, so the wording is written once here and every component imports it. `scripts/check-ext-links.mjs`
 * checks the built artifact against the same shape; this module is where the string exists.
 *
 * It has no imports on purpose: an island that needs the qualifier (DiscordSummary.svelte) must not pull the
 * whole RSVP resolver into its bundle to say four words.
 */

/** The exact phrase the gate looks for. Change it here and the gate's clean control changes with it. */
export const NEW_TAB_QUALIFIER = ', opens in a new tab';

/** Derive the suffix from the label rather than typing it per link. A label that already names the platform
 *  needs only the mode of opening; a label that is an event title needs the platform too, or two rows on the
 *  same date read alike to a screen reader (D273). */
export const newTabQualifier = (label, platform) =>
  String(label ?? '').toLowerCase().includes(String(platform ?? '').toLowerCase())
    ? NEW_TAB_QUALIFIER
    : ` on ${platform}, opens in a new tab`;
