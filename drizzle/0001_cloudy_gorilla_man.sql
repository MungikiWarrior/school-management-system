CREATE TABLE `attendances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`classGroupId` int NOT NULL,
	`date` date NOT NULL,
	`status` enum('PRESENT','ABSENT','LATE','EXCUSED') NOT NULL DEFAULT 'PRESENT',
	`recordedById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attendances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorName` varchar(150) NOT NULL,
	`action` varchar(100) NOT NULL,
	`details` text NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`gradeLevel` int NOT NULL,
	`classTeacherId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classGroups_id` PRIMARY KEY(`id`),
	CONSTRAINT `classGroups_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `credentialNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`recipient` varchar(320) NOT NULL,
	`identifier` varchar(64) NOT NULL,
	`temporaryPassword` varchar(64) NOT NULL,
	`channel` enum('EMAIL','SMS') NOT NULL DEFAULT 'EMAIL',
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credentialNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promotionRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`term` varchar(50) NOT NULL,
	`averageScore` float NOT NULL,
	`previousGrade` int NOT NULL,
	`newGrade` int NOT NULL,
	`promoted` boolean NOT NULL,
	`graduated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `promotionRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resultEditRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resultId` int NOT NULL,
	`requestedById` int NOT NULL,
	`newScore` float NOT NULL,
	`newMaxScore` float NOT NULL,
	`newTitle` varchar(150) NOT NULL,
	`newTerm` varchar(50) NOT NULL,
	`reason` text,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`resolvedAt` timestamp,
	`resolvedBy` varchar(150),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `resultEditRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`subjectId` int NOT NULL,
	`recordedById` int NOT NULL,
	`title` varchar(150) NOT NULL,
	`score` float NOT NULL,
	`maxScore` float NOT NULL DEFAULT 100,
	`term` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`regNumber` varchar(64) NOT NULL,
	`fullName` varchar(150) NOT NULL,
	`gender` enum('MALE','FEMALE') NOT NULL,
	`gradeLevel` int NOT NULL,
	`classGroupId` int,
	`guardianName` varchar(150),
	`guardianPhone` varchar(50),
	`guardianEmail` varchar(320),
	`graduated` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `students_id` PRIMARY KEY(`id`),
	CONSTRAINT `students_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `students_regNumber_unique` UNIQUE(`regNumber`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`code` varchar(50) NOT NULL,
	`gradeLevel` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`),
	CONSTRAINT `subjects_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fullName` varchar(150) NOT NULL,
	`email` varchar(320),
	`phone` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `teachers_id` PRIMARY KEY(`id`),
	CONSTRAINT `teachers_userId_unique` UNIQUE(`userId`),
	CONSTRAINT `teachers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `timetables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classGroupId` int NOT NULL,
	`subjectId` int NOT NULL,
	`teacherId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`startTime` varchar(10) NOT NULL,
	`endTime` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `timetables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','teacher','student') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `identifier` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `mustResetPassword` boolean DEFAULT true NOT NULL;