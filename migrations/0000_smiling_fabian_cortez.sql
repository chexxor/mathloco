CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`created` integer NOT NULL,
	`modified` integer NOT NULL,
	`deleted` integer
);
