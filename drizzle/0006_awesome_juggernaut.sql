CREATE TABLE `video_assets` (
	`id` varchar(36) NOT NULL,
	`job_id` int NOT NULL,
	`asset_type` enum('final_video','scene_frame','reference_image','thumbnail') NOT NULL,
	`url` text NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`duration` int,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `video_assets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `video_scenes` (
	`id` varchar(36) NOT NULL,
	`job_id` int NOT NULL,
	`scene_index` int NOT NULL,
	`description` text NOT NULL,
	`prompt` text NOT NULL,
	`image_url` text,
	`status` enum('pending','generating','complete','failed') NOT NULL DEFAULT 'pending',
	`error_message` text,
	`regeneration_count` int DEFAULT 0,
	`regeneration_history` json,
	`character_locked` boolean DEFAULT false,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `video_scenes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `video_generation_jobs` MODIFY COLUMN `image_url` text;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` MODIFY COLUMN `status` enum('queued','processing','complete','failed') NOT NULL DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `video_generation_jobs` MODIFY COLUMN `duration` int DEFAULT 30;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `prompt` text NOT NULL;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `base_image_url` text;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `reference_assets` json;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `scene_plan` json;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `character_features` json;--> statement-breakpoint
ALTER TABLE `video_generation_jobs` ADD `scene_count` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `video_assets` ADD CONSTRAINT `video_assets_job_id_video_generation_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `video_generation_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `video_scenes` ADD CONSTRAINT `video_scenes_job_id_video_generation_jobs_id_fk` FOREIGN KEY (`job_id`) REFERENCES `video_generation_jobs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_video_assets_job_id` ON `video_assets` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_video_assets_asset_type` ON `video_assets` (`asset_type`);--> statement-breakpoint
CREATE INDEX `idx_video_scenes_job_id` ON `video_scenes` (`job_id`);--> statement-breakpoint
CREATE INDEX `idx_video_scenes_scene_index` ON `video_scenes` (`scene_index`);--> statement-breakpoint
CREATE INDEX `idx_video_scenes_status` ON `video_scenes` (`status`);