CREATE TABLE IF NOT EXISTS `product_uploaded_images` (
  `product_code` text PRIMARY KEY NOT NULL,
  `content` blob NOT NULL,
  `content_type` text NOT NULL,
  `etag` text NOT NULL,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_code`) REFERENCES `products`(`code`) ON UPDATE no action ON DELETE cascade
);
