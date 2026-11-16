/* API da MIP: Express + Prisma (PostgreSQL). Em produção também serve o site (apps/web/dist). */
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { ActionError } from './modules/shared.js';
import { sendMail } from './mail.js';
import { sessionUser, routes as authRoutes } from './auth.js';
import { routes as moduleRoutes } from './modules/index.js';

const prisma = new PrismaClient();
/* Um erro que escapou de uma rota fica registrado, mas o servidor continua no ar. */
process.on('unhandledRejection', e => console.error('Erro não tratado:', e?.message || e));
const app = express();
const prod = process.env.NODE_ENV === 'production';
const devLogin = process.env.DEV_LOGIN === '1';
/* Versão de teste com usuários: entra com nome e e-mail, sem confirmar o e-mail (enquanto não há domínio para enviar e-mails). */
const testLogin = process.env.TEST_LOGIN === '1';
/* Botão "Feedback" e nota de satisfação (fase de testes). Quem está em ADMIN_EMAILS vê tudo em /admin. */
const feedbackOn = process.env.FEEDBACK !== '0';
const admins = new Set((process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean));
const isAdmin = u => !!u && admins.has(u.email.toLowerCase());

app.set('trust proxy', 1);
app.disable('x-powered-by');
/* O feedback pode levar até 3 prints (já reduzidos no navegador); o resto da API aceita pedidos pequenos.
   A Vercel recusa pedidos acima de 4,5 MB, então o feedback fica abaixo disso. */
const jsonSmall = express.json({ limit: '200kb' }), jsonFeedback = express.json({ limit: '4400kb' });
app.use((req, res, next) => (req.path === '/api/feedback' ? jsonFeedback : jsonSmall)(req, res, next));
app.use(cookieParser());
app.use((_req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN' });
  next();
});
/* Sessão só nas rotas da API: os arquivos do site (JS, CSS, HTML) não precisam consultar o banco. */
app.use('/api', sessionUser(prisma));

/* Pedidos que mudam dados precisam ser JSON: um formulário de outro site não consegue enviar isso sem permissão (CSRF). */
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && !req.is('application/json')) return res.status(415).json({ err: { _: 'Envie os dados em JSON.' } });
  next();
});

const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(e => {
  if (e instanceof ActionError) return res.status(e.status).json({ err: e.err });
  console.error(e);
  res.status(500).json({ err: { _: 'Algo deu errado do nosso lado. Tente de novo.' } });
});
const auth = (req, res, next) => (req.user ? next() : res.status(401).json({ err: { _: 'Entre na sua conta para continuar.' } }));

/* ===== Rotas: conta (auth.js) e módulos (modules/) ===== */
const ctx = { prisma, wrap, auth, prod, devLogin, testLogin, feedbackOn, isAdmin };
authRoutes(app, ctx);
moduleRoutes(app, ctx);

/* ===== Site (build do apps/web) ===== */
const web = join(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(web)) {
  app.use(express.static(web, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(web, 'index.html')));
}
app.use('/api', (_req, res) => res.status(404).json({ err: { _: 'Rota não encontrada.' } }));

/* Na Vercel, a API roda como função (api/index.js usa este app); no computador e em servidores comuns, fica ouvindo uma porta. */
if (!process.env.VERCEL) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`MIP API em http://localhost:${port}`));
}

export { sendMail };
export default app;
