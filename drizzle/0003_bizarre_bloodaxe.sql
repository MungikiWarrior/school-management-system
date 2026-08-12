ALTER TABLE `credentialNotifications` ADD `status` enum('SENT','FAILED') DEFAULT 'SENT' NOT NULL;--> statement-breakpoint
ALTER TABLE `credentialNotifications` ADD `errorMessage` text;--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(128);