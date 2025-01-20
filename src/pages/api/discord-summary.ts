import type { APIRoute } from 'astro';
import { getDiscordSummary } from '../../lib/discord';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const data = await getDiscordSummary();
    console.log(data);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Add CORS headers if needed
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      }
    });
  } catch (error) {
    console.error('Error fetching Discord summary:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch Discord summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

