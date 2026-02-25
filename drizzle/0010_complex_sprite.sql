CREATE TABLE `playbook_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`playbookId` int NOT NULL,
	`stepOrder` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text NOT NULL,
	`codeExample` text,
	`expectedImpact` varchar(256),
	`completed` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	CONSTRAINT `playbook_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `playbooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`recommendationId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`priority` enum('p1','p2','p3') NOT NULL,
	`status` enum('not_started','in_progress','resolved') NOT NULL DEFAULT 'not_started',
	`problem` text NOT NULL,
	`rootCause` text NOT NULL,
	`verification` text NOT NULL,
	`baselineMetrics` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `playbooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`playbookId` int,
	`avgConfidence` decimal(5,4),
	`hallucinationRate` decimal(5,4),
	`avgLatency` int,
	`traceCount` int,
	`snapshotAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendation_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`detectorId` varchar(64) NOT NULL,
	`severity` enum('critical','warning','info') NOT NULL,
	`headline` varchar(512) NOT NULL,
	`problem` text NOT NULL,
	`rootCause` text NOT NULL,
	`evidence` json NOT NULL,
	`status` enum('active','dismissed','resolved') NOT NULL DEFAULT 'active',
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`dismissedAt` timestamp,
	`resolvedAt` timestamp,
	CONSTRAINT `recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `ps_playbook_idx` ON `playbook_steps` (`playbookId`);--> statement-breakpoint
CREATE INDEX `pb_project_idx` ON `playbooks` (`projectId`);--> statement-breakpoint
CREATE INDEX `pb_status_idx` ON `playbooks` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `snap_project_idx` ON `recommendation_snapshots` (`projectId`,`snapshotAt`);--> statement-breakpoint
CREATE INDEX `rec_project_idx` ON `recommendations` (`projectId`);--> statement-breakpoint
CREATE INDEX `rec_status_idx` ON `recommendations` (`projectId`,`status`);