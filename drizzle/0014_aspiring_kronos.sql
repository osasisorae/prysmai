ALTER TABLE `security_configs` ADD `offTopicDetection` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `offTopicDescription` text;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `offTopicKeywords` json;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `offTopicAction` enum('log','warn','block') DEFAULT 'log' NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `offTopicThreshold` decimal(3,2) DEFAULT '0.70';--> statement-breakpoint
ALTER TABLE `security_configs` ADD `outputPolicyCompliance` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `outputNerDetection` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `security_events` ADD `offTopicScore` int DEFAULT 0;