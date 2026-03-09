CREATE TABLE `agent_network_snapshots` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`agents` json NOT NULL,
	`edges` json NOT NULL,
	`totalAgents` int NOT NULL,
	`totalDelegations` int DEFAULT 0,
	`totalMessages` int DEFAULT 0,
	`activeConflicts` int DEFAULT 0,
	`snapshotAt` bigint NOT NULL,
	CONSTRAINT `agent_network_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_alerts` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`eventId` bigint,
	`alertType` enum('cost_spike','budget_exceeded','velocity_anomaly','cumulative_overrun') NOT NULL,
	`severity` enum('info','warning','critical','halt') NOT NULL,
	`currentCostCents` int NOT NULL,
	`baselineCostCents` int,
	`budgetLimitCents` int,
	`deviationPercent` decimal(8,2),
	`cumulativeCostCents` int,
	`model` varchar(128),
	`tokenCount` int,
	`message` text NOT NULL,
	`evidence` json,
	`status` enum('open','acknowledged','resolved','false_positive') DEFAULT 'open',
	`resolvedBy` int,
	`resolvedAt` bigint,
	`detectedAt` bigint NOT NULL,
	CONSTRAINT `financial_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loop_detections` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`loopType` enum('repeated_tool','circular_sequence','llm_loop','state_oscillation') NOT NULL,
	`severity` enum('info','warning','critical','halt') NOT NULL,
	`pattern` json NOT NULL,
	`repetitionCount` int NOT NULL,
	`windowSize` int,
	`circuitBreakerTriggered` boolean DEFAULT false,
	`message` text NOT NULL,
	`evidence` json,
	`status` enum('open','acknowledged','resolved','false_positive') DEFAULT 'open',
	`resolvedBy` int,
	`resolvedAt` bigint,
	`detectedAt` bigint NOT NULL,
	CONSTRAINT `loop_detections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `multi_agent_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`eventType` enum('unexpected_agent','circular_delegation','deep_delegation','instruction_conflict','orphaned_delegation','communication') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`fromAgent` varchar(128),
	`toAgent` varchar(128),
	`agentId` varchar(128),
	`delegationChain` json,
	`delegationDepth` int,
	`conflictingInstructions` json,
	`message` text NOT NULL,
	`evidence` json,
	`status` enum('open','acknowledged','resolved','false_positive') DEFAULT 'open',
	`resolvedBy` int,
	`resolvedAt` bigint,
	`detectedAt` bigint NOT NULL,
	CONSTRAINT `multi_agent_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resource_access_violations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`eventId` bigint,
	`violationType` enum('unauthorized_tool','blocked_tool','unauthorized_domain','blocked_domain','unauthorized_file','blocked_file') NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`resourceName` varchar(512) NOT NULL,
	`resourceCategory` enum('tool','domain','file') NOT NULL,
	`agentId` varchar(128),
	`message` text NOT NULL,
	`evidence` json,
	`status` enum('open','acknowledged','resolved','false_positive') DEFAULT 'open',
	`resolvedBy` int,
	`resolvedAt` bigint,
	`detectedAt` bigint NOT NULL,
	CONSTRAINT `resource_access_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `agentnet_session_idx` ON `agent_network_snapshots` (`sessionId`);--> statement-breakpoint
CREATE INDEX `agentnet_project_time_idx` ON `agent_network_snapshots` (`projectId`,`snapshotAt`);--> statement-breakpoint
CREATE INDEX `finalert_session_idx` ON `financial_alerts` (`sessionId`);--> statement-breakpoint
CREATE INDEX `finalert_project_type_idx` ON `financial_alerts` (`projectId`,`alertType`);--> statement-breakpoint
CREATE INDEX `finalert_project_severity_idx` ON `financial_alerts` (`projectId`,`severity`);--> statement-breakpoint
CREATE INDEX `finalert_project_time_idx` ON `financial_alerts` (`projectId`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `loopdet_session_idx` ON `loop_detections` (`sessionId`);--> statement-breakpoint
CREATE INDEX `loopdet_project_type_idx` ON `loop_detections` (`projectId`,`loopType`);--> statement-breakpoint
CREATE INDEX `loopdet_project_severity_idx` ON `loop_detections` (`projectId`,`severity`);--> statement-breakpoint
CREATE INDEX `loopdet_project_time_idx` ON `loop_detections` (`projectId`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `maevt_session_idx` ON `multi_agent_events` (`sessionId`);--> statement-breakpoint
CREATE INDEX `maevt_project_type_idx` ON `multi_agent_events` (`projectId`,`eventType`);--> statement-breakpoint
CREATE INDEX `maevt_project_severity_idx` ON `multi_agent_events` (`projectId`,`severity`);--> statement-breakpoint
CREATE INDEX `maevt_project_time_idx` ON `multi_agent_events` (`projectId`,`detectedAt`);--> statement-breakpoint
CREATE INDEX `maevt_from_agent_idx` ON `multi_agent_events` (`sessionId`,`fromAgent`);--> statement-breakpoint
CREATE INDEX `maevt_to_agent_idx` ON `multi_agent_events` (`sessionId`,`toAgent`);--> statement-breakpoint
CREATE INDEX `resaccess_session_idx` ON `resource_access_violations` (`sessionId`);--> statement-breakpoint
CREATE INDEX `resaccess_project_type_idx` ON `resource_access_violations` (`projectId`,`violationType`);--> statement-breakpoint
CREATE INDEX `resaccess_project_severity_idx` ON `resource_access_violations` (`projectId`,`severity`);--> statement-breakpoint
CREATE INDEX `resaccess_project_time_idx` ON `resource_access_violations` (`projectId`,`detectedAt`);