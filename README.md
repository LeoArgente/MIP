# MIP

Camada pré-jurídica para equipes: cada pessoa responde em particular sobre o que a equipe criou, a plataforma mostra só onde as respostas diferem, quem organiza registra as decisões, todos confirmam e o acordo vira um registro com código de verificação.

O repositório tem duas versões:

| | O que é | Como abrir |
|---|---|---|
| `Protótipo MIP V1.html` | Protótipo de página única, usado nos testes de usabilidade. Os dados ficam só no navegador. | Abra o arquivo no navegador. `?sessao` no endereço esconde as ferramentas de teste. |
| `apps/` e `packages/` | Versão para várias pessoas, com conta, servidor e banco de dados. Começa como cópia fiel do protótipo. | Veja abaixo. |

## Estrutura

```
packages/tokens   Design tokens (cores, tipografia Montserrat, espaçamento, raios). Fonte: tokens.json
packages/domain   Regras da MIP (perguntas, comparação, proposta, próxima tarefa, registro do acordo),
                  usadas igual no servidor e no navegador
apps/api          Servidor Node + Express + Prisma (PostgreSQL): contas, projetos e ações
apps/web          Site em React (Vite)
```

### Privacidade
O servidor nunca envia as respostas de uma pessoa para outra. Durante as respostas, cada pessoa recebe só as suas e um marcador de "já enviou" das demais. Depois que quem organiza encerra as respostas, chegam apenas contagens por pergunta, sem autor e embaralhadas (`apps/api/src/view.js`).

### Entrar
Sem senha: a pessoa digita o e-mail e recebe um link de acesso (vale 30 minutos, uma vez só). Os e-mails saem pela [Resend](https://resend.com). Sem a chave da Resend, o link aparece no terminal e, fora de produção, na própria tela de entrada.

## Rodar no computador

Precisa de Node 20+ e PostgreSQL.

```bash
npm install
createdb mip_dev
cp apps/api/.env.example apps/api/.env      # ajuste DATABASE_URL com seu usuário do Postgres
npm run db:migrate                          # cria as tabelas
npm run db:seed                             # cenário de demonstração (Ana, Bruno, Carla)
npm run dev                                 # site em http://localhost:5173 e API em :3001
```

Com `DEV_LOGIN=1` no `.env`, o topo mostra **Entrar como** para trocar de pessoa sem e-mail, como o "Ver como" do protótipo. Nunca ative isso num site com dados reais.

### Testes
```bash
npm test                                         # regras (packages/domain)
npm run db:seed && npm test -w @mip/api          # jornada completa pela API (servidor rodando, DEV_LOGIN=1)
```

## Publicar online (Vercel)

O site (`apps/web/dist`) e a API rodam na [Vercel]; o banco fica no Supabase. A API vira uma função (`api/index.js`), na região de São Paulo (`gru1`), perto do banco. A configuração está em `vercel.json`.

1. Na Vercel, **Add New > Project** e escolha este repositório. Não mude as opções de build: elas vêm do `vercel.json`.
2. Em **Settings > Git > Production Branch**, use `prod`. Cada envio para a `prod` publica o site; as outras branches viram prévias.
3. Em **Settings > Environment Variables**, preencha:
   - `DATABASE_URL`: Supabase, **Transaction pooler** (porta 6543) com `?pgbouncer=true&connection_limit=1` no fim.
   - `DIRECT_URL`: Supabase, **Session pooler** (porta 5432). Usada só para as migrações.
   - `TEST_LOGIN=1`, `DEV_LOGIN=0`, `FEEDBACK=1` e `ADMIN_EMAILS` (e-mails que abrem o /admin).
   - `RESEND_API_KEY` e `MAIL_FROM`, quando houver envio de e-mail. `APP_URL` só se usarem um domínio próprio.

As migrações (`prisma migrate deploy`) rodam no build, só no deploy de produção. Prévias de outras branches usam as mesmas variáveis: se apontarem para o banco de produção, o que for feito nelas aparece lá.

Para publicar o que está na `main`: `git checkout prod && git merge main && git push && git checkout main`.

[Vercel]: https://vercel.com

## Design tokens
Edite `packages/tokens/tokens.json` e rode `npm run tokens`. O site usa as variáveis geradas (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--size-*`) e as classes de texto `.t-hero`, `.t-h2`, `.t-h3`, `.t-title`, `.t-body-lg`, `.t-body`, `.t-small`, `.t-label`, `.t-button`, `.t-nav`.
