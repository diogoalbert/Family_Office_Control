ALTER TABLE `tasks` ADD COLUMN `reviewFileUrl` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `reviewFileKey` varchar(512);
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `reviewFileName` varchar(256);
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `reviewFileMimeType` varchar(128);
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `reviewFileSize` int;
