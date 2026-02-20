CREATE TABLE `alert_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`metric` varchar(64) NOT NULL,
	`condition` varchar(16) NOT NULL,
	`threshold` decimal(14,6) NOT NULL,
	`windowMinutes` int NOT NULL DEFAULT 5,
	`channels` json NOT NULL,
	`cooldownMinutes` int NOT NULL DEFAULT 60,
	`lastTriggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alert_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`bucket` timestamp NOT NULL,
	`bucketSize` enum('1m','1h','1d') NOT NULL,
	`model` varchar(128),
	`requestCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`totalTokens` bigint NOT NULL DEFAULT 0,
	`totalPromptTokens` bigint NOT NULL DEFAULT 0,
	`totalCompletionTokens` bigint NOT NULL DEFAULT 0,
	`totalCostUsd` decimal(14,8) NOT NULL DEFAULT '0',
	`latencyP50` int,
	`latencyP95` int,
	`latencyP99` int,
	`ttftP50` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `metrics_unique_idx` UNIQUE(`projectId`,`bucket`,`bucketSize`,`model`)
);
--> statement-breakpoint
CREATE TABLE `org_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`userId` int,
	`email` varchar(320) NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`status` enum('pending','active','removed') NOT NULL DEFAULT 'pending',
	`inviteToken` varchar(128),
	`invitedBy` int,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`joinedAt` timestamp,
	CONSTRAINT `org_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `orgmembers_org_email_idx` UNIQUE(`orgId`,`email`)
);
--> statement-breakpoint
CREATE TABLE `usage_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`projectId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`requestCount` int NOT NULL DEFAULT 0,
	`totalTokens` bigint NOT NULL DEFAULT 0,
	`totalCostUsd` decimal(14,8) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_org_project_period_idx` UNIQUE(`orgId`,`projectId`,`periodStart`)
);
--> statement-breakpoint
CREATE INDEX `alerts_project_idx` ON `alert_configs` (`projectId`);--> statement-breakpoint
CREATE INDEX `metrics_project_bucket_idx` ON `metrics` (`projectId`,`bucketSize`,`bucket`);--> statement-breakpoint
CREATE INDEX `orgmembers_org_idx` ON `org_members` (`orgId`);--> statement-breakpoint
CREATE INDEX `orgmembers_user_idx` ON `org_members` (`userId`);