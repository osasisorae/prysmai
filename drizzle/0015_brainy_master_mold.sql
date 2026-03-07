CREATE TABLE `agent_sessions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`status` enum('active','completed','failed','timeout') NOT NULL DEFAULT 'active',
	`agentType` enum('claude_code','manus','kiro','codex','langchain','crewai','custom') NOT NULL,
	`source` enum('mcp','sdk','api') NOT NULL DEFAULT 'mcp',
	`taskInstructions` text,
	`availableTools` json,
	`context` json,
	`outcome` enum('completed','failed','partial','timeout'),
	`outputSummary` text,
	`filesModified` json,
	`totalEvents` int DEFAULT 0,
	`totalLlmCalls` int DEFAULT 0,
	`totalToolCalls` int DEFAULT 0,
	`totalTokens` int DEFAULT 0,
	`totalCostCents` int DEFAULT 0,
	`behaviorScore` int,
	`behavioralFlags` json,
	`startedAt` bigint NOT NULL,
	`endedAt` bigint,
	`durationMs` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_project_sessionid_idx` UNIQUE(`projectId`,`sessionId`)
);
--> statement-breakpoint
CREATE TABLE `behavioral_assessments` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`overallScore` int NOT NULL,
	`assessmentType` enum('realtime','post_session') NOT NULL,
	`detectors` json NOT NULL,
	`summary` text,
	`recommendations` json,
	`assessedAt` bigint NOT NULL,
	`processingMs` int,
	CONSTRAINT `behavioral_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `code_security_scans` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`eventId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`language` varchar(32) NOT NULL,
	`filePath` varchar(512),
	`vulnerabilityCount` int DEFAULT 0,
	`vulnerabilities` json,
	`hasInjection` boolean DEFAULT false,
	`hasAuthIssues` boolean DEFAULT false,
	`hasPiiExposure` boolean DEFAULT false,
	`hasSecretLeak` boolean DEFAULT false,
	`hasInputValidation` boolean DEFAULT false,
	`hasDependencyRisk` boolean DEFAULT false,
	`maxSeverity` enum('info','low','medium','high','critical') DEFAULT 'info',
	`scannedAt` bigint NOT NULL,
	`processingMs` int,
	CONSTRAINT `code_security_scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_policies` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`policyType` enum('behavioral','security','cost','model_access','tool_access','content','compliance') NOT NULL,
	`rules` json NOT NULL,
	`enforcement` enum('monitor','warn','block') DEFAULT 'monitor',
	`enabled` boolean DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `governance_policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `governance_violations` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`eventId` bigint,
	`policyId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`severity` enum('info','low','medium','high','critical') NOT NULL,
	`description` text NOT NULL,
	`evidence` json,
	`status` enum('open','acknowledged','resolved','false_positive') DEFAULT 'open',
	`resolvedBy` int,
	`resolvedAt` bigint,
	`resolutionNote` text,
	`detectedAt` bigint NOT NULL,
	CONSTRAINT `governance_violations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`traceId` int,
	`eventType` enum('llm_call','tool_call','tool_result','code_generated','code_executed','file_read','file_write','decision','error','delegation','user_input','session_start','session_end') NOT NULL,
	`eventData` json NOT NULL,
	`toolName` varchar(128),
	`toolInput` json,
	`toolOutput` json,
	`toolSuccess` boolean,
	`toolDurationMs` int,
	`codeLanguage` varchar(32),
	`codeContent` text,
	`codeFilePath` varchar(512),
	`codeS3Key` varchar(512),
	`model` varchar(128),
	`promptTokens` int,
	`completionTokens` int,
	`costCents` int,
	`behavioralFlags` json,
	`eventTimestamp` bigint NOT NULL,
	`sequenceNumber` int NOT NULL,
	`threatScore` int DEFAULT 0,
	`securityFlags` json,
	CONSTRAINT `session_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session_summaries` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`sessionId` bigint NOT NULL,
	`projectId` int NOT NULL,
	`summaryType` enum('behavioral','security','compliance','full') NOT NULL,
	`content` text NOT NULL,
	`scores` json,
	`findings` json,
	`generatedAt` bigint NOT NULL,
	`modelUsed` varchar(128),
	`processingMs` int,
	CONSTRAINT `session_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `sessions_project_status_idx` ON `agent_sessions` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `sessions_project_started_idx` ON `agent_sessions` (`projectId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `sessions_agent_type_idx` ON `agent_sessions` (`projectId`,`agentType`);--> statement-breakpoint
CREATE INDEX `bassess_session_idx` ON `behavioral_assessments` (`sessionId`);--> statement-breakpoint
CREATE INDEX `bassess_project_time_idx` ON `behavioral_assessments` (`projectId`,`assessedAt`);--> statement-breakpoint
CREATE INDEX `bassess_score_idx` ON `behavioral_assessments` (`projectId`,`overallScore`);--> statement-breakpoint
CREATE INDEX `codescan_session_idx` ON `code_security_scans` (`sessionId`);--> statement-breakpoint
CREATE INDEX `codescan_project_severity_idx` ON `code_security_scans` (`projectId`,`maxSeverity`);--> statement-breakpoint
CREATE INDEX `codescan_project_time_idx` ON `code_security_scans` (`projectId`,`scannedAt`);--> statement-breakpoint
CREATE INDEX `govpol_project_type_idx` ON `governance_policies` (`projectId`,`policyType`);--> statement-breakpoint
CREATE INDEX `govpol_project_enabled_idx` ON `governance_policies` (`projectId`,`enabled`);--> statement-breakpoint
CREATE INDEX `govviol_session_idx` ON `governance_violations` (`sessionId`);--> statement-breakpoint
CREATE INDEX `govviol_policy_idx` ON `governance_violations` (`policyId`);--> statement-breakpoint
CREATE INDEX `govviol_project_status_idx` ON `governance_violations` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `govviol_project_severity_idx` ON `governance_violations` (`projectId`,`severity`);--> statement-breakpoint
CREATE INDEX `sevents_session_idx` ON `session_events` (`sessionId`);--> statement-breakpoint
CREATE INDEX `sevents_session_seq_idx` ON `session_events` (`sessionId`,`sequenceNumber`);--> statement-breakpoint
CREATE INDEX `sevents_project_time_idx` ON `session_events` (`projectId`,`eventTimestamp`);--> statement-breakpoint
CREATE INDEX `sevents_event_type_idx` ON `session_events` (`sessionId`,`eventType`);--> statement-breakpoint
CREATE INDEX `sevents_tool_name_idx` ON `session_events` (`sessionId`,`toolName`);--> statement-breakpoint
CREATE INDEX `sesssum_session_idx` ON `session_summaries` (`sessionId`);--> statement-breakpoint
CREATE INDEX `sesssum_project_time_idx` ON `session_summaries` (`projectId`,`generatedAt`);