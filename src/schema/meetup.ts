// src/schema/user.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { commonColumns } from "../schema";

const meetupEvent = sqliteTable("meetup_event", {

  eventId: text("event_id").notNull().unique(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  dateTime: integer("date_time", { mode: "timestamp_ms" }),
  location: text("location"),
  description: text("description"),
  attendeeCount: integer("attendeeCount"),
  attendeeNames: text("attendee_names", { mode: 'json' }).$type<string[]>(),

  ...commonColumns
});

export { meetupEvent };
