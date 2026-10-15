UPDATE `products`
SET `image_url` = `image_url` || '&r=1',
    `updated_at` = CURRENT_TIMESTAMP
WHERE `image_url` LIKE '/media/product/%?v=%'
  AND `image_url` NOT LIKE '%&r=1';
