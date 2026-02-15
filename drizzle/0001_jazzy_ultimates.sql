CREATE TABLE `waitlist_signups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`source` varchar(64) DEFAULT 'landing_page',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waitlist_signups_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_signups_email_unique` UNIQUE(`email`)
);
