<script lang="ts">
  import type { DiscordChannel, ChannelSummary } from '../types/discord';

  interface DiscordData {
    channels: DiscordChannel[];
    messages: ChannelSummary[];
  }

  let loading = true;
  let error: string | null = null;
  let data: DiscordData | null = null;

  async function fetchData() {
    try {
      const response = await fetch('/api/discord-summary');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      data = await response.json();
    } catch (err) {
      error = 'Failed to load Discord summary';
    } finally {
      loading = false;
    }
  }

  // Fetch data when component mounts
  fetchData();
</script>

<div class="space-y-6">
  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  {/if}

  {#if error}
    <div class="bg-red-50 rounded-lg p-8 text-center">
      <p class="text-red-600">{error}</p>
    </div>
  {/if}

  {#if data && !loading && !error}
    {#if data.channels.length === 0}
      <div class="bg-blue-50 rounded-lg p-8 text-center">
        <p class="text-gray-600">No channels available. Please check back later.</p>
      </div>
    {:else}
      <div class="space-y-6">
        {#each data.channels as channel}
          {@const channelData = data.messages.find(msg => msg.channelId === channel.id)}
          <div class="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
            <div class="px-4 py-3 bg-gray-100 border-b border-gray-200">
              <span class="font-medium text-gray-800">#{channel.name}</span>
            </div>
            {#if channelData?.summary}
              <div class="p-6">
                {#if channelData.timeRange}
                  <h3 class="text-lg font-semibold text-gray-800 mb-4">
                    Channel Summary: {channelData.timeRange}
                  </h3>
                {/if}
                <div class="prose prose-blue max-w-none">
                  {@html channelData.summary}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
