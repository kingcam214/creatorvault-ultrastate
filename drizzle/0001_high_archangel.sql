CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`event_type` varchar(100) NOT NULL,
	`event_data` json,
	`session_id` varchar(255),
	`ip_address` varchar(45),
	`user_agent` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_affiliations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`brand_id` varchar(50) NOT NULL,
	`is_primary` boolean DEFAULT false,
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brand_affiliations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`title` text,
	`description` text,
	`file_url` text NOT NULL,
	`file_key` varchar(255) NOT NULL,
	`mime_type` varchar(100),
	`file_size` int,
	`content_type` varchar(50),
	`status` varchar(20) DEFAULT 'pending',
	`views` int DEFAULT 0,
	`earnings` int DEFAULT 0,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `content_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cultural_content_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`culture` varchar(2) NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`template_text` text NOT NULL,
	`language` varchar(10) NOT NULL,
	`use_count` int DEFAULT 0,
	`effectiveness_score` decimal(3,2) DEFAULT '0.00',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cultural_content_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emma_network` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tinder_profile` varchar(255),
	`instagram` varchar(255),
	`tiktok` varchar(255),
	`whatsapp` varchar(255),
	`contact_date` timestamp,
	`first_response` timestamp,
	`onboarded_date` timestamp,
	`city` varchar(100),
	`content_tags` json,
	`messages_sent` int DEFAULT 0,
	`messages_received` int DEFAULT 0,
	`last_contact` timestamp,
	`total_earned` int DEFAULT 0,
	`last_payout` timestamp,
	`notes` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emma_network_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`stripe_payment_id` varchar(255),
	`amount` int NOT NULL,
	`currency` varchar(3) DEFAULT 'usd',
	`status` varchar(20) NOT NULL,
	`payment_type` varchar(50),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_stripe_payment_id_unique` UNIQUE(`stripe_payment_id`)
);
--> statement-breakpoint
CREATE TABLE `video_generation_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`image_url` text NOT NULL,
	`video_url` text,
	`status` varchar(20) DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`duration` int DEFAULT 5,
	`fps` int DEFAULT 24,
	`motion_intensity` decimal(3,2) DEFAULT '0.50',
	`seed` int,
	`error_message` text,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `video_generation_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` text,
	`phone` varchar(20),
	`country` varchar(2),
	`language` varchar(10) DEFAULT 'en',
	`referral_source` varchar(100),
	`interested_in` json,
	`status` varchar(20) DEFAULT 'pending',
	`invited_at` timestamp,
	`converted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlist_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','creator','admin','king') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `language` varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE `users` ADD `country` varchar(2);--> statement-breakpoint
ALTER TABLE `users` ADD `referred_by` int;--> statement-breakpoint
ALTER TABLE `users` ADD `creator_status` varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `users` ADD `content_type` json;--> statement-breakpoint
ALTER TABLE `users` ADD `primary_brand` varchar(50) DEFAULT 'CREATORVAULT';--> statement-breakpoint
ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_affiliations` ADD CONSTRAINT `brand_affiliations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content` ADD CONSTRAINT `content_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `emma_network` ADD CONSTRAINT `emma_network_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD CONSTRAINT `video_generation_jobs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_analytics_user_id` ON `analytics_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_event_type` ON `analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_analytics_created_at` ON `analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_brand_affiliations_user_id` ON `brand_affiliations` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_affiliations_brand_id` ON `brand_affiliations` (`brand_id`);--> statement-breakpoint
CREATE INDEX `idx_content_user_id` ON `content` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_content_status` ON `content` (`status`);--> statement-breakpoint
CREATE INDEX `idx_content_created_at` ON `content` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_cultural_templates_culture` ON `cultural_content_templates` (`culture`);--> statement-breakpoint
CREATE INDEX `idx_cultural_templates_type` ON `cultural_content_templates` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_emma_network_user_id` ON `emma_network` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_emma_network_city` ON `emma_network` (`city`);--> statement-breakpoint
CREATE INDEX `idx_emma_network_instagram` ON `emma_network` (`instagram`);--> statement-breakpoint
CREATE INDEX `idx_payments_user_id` ON `payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_stripe_id` ON `payments` (`stripe_payment_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_video_jobs_user_id` ON `video_generation_jobs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_video_jobs_status` ON `video_generation_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `idx_waitlist_email` ON `waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `idx_waitlist_status` ON `waitlist` (`status`);--> statement-breakpoint
CREATE INDEX `idx_users_country` ON `users` (`country`);--> statement-breakpoint
CREATE INDEX `idx_users_referred_by` ON `users` (`referred_by`);--> statement-breakpoint
CREATE INDEX `idx_users_creator_status` ON `users` (`creator_status`);--> statement-breakpoint
CREATE INDEX `idx_users_language` ON `users` (`language`);