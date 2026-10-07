# HighParts no GitHub

O projeto usa um único repositório para frontend e backend. O frontend React, as rotas de API e o painel administrativo são compilados no mesmo Cloudflare Worker. O banco é Cloudflare D1.

## Fluxo

- Pull requests e branches executam `.github/workflows/ci.yml`.
- Pushes em `main` executam `.github/workflows/deploy.yml`.
- O workflow instala as dependências com `npm ci`, compila o projeto, aplica as migrações D1 e publica o Worker.
- O ambiente `production` impede que dois deploys concorrentes sejam executados ao mesmo tempo.

## Configuração do repositório

Em **Settings → Secrets and variables → Actions**, cadastre:

### Secrets

- `CLOUDFLARE_API_TOKEN`: token com acesso a Workers Scripts e D1.
- `CLOUDFLARE_ACCOUNT_ID`: identificador da conta Cloudflare.

### Variables

- `CLOUDFLARE_D1_DATABASE_ID`: ID do banco D1 de produção.
- `CLOUDFLARE_D1_DATABASE_NAME`: nome do banco, recomendado `highparts-production`.
- `CLOUDFLARE_WORKER_NAME`: nome do Worker, recomendado `highparts`.

Crie também o environment `production`. É recomendável exigir aprovação manual nesse environment enquanto a loja estiver em implantação.

## Banco de dados

As alterações de esquema ficam em `drizzle/`. O deploy aplica apenas migrações pendentes antes de publicar a aplicação. Dados de catálogo não devem ser colocados nas migrações; o administrador importa o catálogo pelo painel.

## Branches

- `main`: produção.
- `develop`: integração e homologação.
- `feature/<nome>`: desenvolvimento de uma funcionalidade.

Ative proteção em `main`, exigindo pull request e o check `validate` antes do merge.

