WITH product_slugs(product_code, slug) AS (
  VALUES
    ('HF 02A','hf-02a'),
    ('HF 14','hf-14'),
    ('HF 23','hf-23'),
    ('HF 30','hf-30'),
    ('HF 31','hf-31'),
    ('HF 31B','hf-31b'),
    ('HF 32','hf-32'),
    ('HF 38','hf-38'),
    ('HF 51C','hf-51c'),
    ('HF 549B','hf-549b'),
    ('HF 81','hf-81'),
    ('HF 81C','hf-81c'),
    ('HF 87A','hf-87a'),
    ('HF 87B','hf-87b')
),
gallery(filename, description, sort_order) AS (
  VALUES
    ('1_principal.jpg','vista principal do par de discos',1),
    ('2_disco_embalagem.jpg','disco e embalagem Hipper Freios',2),
    ('3_veiculos_e_disco.jpg','aplicações ilustrativas e disco',3),
    ('4_veiculos_disco_embalagem.jpg','aplicações, disco e embalagem',4),
    ('5_par_de_discos.jpg','par com dois discos de freio',5),
    ('6_garantia.jpg','informações de garantia',6)
)
INSERT OR IGNORE INTO product_images(product_code, image_url, alt_text, sort_order)
SELECT products.code,
       '/products/' || product_slugs.slug || '/' || gallery.filename,
       products.product || ' HighParts ' || products.code || ' — ' || gallery.description,
       gallery.sort_order
  FROM product_slugs
  JOIN products ON products.code = product_slugs.product_code
 CROSS JOIN gallery;
--> statement-breakpoint
UPDATE products
   SET image_url = '/products/' || lower(replace(code,' ','-')) || '/1_principal.jpg',
       updated_at = CURRENT_TIMESTAMP
 WHERE code IN (
   'HF 02A','HF 14','HF 23','HF 30','HF 31','HF 31B','HF 32',
   'HF 38','HF 51C','HF 549B','HF 81','HF 81C','HF 87A','HF 87B'
 );
