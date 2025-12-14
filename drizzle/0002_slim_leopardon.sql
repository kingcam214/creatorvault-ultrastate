CREATE TABLE `commission_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ref_type` enum('order','sale','enrollment') NOT NULL,
	`ref_id` varchar(36) NOT NULL,
	`party_type` enum('creator','recruiter','affiliate','platform') NOT NULL,
	`party_id` int,
	`amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commission_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_orders` (
	`id` varchar(36) NOT NULL,
	`buyer_id` int NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`gross_amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`creator_amount` int NOT NULL,
	`recruiter_amount` int NOT NULL DEFAULT 0,
	`platform_amount` int NOT NULL,
	`payment_provider` varchar(20) NOT NULL DEFAULT 'stripe',
	`stripe_session_id` varchar(255),
	`stripe_payment_intent_id` varchar(255),
	`status` enum('pending','paid','fulfilled','refunded','failed') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketplace_products` (
	`id` varchar(36) NOT NULL,
	`creator_id` int NOT NULL,
	`recruiter_id` int,
	`type` enum('digital','service','bundle','subscription') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`price_amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`fulfillment_type` enum('instant','manual','scheduled') NOT NULL DEFAULT 'manual',
	`fulfillment_payload` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `marketplace_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services_offers` (
	`id` varchar(36) NOT NULL,
	`provider_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`tier` enum('low','mid','high') NOT NULL DEFAULT 'mid',
	`price_amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`delivery_days` int NOT NULL DEFAULT 7,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'draft',
	`fulfillment_steps_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services_sales` (
	`id` varchar(36) NOT NULL,
	`buyer_id` int NOT NULL,
	`offer_id` varchar(36) NOT NULL,
	`gross_amount` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`provider_amount` int NOT NULL,
	`affiliate_amount` int NOT NULL DEFAULT 0,
	`recruiter_amount` int NOT NULL DEFAULT 0,
	`platform_amount` int NOT NULL,
	`stripe_session_id` varchar(255),
	`stripe_payment_intent_id` varchar(255),
	`status` enum('pending','paid','in_progress','delivered','refunded','failed') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `services_sales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `university_courses` (
	`id` varchar(36) NOT NULL,
	`creator_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`price_amount` int NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`is_free` boolean NOT NULL DEFAULT false,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`syllabus_json` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_courses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `university_enrollments` (
	`id` varchar(36) NOT NULL,
	`course_id` varchar(36) NOT NULL,
	`student_id` int NOT NULL,
	`order_id` varchar(36),
	`status` enum('active','completed','refunded','revoked') NOT NULL DEFAULT 'active',
	`progress_json` json,
	`certificate_url` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `university_enrollments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `commission_events` ADD CONSTRAINT `commission_events_party_id_users_id_fk` FOREIGN KEY (`party_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `marketplace_orders_buyer_id_users_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_orders` ADD CONSTRAINT `marketplace_orders_product_id_marketplace_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `marketplace_products`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_products` ADD CONSTRAINT `marketplace_products_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `marketplace_products` ADD CONSTRAINT `marketplace_products_recruiter_id_users_id_fk` FOREIGN KEY (`recruiter_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services_offers` ADD CONSTRAINT `services_offers_provider_id_users_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services_sales` ADD CONSTRAINT `services_sales_buyer_id_users_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services_sales` ADD CONSTRAINT `services_sales_offer_id_services_offers_id_fk` FOREIGN KEY (`offer_id`) REFERENCES `services_offers`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `university_courses` ADD CONSTRAINT `university_courses_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `university_enrollments` ADD CONSTRAINT `university_enrollments_course_id_university_courses_id_fk` FOREIGN KEY (`course_id`) REFERENCES `university_courses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `university_enrollments` ADD CONSTRAINT `university_enrollments_student_id_users_id_fk` FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `university_enrollments` ADD CONSTRAINT `university_enrollments_order_id_marketplace_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `marketplace_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_commission_events_ref` ON `commission_events` (`ref_type`,`ref_id`);--> statement-breakpoint
CREATE INDEX `idx_commission_events_party_id` ON `commission_events` (`party_id`);--> statement-breakpoint
CREATE INDEX `idx_commission_events_party_type` ON `commission_events` (`party_type`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_orders_buyer_id` ON `marketplace_orders` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_orders_product_id` ON `marketplace_orders` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_orders_status` ON `marketplace_orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_orders_stripe_session_id` ON `marketplace_orders` (`stripe_session_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_products_creator_id` ON `marketplace_products` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_products_status` ON `marketplace_products` (`status`);--> statement-breakpoint
CREATE INDEX `idx_services_offers_provider_id` ON `services_offers` (`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_services_offers_status` ON `services_offers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_services_offers_tier` ON `services_offers` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_services_sales_buyer_id` ON `services_sales` (`buyer_id`);--> statement-breakpoint
CREATE INDEX `idx_services_sales_offer_id` ON `services_sales` (`offer_id`);--> statement-breakpoint
CREATE INDEX `idx_services_sales_status` ON `services_sales` (`status`);--> statement-breakpoint
CREATE INDEX `idx_services_sales_stripe_session_id` ON `services_sales` (`stripe_session_id`);--> statement-breakpoint
CREATE INDEX `idx_university_courses_creator_id` ON `university_courses` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_university_courses_status` ON `university_courses` (`status`);--> statement-breakpoint
CREATE INDEX `idx_university_enrollments_course_id` ON `university_enrollments` (`course_id`);--> statement-breakpoint
CREATE INDEX `idx_university_enrollments_student_id` ON `university_enrollments` (`student_id`);--> statement-breakpoint
CREATE INDEX `idx_university_enrollments_status` ON `university_enrollments` (`status`);