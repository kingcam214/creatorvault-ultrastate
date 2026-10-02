-- Additive only: no historical balances, payment rows, or manual payout rails are rewritten.
CREATE TABLE `stripe_creator_payout_policy` (
  `rule` varchar(64) PRIMARY KEY,
  `enabled` boolean NOT NULL DEFAULT true,
  `effective_from` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
INSERT INTO `stripe_creator_payout_policy` (`rule`) VALUES ('creator_net_85_v1');
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `stripe_connect_account_id` varchar(255) NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_stripe_connect_account_id_unique` UNIQUE (`stripe_connect_account_id`);
--> statement-breakpoint
CREATE TABLE `stripe_creator_payouts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `creator_id` int NOT NULL,
  `stripe_charge_id` varchar(255) NOT NULL,
  `stripe_payment_intent_id` varchar(255) NULL,
  `stripe_session_id` varchar(255) NULL,
  `stripe_invoice_id` varchar(255) NULL,
  `stripe_event_id` varchar(255) NOT NULL,
  `stripe_balance_transaction_id` varchar(255) NULL,
  `stripe_connect_account_id` varchar(255) NULL,
  `stripe_transfer_id` varchar(255) NULL,
  `idempotency_key` varchar(255) NOT NULL,
  `transfer_group` varchar(255) NOT NULL,
  `gross_amount_in_cents` int NOT NULL,
  `stripe_fee_in_cents` int NULL,
  `net_amount_in_cents` int NULL,
  `creator_payout_in_cents` int NULL,
  `platform_revenue_in_cents` int NULL,
  `currency` varchar(3) NOT NULL,
  `fee_details` json NULL,
  `source_metadata` json NOT NULL,
  `status` enum('pending_fee','blocked_account','ready','processing','transferred','failed','no_payout','review_required','reversed') NOT NULL DEFAULT 'pending_fee',
  `last_error` text NULL,
  `first_attempt_at` timestamp(3) NULL,
  `lease_expires_at` timestamp(3) NULL,
  `lease_token` varchar(36) NULL,
  `revenue_recorded_at` timestamp(3) NULL,
  `transferred_at` timestamp(3) NULL,
  `created_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT `stripe_creator_payouts_stripe_charge_id_unique` UNIQUE (`stripe_charge_id`),
  CONSTRAINT `stripe_creator_payouts_stripe_transfer_id_unique` UNIQUE (`stripe_transfer_id`),
  CONSTRAINT `stripe_creator_payouts_idempotency_key_unique` UNIQUE (`idempotency_key`),
  CONSTRAINT `stripe_creator_payouts_transfer_group_unique` UNIQUE (`transfer_group`),
  CONSTRAINT `stripe_payout_creator_fk` FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_stripe_payout_creator_status` (`creator_id`,`status`),
  INDEX `idx_stripe_payout_payment_intent` (`stripe_payment_intent_id`),
  INDEX `idx_stripe_payout_retry` (`status`,`lease_expires_at`)
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `stripe_fee_in_cents` int NULL;
--> statement-breakpoint
ALTER TABLE `transactions` ADD COLUMN `stripe_creator_payout_id` int NULL;
--> statement-breakpoint
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_stripe_creator_payout_id_unique` UNIQUE (`stripe_creator_payout_id`);
--> statement-breakpoint
ALTER TABLE `live_stream_tips` ADD COLUMN `stripe_creator_payout_id` int NULL;
--> statement-breakpoint
ALTER TABLE `live_stream_tips` ADD CONSTRAINT `live_stream_tips_stripe_creator_payout_id_unique` UNIQUE (`stripe_creator_payout_id`);
--> statement-breakpoint
ALTER TABLE `live_stream_donations` ADD COLUMN `stripe_creator_payout_id` int NULL;
--> statement-breakpoint
ALTER TABLE `live_stream_donations` ADD CONSTRAINT `live_stream_donations_stripe_creator_payout_id_unique` UNIQUE (`stripe_creator_payout_id`);
