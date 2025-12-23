CREATE TABLE `ad_analyses` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`product` text NOT NULL,
	`target_audience` text NOT NULL,
	`goal` enum('awareness','traffic','conversions','engagement') NOT NULL,
	`description` text,
	`tone` varchar(50),
	`budget` int,
	`headline` text NOT NULL,
	`body_text` text NOT NULL,
	`cta` text NOT NULL,
	`image_url` text NOT NULL,
	`image_prompt` text,
	`overall_score` int NOT NULL,
	`hook_score` int,
	`clarity_score` int,
	`urgency_score` int,
	`value_score` int,
	`cta_score` int,
	`strengths` text,
	`weaknesses` text,
	`recommendations` text,
	`predicted_ctr` decimal(5,2),
	`predicted_cpc` decimal(6,2),
	`predicted_conversions` int,
	`predicted_roas` decimal(6,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ad_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thumbnail_analyses` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`video_title` text NOT NULL,
	`niche` varchar(100) NOT NULL,
	`style` varchar(50),
	`platform` varchar(50) NOT NULL DEFAULT 'youtube',
	`image_url` text NOT NULL,
	`image_prompt` text,
	`text_overlay` text,
	`overall_score` int NOT NULL,
	`ctr_score` int,
	`clarity_score` int,
	`emotion_score` int,
	`contrast_score` int,
	`text_score` int,
	`strengths` text,
	`weaknesses` text,
	`recommendations` text,
	`predicted_ctr` decimal(5,2),
	`predicted_views` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thumbnail_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ad_analyses` ADD CONSTRAINT `ad_analyses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `thumbnail_analyses` ADD CONSTRAINT `thumbnail_analyses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_ad_analyses_user_id` ON `ad_analyses` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ad_analyses_goal` ON `ad_analyses` (`goal`);--> statement-breakpoint
CREATE INDEX `idx_ad_analyses_overall_score` ON `ad_analyses` (`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_ad_analyses_created_at` ON `ad_analyses` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_thumbnail_analyses_user_id` ON `thumbnail_analyses` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_thumbnail_analyses_niche` ON `thumbnail_analyses` (`niche`);--> statement-breakpoint
CREATE INDEX `idx_thumbnail_analyses_platform` ON `thumbnail_analyses` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_thumbnail_analyses_overall_score` ON `thumbnail_analyses` (`overall_score`);--> statement-breakpoint
CREATE INDEX `idx_thumbnail_analyses_created_at` ON `thumbnail_analyses` (`created_at`);