PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_meetup_event` (
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`date_time` integer NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`attendeeCount` integer,
	`attendee_names` text,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`modified_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_meetup_event`("event_id", "name", "url", "date_time", "location", "description", "attendeeCount", "attendee_names", "id", "created_at", "modified_at", "deleted_at") SELECT "event_id", "name", "url", "date_time", "location", "description", "attendeeCount", "attendee_names", "id", "created_at", "modified_at", "deleted_at" FROM `meetup_event`;--> statement-breakpoint
DROP TABLE `meetup_event`;--> statement-breakpoint
ALTER TABLE `__new_meetup_event` RENAME TO `meetup_event`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `meetup_event_event_id_unique` ON `meetup_event` (`event_id`);