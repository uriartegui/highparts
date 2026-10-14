-- O produto HF 01 já existia no Bling com o código legado "1", e o Bling
-- mantém esse campo bloqueado. Vincule-o pelo ID permanente para que preço e
-- estoque sejam sincronizados sem apagar e recriar o cadastro.
UPDATE `products`
   SET `bling_product_id` = '16719042995',
       `updated_at` = CURRENT_TIMESTAMP
 WHERE `code` = 'HF 01'
   AND NOT EXISTS (
     SELECT 1
       FROM `products` AS `other`
      WHERE `other`.`bling_product_id` = '16719042995'
        AND `other`.`code` <> 'HF 01'
   );
