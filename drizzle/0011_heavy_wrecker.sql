CREATE TABLE `ab_test_variants` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`variant_name` varchar(100) NOT NULL,
	`variant_type` enum('title','thumbnail','description','full') NOT NULL,
	`title` varchar(500),
	`description` text,
	`thumbnail_url` varchar(500),
	`impressions` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`ctr` decimal(5,2),
	`conversions` int NOT NULL DEFAULT 0,
	`is_control` boolean NOT NULL DEFAULT false,
	`is_winner` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `ab_test_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content_performance` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`orchestration_id` varchar(36) NOT NULL,
	`platform_post_ids` text,
	`podcast_episode_id` varchar(36),
	`total_views` int NOT NULL DEFAULT 0,
	`total_likes` int NOT NULL DEFAULT 0,
	`total_shares` int NOT NULL DEFAULT 0,
	`total_comments` int NOT NULL DEFAULT 0,
	`engagement_rate` decimal(5,2),
	`predicted_viral_score` int,
	`actual_viral_score` int,
	`prediction_accuracy` decimal(5,2),
	`revenue_generated` decimal(10,2) DEFAULT '0.00',
	`feedback_processed` boolean NOT NULL DEFAULT false,
	`feedback_processed_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `content_performance_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `optimization_history` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`orchestration_id` varchar(36) NOT NULL,
	`original_title` varchar(500) NOT NULL,
	`original_description` text,
	`original_tags` text,
	`optimized_title` varchar(500) NOT NULL,
	`optimized_description` text,
	`optimized_tags` text,
	`changes_summary` text,
	`improvement_score` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `optimization_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orchestration_runs` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`viral_analysis_id` varchar(36),
	`thumbnail_analysis_id` varchar(36),
	`ad_analysis_id` varchar(36),
	`started_at` datetime NOT NULL,
	`completed_at` datetime,
	`duration_ms` int,
	`status` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`error_message` text,
	`optimization_results` text,
	`generated_assets` text,
	`platform_adaptations` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `orchestration_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_adaptations` (
	`id` varchar(36) NOT NULL,
	`content_id` varchar(36) NOT NULL,
	`orchestration_id` varchar(36) NOT NULL,
	`platform` enum('youtube','tiktok','instagram','twitter','facebook','linkedin','pinterest') NOT NULL,
	`adapted_title` varchar(500),
	`adapted_description` text,
	`adapted_caption` text,
	`adapted_hashtags` text,
	`adapted_media_url` varchar(500),
	`thumbnail_url` varchar(500),
	`platform_metadata` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `platform_adaptations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `unified_content` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`body` text,
	`media_url` varchar(500),
	`media_type` enum('image','video','audio','text'),
	`tags` text,
	`category` varchar(100),
	`niche` varchar(100),
	`duration` int,
	`target_platforms` text NOT NULL,
	`publish_strategy` enum('immediate','scheduled','draft') NOT NULL DEFAULT 'draft',
	`scheduled_for` datetime,
	`timezone` varchar(50) DEFAULT 'UTC',
	`optimization_level` enum('none','basic','aggressive') NOT NULL DEFAULT 'aggressive',
	`generate_thumbnail` boolean NOT NULL DEFAULT true,
	`generate_ad` boolean NOT NULL DEFAULT false,
	`run_viral_analysis` boolean NOT NULL DEFAULT true,
	`status` enum('draft','optimizing','ready','scheduled','publishing','published','failed') NOT NULL DEFAULT 'draft',
	`orchestration_id` varchar(36),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	`published_at` datetime,
	CONSTRAINT `unified_content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ab_test_variants` ADD CONSTRAINT `ab_test_variants_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_performance` ADD CONSTRAINT `content_performance_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_performance` ADD CONSTRAINT `content_performance_orchestration_id_orchestration_runs_id_fk` FOREIGN KEY (`orchestration_id`) REFERENCES `orchestration_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_performance` ADD CONSTRAINT `content_performance_podcast_episode_id_podcast_episodes_id_fk` FOREIGN KEY (`podcast_episode_id`) REFERENCES `podcast_episodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `optimization_history` ADD CONSTRAINT `optimization_history_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `optimization_history` ADD CONSTRAINT `optimization_history_orchestration_id_orchestration_runs_id_fk` FOREIGN KEY (`orchestration_id`) REFERENCES `orchestration_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orchestration_runs` ADD CONSTRAINT `orchestration_runs_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orchestration_runs` ADD CONSTRAINT `orchestration_runs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orchestration_runs` ADD CONSTRAINT `orchestration_runs_viral_analysis_id_viral_analyses_id_fk` FOREIGN KEY (`viral_analysis_id`) REFERENCES `viral_analyses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orchestration_runs` ADD CONSTRAINT `orchestration_runs_thumbnail_analysis_id_thumbnail_analyses_id_fk` FOREIGN KEY (`thumbnail_analysis_id`) REFERENCES `thumbnail_analyses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orchestration_runs` ADD CONSTRAINT `orchestration_runs_ad_analysis_id_ad_analyses_id_fk` FOREIGN KEY (`ad_analysis_id`) REFERENCES `ad_analyses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_adaptations` ADD CONSTRAINT `platform_adaptations_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `platform_adaptations` ADD CONSTRAINT `platform_adaptations_orchestration_id_orchestration_runs_id_fk` FOREIGN KEY (`orchestration_id`) REFERENCES `orchestration_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unified_content` ADD CONSTRAINT `unified_content_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;