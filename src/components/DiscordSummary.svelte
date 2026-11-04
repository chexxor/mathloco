<script lang="ts">
  import type { CachedData, ChannelSummary } from '../types/discord';
  import { parseSummaryBlocks } from '../lib/sanitize';

  let { discordUrl = '' } = $props();

  // One state, not three booleans: `loading && !error && data` could be true and false at once, which
  // is how the shipped component ended up able to render a spinner next to an error sentence.
  // 'pending' is also what the server renders, and the sentence in it is true whether or not the
  // browser ever runs the fetch — so a JavaScript-off visitor is not stuck on "loading" (DESIGN.md,
  // "States: empty, loading, failed").
  let phase = $state<'pending' | 'live' | 'empty' | 'failed'>('pending');

  // `$state.raw`: the API response is a large object that is only ever reassigned, so it does not
  // need to be proxied for deep reactivity.
  let data = $state.raw<CachedData | null>(null);

  const summaries = $derived(
    new Map<string, ChannelSummary>((data?.messages ?? []).map((entry) => [entry.channelId, entry])),
  );

  // Pinned locale and timezone on purpose: this renders on the server and in the browser, and any
  // difference between the two strings is a hydration mismatch.
  const lastUpdatedLabel = $derived(data ? formatStamp(data.lastUpdated) : '');

  function formatStamp(value: Date | string): string {
    // `lastUpdated` is typed `Date` but arrives from JSON as a string, so accept both.
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  async function fetchSummary() {
    phase = 'pending';
    try {
      const response = await fetch('/api/discord-summary');
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      // A static-only deploy answers *any* unmatched path with the home page: status 200,
      // `text/html`. So `response.ok` is not evidence that we reached the API - the content type is.
      const contentType = response.headers.get('content-type') ?? 'none';
      if (!contentType.includes('application/json')) {
        throw new Error(`/api/discord-summary returned ${contentType} instead of JSON - the API route is not deployed on this host`);
      }
      data = await response.json();
      phase = data.channels.length === 0 ? 'empty' : 'live';
    } catch (cause) {
      // The bare `catch {}` here used to discard the reason, which is why a broken preview showed a
      // sentence and nothing else. The visitor gets the plain message; the console gets the cause.
      console.error('[discord-summary] load failed:', cause);
      phase = 'failed';
    }
  }

  // This island is also rendered on the server; the data load belongs in the browser only.
  if (!import.meta.env.SSR) {
    void fetchSummary();
  }
</script>

<div class="space-y-6">
  {#if phase === 'pending'}
    <!-- DESIGN.md "States": loading is one line, `role="status"`, no motion, and it reserves the
         height of the fixed part of what lands (the dated line + 24px gap + a card header = 16 + 24
         + 40 = 80px = min-h-20, measured in design/grill/states.html). No spinner: the shipped one
         measured a 2px keyline at contrast 4.98 against its ground, where --color-rule is 1.27.
         A notice, not a fill (D102): edge inset-shadow-rule, word ink, body ink-2, meta ink-3. -->
    <div
      class="inset-shadow-rule rounded-control px-4 py-3 min-h-20 flex flex-col justify-center gap-1"
      role="status"
      aria-live="polite"
    >
      <p class="text-body text-ink">The channel summaries have not loaded.</p>
      <p class="text-label text-ink-2">
        They are written by our bot from recent channel activity. Read the same thing where it is
        posted: <a class="underline hover:text-gold" href={discordUrl}>Discord</a>.
      </p>
    </div>
  {:else if phase === 'failed'}
    <!-- The same notice grammar. **A notice is one boundary** (operator ruling, 2026-11-03): the ring around
         this block is the only keyline in it, so the retry is a quiet label and the second path is an inline
         link, not a second keylined box sitting inside the first. `check:render` now fails a notice that
         contains a filled or ringed action (DESIGN.md, "Notices"). The label keeps a 32px box and a visible
         focus ring, so making it quiet does not make it unfindable by keyboard. -->
    <div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20" role="alert">
      <p class="text-body text-ink">The channel summaries did not load.</p>
      <p class="text-body text-ink-2">
        They come from our own summary service, not from Discord. Discord is a separate service and
        may be fine.
      </p>
      <div class="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <button
          class="inline-flex items-center min-h-8 text-label font-medium text-ink underline decoration-rule underline-offset-4 hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          onclick={() => void fetchSummary()}
        >
          Try again
        </button>
        <span class="text-label text-ink-3">
          or read it where it is posted: <a class="underline hover:text-gold" href={discordUrl}>Discord</a>.
        </span>
      </div>
    </div>
  {:else if phase === 'empty'}
    <!-- D108: missing content is a designed state — the fact, where it came from, one path out, and
         the dated line. Never a bare sentence, never a blank. -->
    <div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20">
      <h2 class="text-lede font-bold text-ink font-body">No channel summaries on file</h2>
      <p class="text-body leading-prose text-ink-2 font-body mt-1">
        This page shows summaries our bot writes from recent channel activity. There are none on
        file, so there is nothing here to read.
      </p>
      <!-- One boundary (see the failed branch): the path out is a sentence with a link in it, not a
           keylined box inside the notice's own ring. -->
      <p class="mt-2 text-body leading-prose text-ink-2 font-body">
        Read the same thing where it is posted: <a class="underline hover:text-gold" href={discordUrl}>the
        Discord channel</a>.
      </p>
      {#if lastUpdatedLabel}
        <p class="text-label text-ink-3 mt-3">Last summary written {lastUpdatedLabel} UTC</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-6">
      {#if lastUpdatedLabel}
        <!-- A stranger needs to know what they are looking at and how old it is: the summaries are
             generated by our bot from recent channel activity, not posted by a person.
             "refreshed about daily" was deleted 2026-11-03. Nothing schedules a daily job — there is no cron
             trigger in wrangler.toml — the mechanism is a 24-hour cache (`KV_CACHE_TTL_SECONDS`,
             `MEMORY_CACHE_TTL_MS` in src/lib/discord.ts) refilled by whoever asks first, so "daily" was a
             guess about a schedule that does not exist. `check:content` could not see it: its cadence rule
             asks whether the PAGE has a cadence source, and this page has one for the club's meeting rhythm,
             which is not a source for a cache. The dated line is the fact; nothing here claims a rhythm. -->
        <p class="text-label text-ink-3">
          Written by our bot from recent channel activity · last updated {lastUpdatedLabel} UTC
        </p>
      {/if}
      {#each data?.channels ?? [] as channel (channel.id)}
        {@const summary = summaries.get(channel.id)}
        <!-- One ground, one edge (D149-3c, record 0018): this card used to carry BOTH a `panel` fill and an
             `inset-shadow-rule` ring, which puts 2.88 (`rule` on panel) on the inside of the ring and 3.01
             (`rule` on paper) on the outside - a keyline straddling two grounds. `check:render` now measures
             both sides of every inset ring, and this branch is exactly what it cannot see: the channel cards
             only exist once the Discord fetch succeeds, so the gate's dist page never renders them. The fill
             is the half that goes, because the ring is this component's own grammar - the pending and failed
             states above are ring-and-no-fill notices measured at 3.01 - and a tint that is not a layer (panel
             is 1.04 against paper) was never doing the separation. -->
        <div class="rounded-card overflow-hidden inset-shadow-rule">
          <div class="px-4 py-3">
            <span class="text-label font-medium text-ink">#{channel.name}</span>
          </div>
          {#if summary?.summary}
            {@const blocks = parseSummaryBlocks(summary.summary)}
            {#if blocks.length > 0}
              <div class="px-4 pb-4 space-y-3">
                {#if summary.timeRange}
                  <h3 class="text-lede font-bold text-ink font-body">
                    Channel summary: {summary.timeRange}
                  </h3>
                {/if}
                <!-- Model output is rendered as text in our own markup: no raw HTML. The typography
                     ramp is written in tokens here, because `prose prose-blue` coloured the same text
                     through a class that is not a colour utility, and set 500/600 weights in a serif
                     that ships only 400 and 700. -->
                {#each blocks as block, blockIndex (block.kind + ':' + blockIndex)}
                  {#if block.kind === 'heading'}
                    <h4 class="text-body font-bold text-ink font-body">{block.text}</h4>
                  {:else if block.kind === 'list'}
                    <ul class="space-y-1 text-body leading-prose text-ink-2 font-body">
                      {#each block.items as item, itemIndex (item + ':' + itemIndex)}
                        <li>{item}</li>
                      {/each}
                    </ul>
                  {:else}
                    <p class="text-body leading-prose text-ink-2 font-body">{block.text}</p>
                  {/if}
                {/each}
              </div>
            {:else}
              <!-- A summary that parsed to no readable blocks is a state, not a blank card. -->
              <p class="px-4 pb-4 text-label text-ink-2">
                The summary for #{channel.name} arrived with nothing readable in it.
              </p>
            {/if}
          {:else}
            <p class="px-4 pb-4 text-label text-ink-2">No summary on file for #{channel.name}.</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
