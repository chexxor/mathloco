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
    <!-- The same notice grammar, one 40px action (DESIGN.md: failure is the notice with a 40px
         retry). The error branch is in the server-rendered HTML by construction: 'pending' says out
         loud that nothing has loaded, so nobody is trapped in a spinner. -->
    <div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20" role="alert">
      <p class="text-body text-ink">The channel summaries did not load.</p>
      <p class="text-body text-ink-2">
        They come from our own summary service, not from Discord. Discord is a separate service and
        may be fine.
      </p>
      <div class="mt-3">
        <button
          class="inline-flex items-center justify-center h-10 px-4 rounded-control inset-shadow-rule bg-paper text-ink text-label font-medium hover:bg-tint transition"
          onclick={() => void fetchSummary()}
        >
          Try again
        </button>
      </div>
    </div>
  {:else if phase === 'empty'}
    <!-- D108: missing content is a designed state — the fact, where it came from, one path out, and
         the dated line. Never a bare sentence, never a blank. -->
    <div class="inset-shadow-rule rounded-control px-4 py-3 min-h-20">
      <h2 class="text-lede font-bold text-ink font-body">No channel summaries on file</h2>
      <p class="text-body leading-prose text-ink-2 font-body mt-1">
        This page shows summaries our bot writes from recent channel activity. There are none on
        file, so there is nothing here to read — the channels themselves are on Discord.
      </p>
      <a
        class="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-control inset-shadow-rule bg-paper text-ink text-label font-medium hover:bg-tint transition"
        href={discordUrl}
      >
        Read Discord
      </a>
      {#if lastUpdatedLabel}
        <p class="text-label text-ink-3 mt-3">Last summary written {lastUpdatedLabel} UTC</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-6">
      {#if lastUpdatedLabel}
        <!-- A stranger needs to know what they are looking at and how old it is: the summaries are
             generated by our bot from recent channel activity, not posted by a person. -->
        <p class="text-label text-ink-3">
          Generated by our bot from recent channel activity · refreshed about daily ·
          last updated {lastUpdatedLabel} UTC
        </p>
      {/if}
      {#each data?.channels ?? [] as channel (channel.id)}
        {@const summary = summaries.get(channel.id)}
        <div class="bg-panel rounded-card overflow-hidden inset-shadow-rule">
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
