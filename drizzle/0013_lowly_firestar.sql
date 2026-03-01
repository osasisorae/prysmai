CREATE TABLE `usage_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orgId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`threshold` int NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`emailTo` varchar(320) NOT NULL,
	CONSTRAINT `usage_alerts_id` PRIMARY KEY(`id`),
	CONSTRAINT `usage_alerts_org_period_threshold_idx` UNIQUE(`orgId`,`periodStart`,`threshold`)
);
