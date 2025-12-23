CREATE TABLE `podcast_analytics` (
	`id` varchar(36) NOT NULL,
	`episode_id` varchar(36) NOT NULL,
	`podcast_id` varchar(36) NOT NULL,
	`platform` enum('apple_podcasts','spotify','google_podcasts','amazon_music','youtube_music','stitcher','tunein','iheartradio','pandora','deezer','aggregate') NOT NULL,
	`plays` int DEFAULT 0,
	`downloads` int DEFAULT 0,
	`completion_rate` decimal(5,2),
	`average_listen_time` int,
	`likes` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`unique_listeners` int,
	`recorded_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `podcast_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcast_clips` (
	`id` varchar(36) NOT NULL,
	`episode_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`clip_url` text NOT NULL,
	`duration` int NOT NULL,
	`start_time` int NOT NULL,
	`end_time` int NOT NULL,
	`format` enum('audio','video','audiogram') NOT NULL DEFAULT 'audio',
	`target_platforms` json,
	`generated_caption` text,
	`status` enum('generating','ready','posted','failed') NOT NULL DEFAULT 'generating',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_clips_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcast_episodes` (
	`id` varchar(36) NOT NULL,
	`podcast_id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`episode_number` int,
	`season_number` int,
	`audio_url` text NOT NULL,
	`duration` int,
	`file_size` int,
	`transcript_url` text,
	`transcript_text` text,
	`published_at` timestamp,
	`scheduled_for` timestamp,
	`status` enum('draft','processing','scheduled','published','archived') NOT NULL DEFAULT 'draft',
	`keywords` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_episodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcast_monetization` (
	`id` varchar(36) NOT NULL,
	`podcast_id` varchar(36) NOT NULL,
	`episode_id` varchar(36),
	`user_id` int NOT NULL,
	`monetization_type` enum('dynamic_ad','sponsor_read','affiliate','premium_subscription','donation','merchandise') NOT NULL,
	`sponsor_name` varchar(255),
	`sponsor_contact_email` varchar(255),
	`ad_placement` enum('pre_roll','mid_roll','post_roll'),
	`ad_timestamp` int,
	`ad_duration` int,
	`ad_audio_url` text,
	`revenue` decimal(10,2),
	`currency` varchar(3) DEFAULT 'USD',
	`payment_status` enum('pending','processing','paid','failed') DEFAULT 'pending',
	`paid_at` timestamp,
	`deal_terms` text,
	`commission_rate` decimal(5,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_monetization_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcast_platforms` (
	`id` varchar(36) NOT NULL,
	`podcast_id` varchar(36) NOT NULL,
	`platform` enum('apple_podcasts','spotify','google_podcasts','amazon_music','youtube_music','stitcher','tunein','iheartradio','pandora','deezer') NOT NULL,
	`platform_podcast_id` varchar(255),
	`platform_url` text,
	`access_token` text,
	`refresh_token` text,
	`token_expires_at` timestamp,
	`status` enum('pending','connected','syncing','active','error','disconnected') NOT NULL DEFAULT 'pending',
	`last_synced_at` timestamp,
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_platforms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcast_sponsors` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`sponsor_name` varchar(255) NOT NULL,
	`contact_name` varchar(255),
	`contact_email` varchar(255),
	`contact_phone` varchar(50),
	`website` text,
	`deal_terms` text,
	`commission_rate` decimal(5,2),
	`payment_terms` text,
	`contract_start_date` timestamp,
	`contract_end_date` timestamp,
	`status` enum('prospect','negotiating','active','paused','ended') NOT NULL DEFAULT 'prospect',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcast_sponsors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `podcasts` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`cover_art_url` text,
	`category` varchar(100),
	`language` varchar(10) NOT NULL DEFAULT 'en',
	`explicit` boolean NOT NULL DEFAULT false,
	`author` varchar(255),
	`email` varchar(255),
	`website` text,
	`rss_feed_url` text,
	`status` enum('draft','active','paused','archived') NOT NULL DEFAULT 'draft',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `podcasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `podcast_analytics` ADD CONSTRAINT `podcast_analytics_episode_id_podcast_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_analytics` ADD CONSTRAINT `podcast_analytics_podcast_id_podcasts_id_fk` FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_clips` ADD CONSTRAINT `podcast_clips_episode_id_podcast_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_clips` ADD CONSTRAINT `podcast_clips_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_episodes` ADD CONSTRAINT `podcast_episodes_podcast_id_podcasts_id_fk` FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_episodes` ADD CONSTRAINT `podcast_episodes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_monetization` ADD CONSTRAINT `podcast_monetization_podcast_id_podcasts_id_fk` FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_monetization` ADD CONSTRAINT `podcast_monetization_episode_id_podcast_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `podcast_episodes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_monetization` ADD CONSTRAINT `podcast_monetization_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_platforms` ADD CONSTRAINT `podcast_platforms_podcast_id_podcasts_id_fk` FOREIGN KEY (`podcast_id`) REFERENCES `podcasts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcast_sponsors` ADD CONSTRAINT `podcast_sponsors_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `podcasts` ADD CONSTRAINT `podcasts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_podcast_analytics_episode_id` ON `podcast_analytics` (`episode_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_analytics_podcast_id` ON `podcast_analytics` (`podcast_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_analytics_platform` ON `podcast_analytics` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_podcast_analytics_recorded_at` ON `podcast_analytics` (`recorded_at`);--> statement-breakpoint
CREATE INDEX `idx_podcast_clips_episode_id` ON `podcast_clips` (`episode_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_clips_user_id` ON `podcast_clips` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_clips_status` ON `podcast_clips` (`status`);--> statement-breakpoint
CREATE INDEX `idx_podcast_episodes_podcast_id` ON `podcast_episodes` (`podcast_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_episodes_user_id` ON `podcast_episodes` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_episodes_status` ON `podcast_episodes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_podcast_episodes_published_at` ON `podcast_episodes` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_podcast_monetization_podcast_id` ON `podcast_monetization` (`podcast_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_monetization_episode_id` ON `podcast_monetization` (`episode_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_monetization_user_id` ON `podcast_monetization` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_monetization_payment_status` ON `podcast_monetization` (`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_podcast_platforms_podcast_id` ON `podcast_platforms` (`podcast_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_platforms_platform` ON `podcast_platforms` (`platform`);--> statement-breakpoint
CREATE INDEX `idx_podcast_platforms_status` ON `podcast_platforms` (`status`);--> statement-breakpoint
CREATE INDEX `idx_podcast_sponsors_user_id` ON `podcast_sponsors` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_podcast_sponsors_status` ON `podcast_sponsors` (`status`);--> statement-breakpoint
CREATE INDEX `idx_podcasts_user_id` ON `podcasts` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_podcasts_status` ON `podcasts` (`status`);