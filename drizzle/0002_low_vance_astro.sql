ALTER TABLE `users` ADD `resetToken` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `resetTokenExpires` timestamp;