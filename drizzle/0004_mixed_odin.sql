CREATE TABLE `bot_events` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`channel` varchar(50) NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`event_data` json,
	`outcome` varchar(50) DEFAULT 'success',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bot_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `viral_analyses` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`tags` text,
	`duration` int,
	`platform` varchar(50) NOT NULL,
	`viral_score` int NOT NULL,
	`confidence_level` int DEFAULT 0,
	`hook_score` int,
	`quality_score` int,
	`trend_score` int,
	`audience_score` int,
	`format_score` int,
	`timing_score` int,
	`platform_score` int,
	`weaknesses` text,
	`recommendations` text,
	`optimized_title` text,
	`optimized_description` text,
	`optimized_tags` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `viral_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `viral_metrics` (
	`id` varchar(36) NOT NULL,
	`analysis_id` varchar(36) NOT NULL,
	`predicted_views` int,
	`predicted_engagement` decimal(5,2),
	`predicted_ctr` decimal(5,2),
	`predicted_retention` decimal(5,2),
	`actual_views` int,
	`actual_engagement` decimal(5,2),
	`actual_ctr` decimal(5,2),
	`actual_retention` decimal(5,2),
	`published_at` timestamp,
	`last_updated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `viral_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bot_events` ADD CONSTRAINT `bot_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viral_analyses` ADD CONSTRAINT `viral_analyses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viral_metrics` ADD CONSTRAINT `viral_metrics_analysis_id_viral_analyses_id_fk` FOREIGN KEY (`analysis_id`) REFERENCES `viral_analyses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_bot_events_user_id` ON `bot_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_bot_events_channel` ON `bot_events` (`channel`);--> statement-breakpoint
CREATE INDEX `idx_bot_events_event_type` ON `bot_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_bot_events_created_at` ON `bot_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_viral_analyses_user_id` ON `viral_analyses` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_viral_analyses_platform` ON `viral_analyses` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_viral_analyses_viral_score` ON `viral_analyses` (`viral_score`);--> statement-breakpoint
CREATE INDEX `idx_viral_analyses_created_at` ON `viral_analyses` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_viral_metrics_analysis_id` ON `viral_metrics` (`analysis_id`);