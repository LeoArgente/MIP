/* Entrada por link no e-mail (sem senha) e sessões em cookie httpOnly. */
import { randomBytes, createHash } from 'node:crypto';
import { sendMail } from './mail.js';

export const COOKIE = 'mip_session';
const SESSION_DAYS = 30, LINK_MINUTES = 30;
const hash = t => createHash('sha256').update(t).digest('hex');
const token = () => randomBytes(32).toString('base64url');
/* Endereço do site, para links em e-mails. Na Vercel, sem APP_URL, usa o domínio de produção do projeto. */
export const appUrl = () => (process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:5173')).replace(/\/$/, '');
export const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');
export const nameFromEmail = e => { const s = e.split('@')[0].replace(/[._-]+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim() || 'Pessoa'; return s.charAt(0).toUpperCase() + s.slice(1); };
/* Só aceita voltar para caminhos internos, para o link não virar redirecionamento para outro site. */
const safeNext = n => (typeof n === 'string' && /^\/(?!\/)[\w\-/?=&%.]*$/.test(n) ? n : '/');

export async function createLoginLink(prisma, { email, name, next }) {
  const t = token();
  await prisma.loginToken.create({ data: { email, name: name || null, next: safeNext(next), tokenHash: hash(t), expiresAt: new Date(Date.now() + LINK_MINUTES * 60e3) } });
  return `${appUrl()}/api/auth/verify?token=${t}`;
}

export async function sendLoginLink(prisma, { email, name, next, subject, text, linkLabel }) {
  const link = await createLoginLink(prisma, { email, name, next });
  const r = await sendMail({
    to: email,
    subject: subject || 'Seu link de acesso à MIP',
    text: text || `Use o botão abaixo para entrar na MIP. O link vale por ${LINK_MINUTES} minutos e só funciona uma vez.`,
    link, linkLabel: linkLabel || 'Entrar na MIP'
  });
  return { link, sent: r.sent };
}

export async function verifyLink(prisma, t) {
  const row = await prisma.loginToken.findUnique({ where: { tokenHash: hash(t || '') } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.loginToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const user = await prisma.user.upsert({ where: { email: row.email }, create: { email: row.email, name: row.name || nameFromEmail(row.email) }, update: {} });
  return { user, next: row.next || '/' };
}

export async function startSession(prisma, res, userId) {
  const t = token();
  await prisma.session.create({ data: { userId, tokenHash: hash(t), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5) } });
  res.cookie(COOKIE, t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: SESSION_DAYS * 864e5, path: '/' });
}

export async function endSession(prisma, req, res) {
  const t = req.cookies?.[COOKIE];
  if (t) await prisma.session.deleteMany({ where: { tokenHash: hash(t) } });
  res.clearCookie(COOKIE, { path: '/' });
}

/* Middleware: põe req.user quando a sessão é válida.
   Se o banco não responde, devolve 503 em vez de derrubar o servidor. */
export const sessionUser = prisma => async (req, res, next) => {
  const t = req.cookies?.[COOKIE];
  if (t) {
    try {
      const s = await prisma.session.findUnique({ where: { tokenHash: hash(t) }, include: { user: true } });
      if (s && s.expiresAt > new Date()) req.user = s.user;
    } catch (e) {
      console.error('Sessão: banco indisponível.', e.message);
      return res.status(503).json({ err: { _: 'Não foi possível falar com o banco de dados. Tente de novo em instantes.' } });
    }
  }
  next();
};

/* Limite simples por chave (ex.: e-mail) para pedidos de link. */
const hits = new Map();
export function rateLimited(key, max = 5, windowMs = 10 * 60e3) {
  const nowMs = Date.now(), arr = (hits.get(key) || []).filter(x => nowMs - x < windowMs);
  arr.push(nowMs); hits.set(key, arr);
  return arr.length > max;
}
