ALTER TABLE `security_events` ADD `llmScanned` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmClassification` enum('safe','suspicious','malicious');--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmConfidence` decimal(3,2);--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmThreatScore` int;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmAttackCategories` json;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmExplanation` text;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmIsJailbreak` boolean;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmIsObfuscatedInjection` boolean;--> statement-breakpoint
ALTER TABLE `security_events` ADD `llmIsDataExfiltration` boolean;--> statement-breakpoint
ALTER TABLE `security_events` ADD `scanTier` enum('free','pro','team','enterprise') DEFAULT 'free';