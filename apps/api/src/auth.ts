/* Entrada por link no e-mail (sem senha) e sessões em cookie httpOnly. */
import { randomBytes, createHash } from 'node:crypto';
import { sendMail, mailMode } from './mail.js';
import { wrapMw } from './http.js';
import { Prisma } from '@prisma/client';
import type { PrismaClient, User } from '@prisma/client';
import type { Express, Request, Response, RequestHandler } from 'express';
import type { Contexto, AuthedRequest } from './server.js';

declare global {
  namespace Express {
    interface Request {
      /** Pessoa da sessão, posta por sessionUser. Só existe com cookie de sessão válido; o middleware `auth` recusa o pedido sem ela. */
      user?: User;
    }
  }
}

export const COOKIE = 'mip_session';
const SESSION_DAYS = 30, LINK_MINUTES = 30;
const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const token = () => randomBytes(32).toString('base64url');
/* Endereço do site, para links em e-mails. Na Vercel, sem APP_URL, usa o domínio de produção do projeto. */
export const appUrl = () => (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:5173')).replace(/\/$/, '');
export const validEmail = (e: string | null | undefined) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
export const nameFromEmail = (e: string) => { const s = e.split('@')[0].replace(/[._-]+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'Pessoa'; return s.charAt(0).toUpperCase() + s.slice(1); };
/* Só aceita voltar para caminhos internos, para o link não virar redirecionamento para outro site. */
const safeNext = (n: unknown): string => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(n) ? n : '/');

export async function createLoginLink(prisma: Prisma.TransactionClient, { email, name, next }: { email: string; name?: string; next?: unknown }) {
  const t = token();
  await prisma.loginToken.create({ data: { email, name: name || null, next: safeNext(next), tokenHash: hash(t), expiresAt: new Date(Date.now() + LINK_MINUTES * 60e3) } });
  return `${appUrl()}/api/auth/verify?token=${t}`;
}

export async function sendLoginLink(prisma: Prisma.TransactionClient, { email, name, next, subject, text, linkLabel }: { email: string; name?: string; next?: unknown; subject?: string; text?: string; linkLabel?: string }) {
  const link = await createLoginLink(prisma, { email, name, next });
  const r = await sendMail({
    to: email,
    subject: subject || 'Seu link de acesso à MIP',
    text: text || `Use o botão abaixo para entrar na MIP. O link vale por ${LINK_MINUTES} minutos e só funciona uma vez.`,
    link, linkLabel: linkLabel || 'Entrar na MIP'
  });
  return { link, sent: r.sent };
}

export async function verifyLink(prisma: Prisma.TransactionClient, t: string) {
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: hash(t || '') } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.loginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.upsert({ where: { email: row.email }, create: { email: row.email, name: row.name || nameFromEmail(row.email) }, update: {} });
  return { user, next: row.next || '/' };
}

export async function startSession(prisma: Prisma.TransactionClient, res: Response, userId: string) {
  const t = token();
  await prisma.session.create({ data: { userId, tokenHash: hash(t), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) } });
  res.cookie(COOKIE, t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_DAYS * 864e5, path: '/' });
}

/** O que o cookie-parser põe em req.cookies: o texto do cookie ou, se ele começa com "j:" e o JSON lido dele não é
 *  falso, esse JSON (mip_session=j:1 chega como o número 1; j:null, j:false e j:0 continuam texto). O tipo do pacote
 *  é `any`; este é o que de fato pode chegar. */
type ValorCookie = string | number | true | object | undefined;

const cookieDaSessao = (req: Request): ValorCookie => req.cookies?.[COOKIE];

/* O token da sessão, se houver. O servidor só grava texto base64url (sem ":"), então um valor que não é texto foi
   montado à mão e não identifica sessão nenhuma: fica sem token. Quem avisa e limpa o cookie é sessionUser. */
function tokenDaSessao(req: Request): string | undefined {
  const t = cookieDaSessao(req);
  return typeof t === 'string' && t ? t : undefined;
}

/* Erro do banco de verdade: o Prisma não conectou (InitializationError) ou a consulta foi ao banco e voltou com
   erro (KnownRequestError, como P1001, P1017 e P2024; UnknownRequestError). Fica de fora o erro de validação do
   Prisma (consulta mal montada: defeito nosso) e qualquer coisa que não veio do Prisma. */
const erroDeBanco = (e: unknown) => e instanceof Prisma.PrismaClientInitializationError || e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Prisma.PrismaClientUnknownRequestError;

export async function endSession(prisma: Prisma.TransactionClient, req: Request, res: Response) {
  const t = tokenDaSessao(req);
  if (t) await prisma.session.deleteMany({ where: { tokenHash: hash(t) } });
  res.clearCookie(COOKIE, { path: '/' });
}

/* Middleware: põe req.user quando a sessão é válida.
   Cookie de sessão que não é texto: segue sem sessão, com um aviso no log (o tipo, nunca o valor, que vem do
   cliente) e o cookie limpo na resposta, para o navegador parar de mandá-lo já no pedido seguinte.
   Banco indisponível responde 503. Qualquer outra falha (rejeição que não veio do banco) segue por wrapMw para o
   handler de erro: 500 em JSON, para o monitoramento não acusar o banco à toa.
   Dívida conhecida: cookie de texto que não acha sessão (inexistente ou vencida) segue sem sessão e sem log. Se o
   formato do token mudar um dia, todo mundo sai da conta sem sinal nenhum aqui. Não há log para isso de propósito:
   toda sessão vencida apareceria nele. */
export const sessionUser = (prisma: PrismaClient): RequestHandler => wrapMw(async (req, res, next) => {
  const bruto = cookieDaSessao(req);
  if (bruto !== undefined && typeof bruto !== 'string') {
    console.warn('Sessão: cookie não é texto (' + (Array.isArray(bruto) ? 'array' : typeof bruto) + '); seguiu sem sessão e foi limpo.');
    res.clearCookie(COOKIE, { path: '/' });
  }
  const t = tokenDaSessao(req);
  if (t) {
    try {
      const s = await prisma.session.findUnique({ where: { tokenHash: hash(t) }, include: { user: true } });
      if (s && s.expiresAt > new Date()) req.user = s.user;
    } catch (e) {
      if (!erroDeBanco(e)) throw e;
      console.error('Sessão: banco indisponível.', (e as Error).message);
      return res.status(503).json({ err: { _: 'Não foi possível falar com o banco de dados. Tente de novo em instantes.' } });
    }
  }
  next();
});

/* Limite simples por chave (ex.: e-mail) para pedidos de link. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max = 5, windowMs = 10 * 60e3) {
  const nowMs = Date.now(), arr = (hits.get(key) || []).filter(x => nowMs - x < windowMs);
  arr.push(nowMs); hits.set(key, arr);
  return arr.length > max;
}

/* Rotas de conta: /api/auth, /api/me, /api/dev (só com DEV_LOGIN=1) e /api/config. */
export function routes(app: Express, { prisma, wrap, auth, prod, devLogin, testLogin, feedbackOn, isAdmin }: Contexto) {
  const meJson = (u: User) => ({ id: u.id, email: u.email, name: u.name, seenWelcome: u.seenWelcome, admin: isAdmin(u) });

  /* ===== Conta ===== */
  app.post('/api/auth/request', wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 80);
    if (!validEmail(email)) return res.status(400).json({ err: { email: 'Informe um e-mail válido' } });
    if (rateLimited('link:' + email) || rateLimited('ip:' + req.ip, 20)) return res.status(429).json({ err: { email: 'Muitos pedidos. Espere alguns minutos e tente de novo.' } });
    const r = await sendLoginLink(prisma, { email, name, next: req.body.next });
    if (!r.sent && mailMode() !== 'console') return res.status(502).json({ err: { email: 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.' } });
    /* Em desenvolvimento, sem serviço de e-mail, o link volta na resposta para facilitar os testes. */
    res.json({ ok: true, sent: r.sent, devLink: !prod && !r.sent ? r.link : undefined });
  }));

  app.get('/api/auth/verify', wrap(async (req, res) => {
    const r = await verifyLink(prisma, String(req.query.token || ''));
    if (!r) return res.redirect('/entrar?expirado=1');
    await startSession(prisma, res, r.user.id);
    res.redirect(r.next);
  }));

  if (testLogin) {
    console.warn('TEST_LOGIN ativo: entrar não exige confirmação por e-mail. Use só em testes, sem dados sensíveis.');
    app.post('/api/auth/test-login', wrap(async (req, res) => {
      const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 80), err: Record<string, string> = {};
      if (!name) err.name = 'Diga como a equipe conhece você';
      if (!validEmail(email)) err.email = 'Informe um e-mail válido';
      if (Object.keys(err).length) return res.status(400).json({ err });
      if (rateLimited('test:' + req.ip, 30)) return res.status(429).json({ err: { email: 'Muitas tentativas. Espere alguns minutos.' } });
      const existing = await prisma.user.findUnique({ where: { email } });
      /* Quem foi adicionado por e-mail recebeu um nome provisório; o nome digitado agora vale. */
      const u = existing ? await prisma.user.update({ where: { id: existing.id }, data: { name } }) : await prisma.user.create({ data: { email, name } });
      await startSession(prisma, res, u.id);
      res.json(meJson(u));
    }));
  }

  app.post('/api/auth/logout', wrap(async (req, res) => { await endSession(prisma, req, res); res.json({ ok: true }); }));

  app.get('/api/me', (req, res) => (req.user ? res.json(meJson(req.user)) : res.status(401).json({ err: { _: 'Sem sessão.' } })));

  app.patch('/api/me', auth, wrap(async (req: AuthedRequest, res) => {
    const data: Prisma.UserUpdateInput = {};
    if (typeof req.body.name === 'string') {
      const n = req.body.name.trim().slice(0, 80);
      if (!n) return res.status(400).json({ err: { person: 'Informe seu nome' } });
      data.name = n;
    }
    if (req.body.seenWelcome === true) data.seenWelcome = true;
    const u = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(meJson(u));
  }));

  /* ===== Só para testes locais: entrar como qualquer pessoa sem e-mail (DEV_LOGIN=1). ===== */
  if (devLogin) {
    console.warn('DEV_LOGIN ativo: qualquer pessoa pode entrar como outra. Não use em produção com dados reais.');
    app.get('/api/dev/users', wrap(async (_req, res) => res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }))));
    app.post('/api/dev/login', wrap(async (req, res) => {
      const u = await prisma.user.findUnique({ where: { id: String(req.body.id || '') } });
      if (!u) return res.status(404).json({ err: { _: 'Pessoa não encontrada.' } });
      await endSession(prisma, req, res);
      await startSession(prisma, res, u.id);
      res.json(meJson(u));
    }));
  }

  app.get('/api/config', (_req, res) => res.json({ devLogin, testLogin, feedback: feedbackOn, appUrl: appUrl(), mail: mailMode() }));
}
