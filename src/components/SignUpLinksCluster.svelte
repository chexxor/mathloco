<script lang="ts">
  /**
   * The sign-up cluster, hydrated — the client half of the cluster `SignUpLinks.astro` paints (S022, D281).
   *
   * Two facts make this a Svelte component rather than a paragraph of markup:
   *   1. Astro server-renders every island, so the bytes in `dist/client` are produced by this file, not by
   *      a script that runs after the page loads. `check:rsvp-page` compares those bytes against
   *      `signUpPaths()` and they match, because on the server `preferred` is still `null` — `$effect` does
   *      not run during SSR, and the canonical order (Meetup, Discord, Facebook) is what a JavaScript-off
   *      visitor, a crawler and a screen reader on first paint get.
   *   2. The remembered platform is per-visitor and per-browser, and the build is static: the server cannot
   *      know it, so the only place the reorder can happen is here, in the browser.
   *
   * The rule itself lives in `src/lib/rsvp.mjs` (`PREF_KEY`, `orderByPreference`) so there is one
   * definition of "which order, and why" — this file only decides *when* it is applied.
   *
   * What is deliberately NOT here: a prompt, a toggle, or a "your preference" chip. The operator's ask was
   * "ask the user once which platform they prefer, then store their answer". The click is the answer
   * (D281): the first platform a visitor opens is remembered, and every cluster after that leads with it.
   * Nothing is hidden, removed or dimmed — the cluster is a permutation, never a filter.
   *
   * No shared module state: each island instance keeps its own `preferred` and syncs through a window
   * event, so clicking one row reorders every row on the page without two islands sharing a closure that
   * could leak across a server-rendered page (svelte-core-bestpractices: prefer per-instance state over
   * module-level state).
   */
  import { PLATFORMS, PREF_KEY, orderByPreference } from '../lib/rsvp.mjs';

  type Destination = { platform: string; href: string; label: string; srOnly: string; cta?: string };

  // Props come from SignUpLinks.astro, which is the only place `signUpPaths()` is called for a row. They
  // are primitives and plain arrays on purpose: everything in here is serialised into the island tag.
  // The state prop is called `signupState`, not `state`: a local binding named `state` makes `$state` read
  // as a store subscription of that variable (svelte.dev/e/store_rune_conflict), so a prop spelled the way
  // the attribute is spelled silently turns every rune in the file into a store call.
  let {
    destinations = [] as Destination[],
    note = null as string | null,
    date = '',
    signupState = 'none',
    hour = 'unsettled',
    meetupSnapshot = 'none',
    meetupAge = 'unknown',
    discordSnapshot = 'none',
    discordAge = 'unknown',
  } = $props();

  // `null` is the server's value and the first-visit value: no preference, canonical order.
  let preferred = $state<string | null>(null);
  // A probe handle, not styling: `scripts/check-rsvp-preference.mjs` waits for this to appear before it
  // reads the order, so the gate knows the difference between "the island has not hydrated yet" and
  // "the island hydrated and did not reorder".
  let hydrated = $state(false);

  // localStorage throws in private-mode Firefox and in some in-app browsers. A preference is a nicety: if
  // it cannot be stored, the cluster still paints in the canonical order and nothing else changes.
  // The value is only trusted when it names a platform the club declares: a hand-typed or stale value
  // (a platform this repo once supported) must not be echoed back as "your preference".
  const readPreference = (): string | null => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      return raw && Object.values(PLATFORMS).includes(raw) ? raw : null;
    } catch {
      return null;
    }
  };

  const remember = (platform: string) => {
    try {
      localStorage.setItem(PREF_KEY, platform);
    } catch {
      // Still reorder this page's clusters: the click is the signal even when it cannot be persisted.
    }
    preferred = platform;
    // Every other island on the page picks it up. A click on row 1 should not leave row 2 in the old
    // order — a "preference" that only applies to the row you clicked is not a preference.
    window.dispatchEvent(new CustomEvent('rsvp-platform', { detail: platform }));
  };

  $effect(() => {
    const stored = readPreference();
    if (stored) preferred = stored;
    hydrated = true;
    const onPick = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      preferred = typeof detail === 'string' ? detail : null;
    };
    window.addEventListener('rsvp-platform', onPick);
    return () => window.removeEventListener('rsvp-platform', onPick);
  });

  // Same markup, same classes, same attributes as before the island existed, except the top margin: round
  // 18's accepted row F (2026-11-17, S061) took the margins inside the `when-we-meet` section — where this
  // cluster stands on `/dates` — off one step, so this root carries `mt-2`. Only the order of the anchors can
  // differ otherwise. `orderByPreference` never drops an entry (D281), so a cluster with a remembered
  // platform still prints every platform the club has declared.
  const ordered = $derived(orderByPreference(destinations, preferred));
</script>

<div
  class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"
  data-rsvp-cluster
  data-rsvp-state={signupState}
  data-rsvp-date={date}
  data-rsvp-hour={hour}
  data-rsvp-snapshot={meetupSnapshot}
  data-rsvp-age={meetupAge}
  data-rsvp-discord-snapshot={discordSnapshot}
  data-rsvp-discord-age={discordAge}
  data-rsvp-hydrated={hydrated ? 'yes' : undefined}
  data-rsvp-preferred={preferred ?? undefined}
>
  <!-- An absence is a named state, never a blank (DESIGN.md "States"). The note is the resolver's own
    sentence, so the gate that reads the painted bytes is reading the same string the resolver produced. -->
  {#if note}
    <p class="text-label text-ink-3">{note}</p>
  {/if}
  {#each ordered as d, index (d.platform + ':' + index)}
    <!-- Round-4 brief §4, ruling D341 (2026-11-15): the label and its sr-only qualifier are on ONE line, with no
      whitespace between the two. Svelte keeps the text node between two expressions on separate lines, so the
      built page used to read "Sign up on Meetup , opens in a new tab" - a space before a comma, inside the
      accessible name. And the arrow span that used to close every anchor is DELETED, not styled away: the brief
      calls fifteen arrows on one page "decoration pretending to be affordance", and the affordance is the
      underline plus the qualifier (S041, D317). -->
    <!-- MS41 (S090): `data-cta` is the registry id for this destination, attached by `signUpPaths()` in
      `src/lib/rsvp.mjs` through `ctaIdFor()` — the same object already carries the label and the qualifier, so the
      island keeps no mapping of its own. `scripts/check-cta-context.mjs` reads the id off the built bytes and then
      demands an element around the link declaring its context (`data-cta-block`, on `SignUpLinks.astro`'s row). The
      attribute is inert in the browser: it is for the gate, and for whoever next asks what this link is for. -->
    <a
      href={d.href}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={d.cta}
      onclick={() => remember(d.platform)}
      data-rsvp-platform={d.platform}
      data-rsvp-date={date}
      class="min-h-8 inline-flex items-center gap-1 text-label font-medium text-ink underline decoration-rule underline-offset-2 hover:text-accent hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <!-- The platform's own glyph, 16px, before the words (operator ruling F3(b), S026/D294). Three things
         make it a mark rather than a box: it is `currentColor` (no brand colour exists in the palette, and a
         brand-blue glyph next to an ink label is an off-paint the design gate prices), it is drawn from a
         page-level sprite so a schedule with ten rows does not ship the same path ten times, and it carries
         no fill, keyline or `data-control` of its own — the row it sits in is already one boundary (D220).
         `aria-hidden` because the link's accessible name is the label text; a screen reader that also
         described the glyph would say "Meetup" twice. -->
      <svg class="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <use href={`#pm-${d.platform.toLowerCase()}`} />
      </svg>
      {d.label}<span class="sr-only">{d.srOnly}</span>
    </a>
  {/each}
</div>
