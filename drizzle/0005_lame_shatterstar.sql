CREATE TABLE `security_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`injectionDetection` boolean NOT NULL DEFAULT true,
	`piiDetection` boolean NOT NULL DEFAULT true,
	`piiRedactionMode` enum('none','mask','hash','block') NOT NULL DEFAULT 'none',
	`contentPolicyEnabled` boolean NOT NULL DEFAULT true,
	`blockHighThreats` boolean NOT NULL DEFAULT false,
	`customKeywords` json,
	`customPolicies` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `security_configs_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `security_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`traceId` varchar(64),
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`threatScore` int NOT NULL,
	`threatLevel` enum('clean','low','medium','high') NOT NULL,
	`action` enum('pass','log','warn','block') NOT NULL,
	`summary` text,
	`injectionScore` int DEFAULT 0,
	`piiScore` int DEFAULT 0,
	`policyScore` int DEFAULT 0,
	`injectionMatches` json,
	`piiTypes` json,
	`policyViolations` json,
	`model` varchar(128),
	`inputPreview` text,
	`processingTimeMs` int,
	CONSTRAINT `security_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `secevents_project_ts_idx` ON `security_events` (`projectId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `secevents_project_level_idx` ON `security_events` (`projectId`,`threatLevel`);--> statement-breakpoint
CREATE INDEX `secevents_trace_idx` ON `security_events` (`traceId`);