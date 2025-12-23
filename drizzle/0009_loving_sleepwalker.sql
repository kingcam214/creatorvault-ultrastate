CREATE TABLE `creator_metrics` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`platform_post_id` varchar(36),
	`platform` enum('tiktok','instagram','youtube','twitter','facebook','linkedin','pinterest','snapchat') NOT NULL,
	`views` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`saves` int DEFAULT 0,
	`engagement_rate` decimal(5,2),
	`click_through_rate` decimal(5,2),
	`watch_time` int,
	`avg_watch_percentage` decimal(5,2),
	`followers_gained` int DEFAULT 0,
	`followers_lost` int DEFAULT 0,
	`revenue` int DEFAULT 0,
	`recorded_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creator_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monetization_milestones` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`platform` enum('tiktok','instagram','youtube','twitter','facebook','linkedin','pinterest','snapchat') NOT NULL,
	`threshold_type` enum('youtube_partner','tiktok_creator_fund','instagram_monetization','twitter_monetization','facebook_monetization','custom') NOT NULL,
	`current_value` int DEFAULT 0,
	`target_value` int NOT NULL,
	`unit` varchar(50) NOT NULL,
	`estimated_reach_date` timestamp,
	`daily_growth_rate` decimal(10,2),
	`payout_amount` int,
	`payout_currency` varchar(3) DEFAULT 'USD',
	`status` enum('in_progress','achieved','stalled') NOT NULL DEFAULT 'in_progress',
	`achieved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monetization_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_credentials` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`platform` enum('tiktok','instagram','youtube','twitter','facebook','linkedin','pinterest','snapchat') NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`token_expires_at` timestamp,
	`platform_user_id` varchar(255) NOT NULL,
	`platform_username` varchar(255),
	`platform_display_name` varchar(255),
	`follower_count` int,
	`is_verified` boolean DEFAULT false,
	`account_type` varchar(50),
	`status` enum('active','expired','revoked','error') NOT NULL DEFAULT 'active',
	`last_synced_at` timestamp,
	`permissions` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_posts` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`credential_id` varchar(36) NOT NULL,
	`platform` enum('tiktok','instagram','youtube','twitter','facebook','linkedin','pinterest','snapchat') NOT NULL,
	`content_type` enum('text','image','video','carousel','story','reel','short') NOT NULL,
	`caption` text,
	`hashtags` text,
	`media_urls` json,
	`platform_post_id` varchar(255) NOT NULL,
	`platform_post_url` text,
	`status` enum('pending','uploading','published','failed','deleted') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`scheduled_for` timestamp,
	`published_at` timestamp,
	`deleted_at` timestamp,
	`platform_settings` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posting_times_analytics` (
	`id` varchar(36) NOT NULL,
	`platform` enum('tiktok','instagram','youtube','twitter','facebook','linkedin','pinterest','snapchat') NOT NULL,
	`day_of_week` int NOT NULL,
	`hour` int NOT NULL,
	`avg_engagement_rate` decimal(5,2),
	`avg_views` int,
	`avg_likes` int,
	`avg_comments` int,
	`avg_shares` int,
	`sample_size` int DEFAULT 0,
	`last_updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posting_times_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_projections` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`projected_30d_revenue` int NOT NULL,
	`projected_90d_revenue` int NOT NULL,
	`projected_180d_revenue` int,
	`projected_365d_revenue` int,
	`current_monthly_revenue` int DEFAULT 0,
	`month_over_month_growth` decimal(5,2),
	`growth_rate` decimal(5,2),
	`confidence_score` int DEFAULT 50,
	`platform_breakdown` json,
	`calculated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_projections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_posts` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`caption` text NOT NULL,
	`hashtags` text,
	`media_urls` json,
	`content_type` enum('text','image','video','carousel','story','reel','short') NOT NULL,
	`platforms` json NOT NULL,
	`scheduled_for` timestamp NOT NULL,
	`timezone` varchar(50) DEFAULT 'UTC',
	`status` enum('scheduled','processing','published','failed','cancelled') NOT NULL DEFAULT 'scheduled',
	`error_message` text,
	`executed_at` timestamp,
	`platform_post_ids` json,
	`is_optimal_time` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creator_metrics` ADD CONSTRAINT `creator_metrics_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `creator_metrics` ADD CONSTRAINT `creator_metrics_platform_post_id_platform_posts_id_fk` FOREIGN KEY (`platform_post_id`) REFERENCES `platform_posts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monetization_milestones` ADD CONSTRAINT `monetization_milestones_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_credentials` ADD CONSTRAINT `platform_credentials_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_posts` ADD CONSTRAINT `platform_posts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_posts` ADD CONSTRAINT `platform_posts_credential_id_platform_credentials_id_fk` FOREIGN KEY (`credential_id`) REFERENCES `platform_credentials`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `revenue_projections` ADD CONSTRAINT `revenue_projections_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scheduled_posts` ADD CONSTRAINT `scheduled_posts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_creator_metrics_user_id` ON `creator_metrics` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_creator_metrics_platform` ON `creator_metrics` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_creator_metrics_platform_post_id` ON `creator_metrics` (`platform_post_id`);--> statement-breakpoint
CREATE INDEX `idx_creator_metrics_recorded_at` ON `creator_metrics` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_monetization_milestones_user_id` ON `monetization_milestones` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_monetization_milestones_platform` ON `monetization_milestones` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_monetization_milestones_status` ON `monetization_milestones` (`status`);--> statement-breakpoint
CREATE INDEX `idx_platform_credentials_user_id` ON `platform_credentials` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_platform_credentials_platform` ON `platform_credentials` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_platform_credentials_status` ON `platform_credentials` (`status`);--> statement-breakpoint
CREATE INDEX `idx_platform_credentials_user_platform` ON `platform_credentials` (`user_id`,`platform`);--> statement-breakpoint
CREATE INDEX `idx_platform_posts_user_id` ON `platform_posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_platform_posts_platform` ON `platform_posts` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_platform_posts_status` ON `platform_posts` (`status`);--> statement-breakpoint
CREATE INDEX `idx_platform_posts_published_at` ON `platform_posts` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_platform_posts_scheduled_for` ON `platform_posts` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_posting_times_platform_day_hour` ON `posting_times_analytics` (`platform`,`day_of_week`,`hour`);--> statement-breakpoint
CREATE INDEX `idx_revenue_projections_user_id` ON `revenue_projections` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_revenue_projections_calculated_at` ON `revenue_projections` (`calculated_at`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_user_id` ON `scheduled_posts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_scheduled_for` ON `scheduled_posts` (`scheduled_for`);--> statement-breakpoint
CREATE INDEX `idx_scheduled_posts_status` ON `scheduled_posts` (`status`);