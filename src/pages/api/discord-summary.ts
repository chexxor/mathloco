import { getDiscordSummary } from '../../lib/discord';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const data = await getDiscordSummary();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error fetching Discord data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Discord data' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
