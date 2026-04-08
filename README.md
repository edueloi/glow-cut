# Glow & Cut

Sistema de agendamento com frontend em Vite/React, backend em Express e acesso ao banco via Prisma/MySQL.

## Rodar localmente

1. Instale as dependências:
   `npm install`
2. Configure o arquivo `.env` com a `DATABASE_URL` do MySQL.
3. Gere/aplique a estrutura do banco:
   `npm run migrate`
4. Suba o projeto:
   `npm run dev`

## Banco de dados

- O fluxo oficial de alterações de banco está em `migrate.js`.
- Sempre que criar ou alterar tabelas/colunas, atualize `migrate.js`.
- Mantenha `prisma/schema.prisma` compatível com o banco atual.
- O deploy usa `npm run migrate` antes de reiniciar a aplicação.

## Deploy

- Setup inicial: `bash deploy/setup-vps.sh`
- Atualização: `bash deploy/update.sh`
