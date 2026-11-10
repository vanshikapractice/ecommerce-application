ALTER TABLE `notifications`
  ADD COLUMN `dedupeKey` VARCHAR(255) NOT NULL;

CREATE UNIQUE INDEX `notifications_dedupeKey_key`
  ON `notifications`(`dedupeKey`);
