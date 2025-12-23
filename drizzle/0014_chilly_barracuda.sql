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
ALTER TABLE `ab_test_variants` ADD CONSTRAINT `ab_test_variants_content_id_unified_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `unified_content`(`id`) ON DELETE cascade ON UPDATE no action;