CREATE TABLE `live_streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`thumbnail_url` varchar(500),
	`status` enum('pending','live','ended') NOT NULL DEFAULT 'pending',
	`viewer_count` int NOT NULL DEFAULT 0,
	`peak_viewer_count` int NOT NULL DEFAULT 0,
	`total_tips` decimal(10,2) NOT NULL DEFAULT '0.00',
	`started_at` timestamp,
	`ended_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `live_streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stream_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stream_id` int NOT NULL,
	`goal_amount` decimal(10,2) NOT NULL,
	`current_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`description` varchar(500) NOT NULL,
	`is_reached` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stream_goals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stream_tips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stream_id` int NOT NULL,
	`from_user_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stream_tips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stream_viewers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stream_id` int NOT NULL,
	`user_id` int,
	`socket_id` varchar(255) NOT NULL,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	`left_at` timestamp,
	CONSTRAINT `stream_viewers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `live_streams` ADD CONSTRAINT `live_streams_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stream_goals` ADD CONSTRAINT `stream_goals_stream_id_live_streams_id_fk` FOREIGN KEY (`stream_id`) REFERENCES `live_streams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stream_tips` ADD CONSTRAINT `stream_tips_stream_id_live_streams_id_fk` FOREIGN KEY (`stream_id`) REFERENCES `live_streams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stream_tips` ADD CONSTRAINT `stream_tips_from_user_id_users_id_fk` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stream_viewers` ADD CONSTRAINT `stream_viewers_stream_id_live_streams_id_fk` FOREIGN KEY (`stream_id`) REFERENCES `live_streams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stream_viewers` ADD CONSTRAINT `stream_viewers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_live_streams_user_id` ON `live_streams` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_live_streams_status` ON `live_streams` (`status`);--> statement-breakpoint
CREATE INDEX `idx_live_streams_created_at` ON `live_streams` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_stream_goals_stream_id` ON `stream_goals` (`stream_id`);--> statement-breakpoint
CREATE INDEX `idx_stream_tips_stream_id` ON `stream_tips` (`stream_id`);--> statement-breakpoint
CREATE INDEX `idx_stream_tips_from_user_id` ON `stream_tips` (`from_user_id`);--> statement-breakpoint
CREATE INDEX `idx_stream_tips_created_at` ON `stream_tips` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_stream_viewers_stream_id` ON `stream_viewers` (`stream_id`);--> statement-breakpoint
CREATE INDEX `idx_stream_viewers_user_id` ON `stream_viewers` (`user_id`);