<script lang="ts">

  interface Event {
    title: string;
    description: string;
    url: string;
  }

  let events: Event[] = $state([]);
  let error = $state();

  const fetchEvents = async () => {
    console.log('fetching events');
    try {
      const response = await fetch('/api/getMeetupEvents');
      const data = await response.json();

      if (data.success && data.events.length > 0) {
        events = data.events;
      } else {
        error = 'No events found';
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      error = 'Error fetching events';
    }
  };

</script>


{#if error}
  <p class="text-red-600">{error}</p>
{:else if events.length > 0}
  {#each events as event}
    <div class="bg-white p-6 rounded-lg shadow-lg mb-6 transition-transform transform hover:scale-105">
      <h3 class="text-2xl font-bold text-gray-800">{event.title}</h3>
      <p class="mt-2 text-gray-600">{@html event.description}</p>
      <a href="{event.url}" target="_blank" class="text-blue-600 hover:underline">View Event</a>
    </div>
  {/each}
{:else}
  <button
    id="fetchEvents"
    class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-300 ease-in-out"
    onclick={fetchEvents}>
    Fetch Events
  </button>
{/if}


<style>

</style>
