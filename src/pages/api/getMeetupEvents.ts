import type { APIRoute } from 'astro';
import { meetupEvent } from '../../schema/meetup';
import config from '../../config.json';
import * as cheerio from 'cheerio';
// import { drizzle } from "../../db";
import { drizzle } from 'drizzle-orm/d1';

interface MeetupEvent {
  title: string;
  url: string;
  description: string;
}

export const GET: APIRoute = async (context) => {
    const meetupGroupUrl = config.URLs.meetupGroup;
    var $ = await cheerio.fromURL(`${meetupGroupUrl}/events/rss`);

    let meetupEvents : MeetupEvent = $.extract({
        events: [{
            selector: 'item',
            value: {
                title: 'title',
                url: 'guid',
                description: 'description'
            }
        }]
    }).events;

    meetupEvents.forEach(event => {
      // Extract the eventId from the URL using a regular expression
      const match = event.url.match(/\/events\/([^\/]+)\//);
      event.eventId = match ? match[1] : null; // Fallback to the full URL if no match is found
    });
    console.log(meetupEvents);

    // Astro runtime context: https://docs.astro.build/en/guides/integrations-guide/cloudflare/#cloudflare-runtime
    const { DB } = context.locals.runtime.env;
    const db = drizzle(DB);
    await db.insert(meetupEvent)
      .values(meetupEvents)
      .onConflictDoNothing({ target: meetupEvent.eventId });

    return new Response(JSON.stringify({
        success: true,
        events: meetupEvents
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
};


