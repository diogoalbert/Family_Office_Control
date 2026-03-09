CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`userName` varchar(128),
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`contextUsed` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` int NOT NULL,
	`chunkIndex` int NOT NULL,
	`content` text NOT NULL,
	`embedding` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documentChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(256) NOT NULL,
	`originalName` varchar(256) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`uploaderId` int,
	`uploaderName` varchar(128),
	`processed` boolean NOT NULL DEFAULT false,
	`processingError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week` int NOT NULL,
	`description` text NOT NULL,
	`status` enum('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
	`pendingReason` text,
	`responsibleId` int,
	`memberId` int NOT NULL,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`dueDate` timestamp,
	`completedAt` timestamp,
	`pendingSince` timestamp,
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teamMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`role` varchar(128) NOT NULL,
	`area` varchar(128),
	`color` varchar(32) DEFAULT '#6366f1',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teamMembers_id` PRIMARY KEY(`id`)
);
