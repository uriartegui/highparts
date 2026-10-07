UPDATE `users`
SET `phone` = replace(replace(replace(replace(replace(`phone`, '(', ''), ')', ''), ' ', ''), '-', ''), '+', '')
WHERE `phone` <> '';

CREATE UNIQUE INDEX IF NOT EXISTS `users_phone_unique`
ON `users` (`phone`)
WHERE `phone` <> '';
