-- HF 01 ainda carregava o preço e o saldo cadastrados manualmente antes da
-- integração com o Bling. Não publique esses valores como se fossem oficiais.
-- A próxima sincronização preencherá os campos quando encontrar no Bling um
-- produto cujo código (SKU) seja exatamente "HF 01".
UPDATE `products`
   SET `price_cents` = NULL,
       `stock_quantity` = NULL,
       `bling_stock_quantity` = NULL,
       `updated_at` = CURRENT_TIMESTAMP
 WHERE `code` = 'HF 01'
   AND `inventory_source` <> 'bling';
