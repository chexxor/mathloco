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

  type Destination = { platform: string; href: string; label: string; srOnly: string };

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

  // Same markup, same classes, same attributes as before the island existed; only the order of the
  // anchors can differ. `orderByPreference` never drops an entry (D281), so a cluster with a remembered
  // platform still prints every platform the club has declared.
  const ordered = $derived(orderByPreference(destinations, preferred));
</script>

<div
  class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1"
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
    <a
      href={d.href}
      target="_blank"
      rel="noopener noreferrer"
      onclick={() => remember(d.platform)}
      data-rsvp-platform={d.platform}
      data-rsvp-date={date}
      class="min-h-8 inline-flex items-center gap-1 text-label font-medium text-ink underline decoration-rule underline-offset-2 hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      {d.label}{' '}
      <!-- The visible label names the platform and the action (D273); the suffix exists for the case where a
        link is lifted out of context — a screen reader's link list — and has to say it leaves the page. -->
      <span class="sr-only">{d.srOnly}</span>
      <span aria-hidden="true">→</span>
    </a>
  {/each}
</div>
