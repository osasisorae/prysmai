CREATE TABLE `explainability_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`traceId` int NOT NULL,
	`projectId` int NOT NULL,
	`reportType` enum('logprobs','estimated','sae') NOT NULL,
	`explanation` text NOT NULL,
	`highlights` json,
	`modelUsed` varchar(128),
	`tokensUsed` int,
	`cost` decimal(10,6),
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explainability_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `expl_trace_idx` UNIQUE(`traceId`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `explainabilityEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `projects` ADD `logprobsInjection` enum('always','never','sample') DEFAULT 'always';--> statement-breakpoint
ALTER TABLE `projects` ADD `logprobsSampleRate` decimal(3,2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE `traces` ADD `confidenceAnalysis` json;--> statement-breakpoint
CREATE INDEX `expl_project_idx` ON `explainability_reports` (`projectId`);