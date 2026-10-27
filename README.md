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

## Publicar online (grátis)

1. Crie uma conta na [Render](https://render.com) e escolha **New > Blueprint** com este repositório. O `render.yaml` cria o site e o banco.
2. Em **Environment**, preencha `APP_URL` com o endereço que a Render der (ex.: `https://mip.onrender.com`).
3. Crie uma conta na [Resend](https://resend.com), gere uma chave e coloque em `RESEND_API_KEY`. Para mandar e-mail para qualquer pessoa, a Resend pede um domínio verificado; sem domínio, ela só envia para o e-mail da própria conta.

O plano grátis da Render "dorme" depois de 15 minutos sem uso: o primeiro acesso seguinte leva cerca de 1 minuto. O banco grátis da Render expira em 30 dias; para algo mais duradouro, use o PostgreSQL grátis da [Neon](https://neon.tech) e coloque a URL em `DATABASE_URL`.

## Design tokens
Edite `packages/tokens/tokens.json` e rode `npm run tokens`. O site usa as variáveis geradas (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--size-*`) e as classes de texto `.t-hero`, `.t-h2`, `.t-h3`, `.t-title`, `.t-body-lg`, `.t-body`, `.t-small`, `.t-label`, `.t-button`, `.t-nav`.
