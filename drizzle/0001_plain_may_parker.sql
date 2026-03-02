CREATE TABLE `campaign_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`date` timestamp NOT NULL,
	`impressions` bigint DEFAULT 0,
	`clicks` bigint DEFAULT 0,
	`spend` decimal(12,2) DEFAULT '0',
	`reach` bigint DEFAULT 0,
	`conversions` bigint DEFAULT 0,
	`revenue` decimal(12,2) DEFAULT '0',
	`cpc` decimal(10,4) DEFAULT '0',
	`cpm` decimal(10,4) DEFAULT '0',
	`ctr` decimal(8,4) DEFAULT '0',
	`roas` decimal(10,4) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `campaign_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`socialAccountId` int,
	`name` varchar(256) NOT NULL,
	`platform` enum('facebook','instagram','linkedin','twitter','youtube','tiktok','google') NOT NULL,
	`status` enum('active','paused','ended','draft','scheduled') NOT NULL DEFAULT 'draft',
	`objective` varchar(128),
	`budget` decimal(12,2),
	`budgetType` enum('daily','lifetime') DEFAULT 'daily',
	`startDate` timestamp,
	`endDate` timestamp,
	`platformCampaignId` varchar(128),
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','warning','error','success') NOT NULL DEFAULT 'info',
	`isRead` boolean NOT NULL DEFAULT false,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256),
	`content` text NOT NULL,
	`mediaUrls` json,
	`platforms` json NOT NULL,
	`socialAccountIds` json,
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('facebook','instagram','linkedin','twitter','youtube','tiktok') NOT NULL,
	`accountType` enum('profile','page','ad_account','business') NOT NULL DEFAULT 'profile',
	`platformAccountId` varchar(128) NOT NULL,
	`name` varchar(256),
	`username` varchar(128),
	`profilePicture` text,
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`facebookAppId` varchar(64),
	`facebookAppSecret` text,
	`defaultTimezone` varchar(64) DEFAULT 'UTC',
	`notificationsEnabled` boolean DEFAULT true,
	`preferences` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_settings_userId_unique` UNIQUE(`userId`)
);
