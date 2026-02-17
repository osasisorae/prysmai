ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `onboarded` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `waitlist_signups` ADD `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `waitlist_signups` ADD `inviteToken` varchar(128);--> statement-breakpoint
ALTER TABLE `waitlist_signups` ADD `inviteSentAt` timestamp;