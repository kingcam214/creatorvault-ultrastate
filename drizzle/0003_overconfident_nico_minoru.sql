CREATE TABLE `creators` (
	`id` varchar(36) NOT NULL,
	`user_id` int NOT NULL,
	`creator_type` varchar(100) NOT NULL,
	`country` varchar(100),
	`platforms` text,
	`monthly_revenue` int,
	`subscriber_count` int,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`onboarded_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `creators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` varchar(36) NOT NULL,
	`source` varchar(50) NOT NULL,
	`source_id` varchar(255),
	`email` varchar(255),
	`name` varchar(255),
	`country` varchar(100),
	`creator_type` varchar(100),
	`status` varchar(50) NOT NULL DEFAULT 'new',
	`data_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_bots` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`bot_token` text NOT NULL,
	`webhook_url` text,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_bots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_channels` (
	`id` varchar(36) NOT NULL,
	`bot_id` varchar(36) NOT NULL,
	`channel_id` varchar(255) NOT NULL,
	`channel_name` varchar(255),
	`channel_type` varchar(50) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `telegram_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_funnels` (
	`id` varchar(36) NOT NULL,
	`bot_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`messages_json` text NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_funnels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `telegram_leads` (
	`id` varchar(36) NOT NULL,
	`bot_id` varchar(36) NOT NULL,
	`telegram_user_id` varchar(255) NOT NULL,
	`username` varchar(255),
	`first_name` varchar(255),
	`last_name` varchar(255),
	`email` varchar(255),
	`country` varchar(100),
	`creator_type` varchar(100),
	`funnel_id` varchar(36),
	`current_step` int DEFAULT 0,
	`data_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `telegram_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_funnels` (
	`id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`messages_json` text NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_funnels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_leads` (
	`id` varchar(36) NOT NULL,
	`provider_id` varchar(36) NOT NULL,
	`phone_number` varchar(50) NOT NULL,
	`name` varchar(255),
	`email` varchar(255),
	`country` varchar(100),
	`creator_type` varchar(100),
	`funnel_id` varchar(36),
	`current_step` int DEFAULT 0,
	`data_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_providers` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`provider` varchar(50) NOT NULL,
	`credentials_json` text NOT NULL,
	`phone_number` varchar(50),
	`status` varchar(50) NOT NULL DEFAULT 'active',
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_providers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `creators` ADD CONSTRAINT `creators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_bots` ADD CONSTRAINT `telegram_bots_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_channels` ADD CONSTRAINT `telegram_channels_bot_id_telegram_bots_id_fk` FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_funnels` ADD CONSTRAINT `telegram_funnels_bot_id_telegram_bots_id_fk` FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `telegram_leads` ADD CONSTRAINT `telegram_leads_bot_id_telegram_bots_id_fk` FOREIGN KEY (`bot_id`) REFERENCES `telegram_bots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_funnels` ADD CONSTRAINT `whatsapp_funnels_provider_id_whatsapp_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `whatsapp_providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_leads` ADD CONSTRAINT `whatsapp_leads_provider_id_whatsapp_providers_id_fk` FOREIGN KEY (`provider_id`) REFERENCES `whatsapp_providers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `whatsapp_providers` ADD CONSTRAINT `whatsapp_providers_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;