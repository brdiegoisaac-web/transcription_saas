CREATE TABLE `transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`originalText` text NOT NULL,
	`segments` text NOT NULL,
	`inputLanguage` varchar(10) NOT NULL,
	`outputLanguage` varchar(10) NOT NULL,
	`duration` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transcriptions_id` PRIMARY KEY(`id`)
);
