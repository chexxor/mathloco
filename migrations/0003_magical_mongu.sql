ALTER TABLE `user` RENAME COLUMN "created_dt" TO "created_at";--> statement-breakpoint
ALTER TABLE `user` RENAME COLUMN "modified_dt" TO "modified_at";--> statement-breakpoint
ALTER TABLE `user` RENAME COLUMN "deleted_dt" TO "deleted_at";--> statement-breakpoint
CREATE TABLE `meetup_event` (
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`date_time` integer NOT NULL,
	`location` text NOT NULL,
	`description` text NOT NULL,
	`attendeeCount` integer NOT NULL,
	`attendee_names` text NOT NULL,
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`modified_at` integer NOT NULL,
	`deleted_at` integer
);
