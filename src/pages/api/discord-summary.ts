import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getDiscordSummary } from '../../lib/discord';

export const GET: APIRoute = async () => {
  try {
    const data = await getDiscordSummary(env);
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin',
      },
    });
  } catch (error) {
    // Log the real cause server-side only; the response must not echo upstream
    // errors, secrets, or env var names to an anonymous caller.
    console.error('Error fetching Discord summary:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch Discord summary' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }
};
