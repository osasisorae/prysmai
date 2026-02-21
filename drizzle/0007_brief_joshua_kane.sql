ALTER TABLE `security_configs` ADD `outputScanning` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `outputPiiDetection` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `outputToxicityDetection` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `outputBlockThreats` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `security_configs` ADD `categoryThresholds` json;--> statement-breakpoint
ALTER TABLE `security_events` ADD `source` enum('input','output') DEFAULT 'input' NOT NULL;--> statement-breakpoint
ALTER TABLE `security_events` ADD `toxicityScore` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `security_events` ADD `toxicityCategories` json;--> statement-breakpoint
ALTER TABLE `security_events` ADD `outputPreview` text;