ALTER TABLE `tasks` ADD `reviewFileUrl` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `reviewFileKey` varchar(512);--> statement-breakpoint
ALTER TABLE `tasks` ADD `reviewFileName` varchar(256);--> statement-breakpoint
ALTER TABLE `tasks` ADD `reviewFileMimeType` varchar(128);--> statement-breakpoint
ALTER TABLE `tasks` ADD `reviewFileSize` int;