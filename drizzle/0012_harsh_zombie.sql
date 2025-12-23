ALTER TABLE `orchestration_runs` DROP FOREIGN KEY `orchestration_runs_viral_analysis_id_viral_analyses_id_fk`;
--> statement-breakpoint
ALTER TABLE `orchestration_runs` DROP FOREIGN KEY `orchestration_runs_thumbnail_analysis_id_thumbnail_analyses_id_fk`;
--> statement-breakpoint
ALTER TABLE `orchestration_runs` DROP FOREIGN KEY `orchestration_runs_ad_analysis_id_ad_analyses_id_fk`;
