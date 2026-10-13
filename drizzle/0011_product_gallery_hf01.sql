CREATE TABLE `product_images` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_code` text NOT NULL,
  `image_url` text NOT NULL,
  `alt_text` text NOT NULL,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_code`) REFERENCES `products`(`code`) ON UPDATE CASCADE ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_images_product_url_unique` ON `product_images` (`product_code`,`image_url`);
--> statement-breakpoint
CREATE INDEX `product_images_product_sort_idx` ON `product_images` (`product_code`,`sort_order`);
--> statement-breakpoint
INSERT INTO `product_images` (`product_code`,`image_url`,`alt_text`,`sort_order`)
SELECT `code`,'/products/hf-01/01-disco.jpg','Disco de freio HighParts HF 01',1 FROM `products` WHERE `code`='HF 01';
--> statement-breakpoint
INSERT INTO `product_images` (`product_code`,`image_url`,`alt_text`,`sort_order`)
SELECT `code`,'/products/hf-01/02-disco-embalagem.jpg','Disco de freio HF 01 com embalagem Hipper Freios',2 FROM `products` WHERE `code`='HF 01';
--> statement-breakpoint
INSERT INTO `product_images` (`product_code`,`image_url`,`alt_text`,`sort_order`)
SELECT `code`,'/products/hf-01/03-aplicacao-gol.jpg','Aplicação ilustrativa do disco HF 01 em Volkswagen Gol',3 FROM `products` WHERE `code`='HF 01';
--> statement-breakpoint
INSERT INTO `product_images` (`product_code`,`image_url`,`alt_text`,`sort_order`)
SELECT `code`,'/products/hf-01/04-kit-aplicacao.jpg','Disco HF 01, embalagem e aplicação ilustrativa',4 FROM `products` WHERE `code`='HF 01';
--> statement-breakpoint
INSERT INTO `product_images` (`product_code`,`image_url`,`alt_text`,`sort_order`)
SELECT `code`,'/products/hf-01/05-posicao-dianteira.jpg','Posição dianteira ilustrativa do disco HF 01',5 FROM `products` WHERE `code`='HF 01';
--> statement-breakpoint
UPDATE `products`
   SET `image_url`='/products/hf-01/01-disco.jpg',`updated_at`=CURRENT_TIMESTAMP
 WHERE `code`='HF 01';
