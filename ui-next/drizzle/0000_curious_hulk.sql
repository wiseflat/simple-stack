CREATE TABLE `catalogs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`description` text,
	`documentation` text,
	`version` text,
	`origin` text,
	`suffix` text,
	`cron` integer DEFAULT false,
	`crontab` text,
	`dockerfile_root` text,
	`dockerfile_nonroot` text,
	`fork` integer DEFAULT false,
	`forkable` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text,
	`status` text,
	`message` text,
	`timestamp` text,
	`payload` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `infrastructures` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`is_archived` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `softwares` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`software_id` text,
	`domain` text,
	`domain_alias` text,
	`exposition` text,
	`version` text,
	`size` text,
	`instance` text,
	`status` integer DEFAULT true,
	`state` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`token_hash` text,
	`language` text DEFAULT 'fr',
	`is_disabled` integer DEFAULT false,
	`is_inactive` integer DEFAULT false,
	`is_removed` integer DEFAULT false,
	`sa` integer DEFAULT false,
	`notifications` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `variables` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text,
	`key` text NOT NULL,
	`key2` text,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
