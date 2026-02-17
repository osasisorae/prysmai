CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`keyHash` varchar(64) NOT NULL,
	`keyPrefix` varchar(24) NOT NULL,
	`name` varchar(255),
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `model_pricing` (
	`id` int AUTO_INCREMENT NOT NULL,
	`provider` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`inputCostPer1k` decimal(10,6) NOT NULL,
	`outputCostPer1k` decimal(10,6) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `model_pricing_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_provider_model_idx` UNIQUE(`provider`,`model`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`plan` enum('free','pro','team','enterprise') NOT NULL DEFAULT 'free',
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`providerConfig` json DEFAULT ('{"provider":"openai","baseUrl":"https://api.openai.com/v1"}'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_org_slug_idx` UNIQUE(`orgId`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `traces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`traceId` varchar(64) NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`model` varchar(128) NOT NULL,
	`provider` varchar(64) NOT NULL,
	`promptMessages` json,
	`completion` text,
	`finishReason` varchar(32),
	`status` enum('success','error','timeout') NOT NULL DEFAULT 'success',
	`statusCode` int,
	`errorMessage` text,
	`latencyMs` int,
	`ttftMs` int,
	`promptTokens` int DEFAULT 0,
	`completionTokens` int DEFAULT 0,
	`totalTokens` int DEFAULT 0,
	`costUsd` decimal(12,6) DEFAULT '0',
	`temperature` decimal(4,3),
	`maxTokens` int,
	`topP` decimal(4,3),
	`isStreaming` boolean DEFAULT false,
	`endUserId` varchar(255),
	`sessionId` varchar(255),
	`metadata` json,
	CONSTRAINT `traces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `orgId` int;--> statement-breakpoint
CREATE INDEX `apikeys_project_idx` ON `api_keys` (`projectId`);--> statement-breakpoint
CREATE INDEX `apikeys_hash_idx` ON `api_keys` (`keyHash`);--> statement-breakpoint
CREATE INDEX `traces_project_ts_idx` ON `traces` (`projectId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `traces_project_model_idx` ON `traces` (`projectId`,`model`);--> statement-breakpoint
CREATE INDEX `traces_project_status_idx` ON `traces` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `traces_traceid_idx` ON `traces` (`traceId`);