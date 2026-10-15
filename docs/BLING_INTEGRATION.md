# Integração Bling da HighParts

## Arquitetura

- O Bling é a fonte oficial de preço e estoque dos produtos vinculados.
- O D1 mantém uma cópia rápida do saldo para a loja e desconta reservas locais que ainda não chegaram ao Bling.
- A planilha continua alimentando descrição, aplicação, código e demais dados técnicos. Ela não deve sobrescrever o saldo oficial de itens vinculados ao Bling.
- Um SKU novo encontrado no Bling entra no administrador como rascunho. Ele permanece fora da loja até que categoria, aplicação, eixo e imagem sejam revisados e o administrador clique em **Publicar**.
- Um pedido pago pelo Mercado Pago entra na fila do Bling. O Worker tenta enviá-lo a cada cinco minutos e evita duplicação usando o número do pedido da loja.
- Ao cancelar um pedido já enviado, o sistema cancela primeiro no Bling e só depois libera a reserva local.

## Configuração segura

1. No Bling, crie um aplicativo OAuth com a URL de retorno:

   `https://highparts.com.br/api/integrations/bling/callback`

2. Conceda acesso de leitura a produtos e estoques e leitura/escrita a contatos e pedidos de venda.
3. Cadastre o webhook:

   `https://highparts.com.br/api/integrations/bling/webhook`

4. No Worker `highparts`, cadastre como secrets:

   - `BLING_CLIENT_ID`
   - `BLING_CLIENT_SECRET`
   - `BLING_TOKEN_ENCRYPTION_KEY` (valor aleatório forte, com pelo menos 32 caracteres)

5. Nas variáveis do GitHub, cadastre:

   - `BLING_PAYMENT_METHOD_ID`: ID da forma de pagamento Mercado Pago no Bling.
   - `BLING_PAID_ORDER_STATUS_ID`: ID da situação que representa pedido pago no Bling.
   - `BLING_INTEGRATION_ENABLED`: mantenha `false` durante a homologação.

6. Faça o deploy, abra **Administração > Integrações**, conecte a conta do Bling e confirme a importação.
7. Confira se os SKUs do Bling são exatamente iguais aos códigos do catálogo. Itens sem correspondência entram em **Produtos e estoque > Novos do Bling** e nunca são publicados automaticamente.
8. Faça uma compra de baixo valor, confirme pedido, saldo e cancelamento. Somente depois altere `BLING_INTEGRATION_ENABLED` para `true` e faça novo deploy.

## Nota fiscal

O site entrega o pedido pago ao Bling. A emissão de NF-e deve ser configurada no próprio Bling, com certificado digital, natureza de operação, tributação, NCM/CEST e regras fiscais revisadas pelo contador. A integração não tenta emitir uma nota sem esses dados, porque isso pode gerar um documento fiscal incorreto.

Nunca envie tokens, secrets ou o certificado digital por chat ou commit.
