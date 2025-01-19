import type { APIRoute } from 'astro';
import { getDiscordSummary } from '../../lib/discord';

export const GET: APIRoute = async () => {
  try {
    const data = await getDiscordSummary();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch Discord summary' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

