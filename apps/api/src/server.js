/* API da MIP: Express + Prisma (PostgreSQL). Em produção também serve o site (apps/web/dist). */
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { taskFor, mem, nm, stripHash, phaseName } from '@mip/domain';
import { load, withProject } from './store.js';
import { apply, ActionError, sha256 } from './actions.js';
import { viewFor } from './view.js';
import { sendMail, mailMode } from './mail.js';
import { sendLoginLink, verifyLink, startSession, endSession, sessionUser, rateLimited, validEmail, nameFromEmail, appUrl } from './auth.js';

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
/* O feedback pode levar até 3 prints (já reduzidos no navegador); o resto da API aceita pedidos pequenos. */
const jsonSmall = express.json({ limit: '200kb' }), jsonFeedback = express.json({ limit: '6mb' });
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
const meJson = u => ({ id: u.id, email: u.email, name: u.name, seenWelcome: u.seenWelcome, admin: isAdmin(u) });
const newCode = () => randomBytes(6).toString('base64url');

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
    const email = String(req.body.email || '').trim().toLowerCase(), name = String(req.body.name || '').trim().slice(0, 80), err = {};
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

app.patch('/api/me', auth, wrap(async (req, res) => {
  const data = {};
  if (typeof req.body.name === 'string') {
    const n = req.body.name.trim().slice(0, 80);
    if (!n) return res.status(400).json({ err: { person: 'Informe seu nome' } });
    data.name = n;
  }
  if (req.body.seenWelcome === true) data.seenWelcome = true;
  const u = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json(meJson(u));
}));

/* ===== Projetos ===== */
app.get('/api/projects', auth, wrap(async (req, res) => {
  const ms = await prisma.member.findMany({ where: { userId: req.user.id }, select: { projectId: true }, orderBy: { createdAt: 'desc' } });
  const out = [];
  /* Carrega os projetos em paralelo, não um depois do outro. */
  const all = await Promise.all(ms.map(({ projectId }) => load(prisma, projectId)));
  for (const p of all) {
    if (!p) continue;
    const v = viewFor(p, req.user.id), qpos = Object.fromEntries(Object.entries(p.answers[req.user.id] || {}).map(([aid, an]) => [aid, an.step]));
    const lastAt = Math.max(p.createdAt || 0, ...p.history.map(h => h.at));
    out.push({ id: p.id, name: p.name, context: p.context, phase: p.phase, phaseName: phaseName(p), org: p.org === req.user.id, orgName: p.people[p.org]?.name, people: p.members.filter(m => m.status === 'ativo').length, assets: p.assets.filter(a => a.st === 'ok').length, lastAt, task: taskFor(v, req.user.id, qpos) });
  }
  out.sort((a, b) => b.lastAt - a.lastAt);
  res.json(out);
}));

app.post('/api/projects', auth, wrap(async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 120), context = String(req.body.context || '').trim().slice(0, 300), person = String(req.body.person || '').trim().slice(0, 80);
  const err = {};
  if (!name) err.pn = 'Informe o nome do projeto';
  if (Object.keys(err).length) return res.status(400).json({ err });
  const pr = await prisma.$transaction(async tx => {
    if (person) await tx.user.update({ where: { id: req.user.id }, data: { name: person } });
    const p = await tx.project.create({ data: { name, context, orgId: req.user.id, inviteCode: newCode(), members: { create: { userId: req.user.id } } } });
    await tx.historyEntry.create({ data: { projectId: p.id, userId: req.user.id, text: 'criou o projeto ' + name } });
    return p;
  });
  res.json({ id: pr.id });
}));

const projectFor = async (req, res) => {
  const p = await load(prisma, req.params.id);
  if (!p || !mem(p, req.user.id)) { res.status(404).json({ err: { _: 'Projeto não encontrado ou sem acesso.' } }); return null; }
  return p;
};

app.get('/api/projects/:id', auth, wrap(async (req, res) => {
  const p = await projectFor(req, res); if (!p) return;
  res.json(viewFor(p, req.user.id));
}));

app.post('/api/projects/:id/actions/:type', auth, wrap(async (req, res) => {
  const out = await withProject(prisma, req.params.id, async p => {
    if (!p) throw new ActionError('Projeto não encontrado.', 404);
    const result = apply(p, req.user.id, req.params.type, req.body || {});
    return { result, p };
  });
  if (out.result.quiet) return res.json({ result: out.result });
  const fresh = await load(prisma, req.params.id);
  res.json({ result: out.result, project: viewFor(fresh, req.user.id) });
}));

/* Adicionar pessoa por e-mail: cria a conta se preciso e manda o link de acesso ao projeto. */
app.post('/api/projects/:id/invite', auth, wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!validEmail(email)) return res.status(400).json({ err: { inv: 'Informe um e-mail válido' } });
  const added = await withProject(prisma, req.params.id, async (p, tx) => {
    if (!p) throw new ActionError('Projeto não encontrado.', 404);
    if (p.org !== req.user.id) throw new ActionError('Só quem organiza pode adicionar pessoas.', 403);
    const u = await tx.user.upsert({ where: { email }, create: { email, name: nameFromEmail(email) }, update: {} });
    if (mem(p, u.id)) throw new ActionError({ inv: 'Esta pessoa já faz parte do projeto' });
    await tx.member.create({ data: { projectId: p.id, userId: u.id, elig: p.phase === 'coleta' } });
    p.history.unshift({ at: Date.now(), who: req.user.id, text: 'adicionou ' + email + ' ao projeto' });
    return { user: u, project: p };
  });
  const { sent } = await sendLoginLink(prisma, {
    email, next: '/p/' + req.params.id,
    subject: `${req.user.name} adicionou você ao projeto ${added.project.name} na MIP`,
    text: `${req.user.name} adicionou você ao projeto "${added.project.name}" na MIP. Cada pessoa responde em particular sobre o que a equipe criou, e ninguém vê suas respostas até o fim.`,
    linkLabel: 'Abrir o projeto'
  });
  const fresh = await load(prisma, req.params.id);
  res.json({ result: { toast: added.user.name + ' entrou no projeto.' + (sent ? ' Enviamos um e-mail com o link de acesso.' : ' O e-mail não foi enviado; compartilhe o link de convite.') }, project: viewFor(fresh, req.user.id) });
}));

/* Remover alguém do projeto (só quem organiza, enquanto as respostas estão abertas).
   Sem `confirm`, devolve o que será apagado para a tela pedir confirmação. */
app.post('/api/projects/:id/remove', auth, wrap(async (req, res) => {
  const pid = String(req.body.pid || '');
  const out = await withProject(prisma, req.params.id, async (p, tx) => {
    if (!p) throw new ActionError('Projeto não encontrado.', 404);
    if (p.org !== req.user.id) throw new ActionError('Só quem organiza pode remover pessoas.', 403);
    if (pid === p.org) throw new ActionError({ np: 'Quem organiza não pode ser removido do projeto.' });
    if (!mem(p, pid)) throw new ActionError({ np: 'Esta pessoa não está no projeto.' });
    if (p.phase !== 'coleta') throw new ActionError({ np: 'Depois que as respostas foram encerradas, não dá para remover. Use “Tirar das respostas”.' });
    const name = nm(p, pid), sent = Object.values(p.answers[pid] || {}).filter(a => a.sent).length;
    if (!req.body.confirm) return { confirmRemove: { pid, name, sent } };
    await tx.answer.deleteMany({ where: { projectId: p.id, userId: pid } });
    await tx.comment.deleteMany({ where: { projectId: p.id, userId: pid } });
    await tx.member.delete({ where: { projectId_userId: { projectId: p.id, userId: pid } } });
    delete p.answers[pid];
    p.members = p.members.filter(m => m.pid !== pid);
    p.comments = p.comments.filter(c => c.pid !== pid);
    p.history.unshift({ at: Date.now(), who: req.user.id, text: 'removeu ' + name + ' do projeto' + (sent ? ' e apagou as respostas' : '') });
    return { toast: name + ' foi removido do projeto.' };
  });
  if (out.confirmRemove) return res.json({ result: out });
  const fresh = await load(prisma, req.params.id);
  res.json({ result: out, project: viewFor(fresh, req.user.id) });
}));

app.post('/api/projects/:id/remind', auth, wrap(async (req, res) => {
  const p = await projectFor(req, res); if (!p) return;
  if (p.org !== req.user.id) return res.status(403).json({ err: { _: 'Só quem organiza pode lembrar a equipe.' } });
  const target = mem(p, req.body.pid);
  if (!target) return res.status(404).json({ err: { _: 'Pessoa não encontrada.' } });
  const { sent } = await sendLoginLink(prisma, {
    email: p.people[target.pid].email, next: '/p/' + p.id,
    subject: `Faltam suas respostas no projeto ${p.name}`,
    text: `${req.user.name} lembrou você de responder sobre as criações do projeto "${p.name}". Ninguém vê suas respostas até o fim das respostas.`,
    linkLabel: 'Responder agora'
  });
  res.json({ result: sent ? { toast: 'Lembrete enviado por e-mail para ' + nm(p, target.pid) + '. O e-mail traz só o link do projeto.' } : { toast: 'Não foi possível enviar o e-mail para ' + nm(p, target.pid) + '. Use a mensagem para o grupo.' } });
}));

/* ===== Convite por link ===== */
app.get('/api/invite/:code', wrap(async (req, res) => {
  const pr = await prisma.project.findUnique({ where: { inviteCode: req.params.code }, include: { org: true } });
  if (!pr) return res.status(404).json({ err: { _: 'Convite não encontrado.' } });
  res.json({ name: pr.name, org: pr.org.name, active: pr.inviteActive });
}));

app.post('/api/invite/:code/join', auth, wrap(async (req, res) => {
  const pr = await prisma.project.findUnique({ where: { inviteCode: req.params.code } });
  if (!pr) return res.status(404).json({ err: { _: 'Convite não encontrado.' } });
  if (!pr.inviteActive) return res.status(400).json({ err: { link: 'Este convite não está mais ativo' } });
  const out = await withProject(prisma, pr.id, async (p, tx) => {
    if (mem(p, req.user.id)) return { already: true };
    await tx.member.create({ data: { projectId: p.id, userId: req.user.id, elig: p.phase === 'coleta' } });
    p.history.unshift({ at: Date.now(), who: req.user.id, text: 'entrou pelo link de convite' });
    return { already: false, elig: p.phase === 'coleta' };
  });
  res.json({ id: pr.id, result: { notice: out.already ? 'Você já participa deste projeto.' : out.elig ? 'Você entrou no projeto. Veja sua tarefa atual.' : 'Você entrou no projeto, mas as respostas já foram encerradas e você não responde desta vez.' } });
}));

/* ===== Verificar registro do acordo ===== */
app.post('/api/verify', wrap(async (req, res) => {
  const text = String(req.body.text || '');
  if (!text.trim()) return res.json({ ok: false, msg: 'Cole o texto do registro para verificar.' });
  const m = await prisma.memorial.findFirst({ where: { hash: sha256(stripHash(text)) } });
  res.json(m ? { ok: true, msg: 'Este texto corresponde ao registro gerado em ' + m.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).replace(', ', ' às ') } : { ok: false, msg: 'Este texto não corresponde a nenhum registro gerado pela MIP' });
}));

/* ===== Só para testes locais: entrar como qualquer pessoa sem e-mail (DEV_LOGIN=1). ===== */
if (devLogin) {
  console.warn('DEV_LOGIN ativo: qualquer pessoa pode entrar como outra. Não use em produção com dados reais.');
  app.get('/api/dev/users', wrap(async (_req, res) => res.json(await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { createdAt: 'asc' } }))));
  app.post('/api/dev/login', wrap(async (req, res) => {
    const u = await prisma.user.findUnique({ where: { id: String(req.body.id || '') } });
    if (!u) return res.status(404).json({ err: { _: 'Pessoa não encontrada.' } });
    await endSession(prisma, req, res);
    await startSession(prisma, res, u.id);
    res.json(meJson(u));
  }));
}
/* ===== Feedback ===== */
const cut = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
app.post('/api/feedback', wrap(async (req, res) => {
  if (!feedbackOn) return res.status(404).json({ err: { _: 'Rota não encontrada.' } });
  if (rateLimited('fb:' + (req.user?.id || req.ip), 20)) return res.status(429).json({ err: { _: 'Muitos envios seguidos. Tente de novo daqui a alguns minutos.' } });
  const b = req.body || {}, kind = b.kind === 'satisfacao' ? 'satisfacao' : 'texto';
  const data = { kind, screen: cut(b.screen, 120) || 'Tela desconhecida', path: cut(b.path, 200) || '/', device: b.device === 'celular' ? 'celular' : 'computador', userId: req.user?.id || null, text: cut(b.text, 2000) || null, rating: null, projectId: null };
  if (kind === 'satisfacao') {
    if (!req.user) return res.status(401).json({ err: { _: 'Entre na sua conta para continuar.' } });
    const r = Number(b.rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ err: { rating: 'Escolha uma opção.' } });
    data.rating = r;
  }
  /* O projeto só é guardado se a pessoa participa dele. */
  if (typeof b.projectId === 'string' && req.user && await prisma.member.findFirst({ where: { projectId: b.projectId, userId: req.user.id }, select: { id: true } })) data.projectId = b.projectId;
  if (kind === 'satisfacao' && !data.projectId) return res.status(400).json({ err: { _: 'Projeto não encontrado.' } });
  /* Prints: até 3 imagens PNG, JPEG ou WebP de até 1,5 MB cada. */
  const imgs = kind === 'texto' && Array.isArray(b.images) ? b.images.slice(0, 3) : [];
  const images = [];
  for (const im of imgs) {
    const mime = ['image/png', 'image/jpeg', 'image/webp'].includes(im?.mime) ? im.mime : null, buf = mime && typeof im.data === 'string' ? Buffer.from(im.data, 'base64') : null;
    if (!buf || !buf.length || buf.length > 1.5e6) return res.status(400).json({ err: { images: 'Não foi possível anexar uma das imagens. Tente outra.' } });
    images.push({ mime, data: buf });
  }
  if (kind === 'texto' && !data.text && !images.length) return res.status(400).json({ err: { text: 'Escreva o que aconteceu ou anexe um print.' } });
  if (images.length) data.images = { create: images };
  /* Uma nota por pessoa e projeto: enviar de novo troca a anterior. */
  if (kind === 'satisfacao') await prisma.feedback.deleteMany({ where: { kind, userId: req.user.id, projectId: data.projectId } });
  await prisma.feedback.create({ data });
  res.json({ ok: true });
}));
app.get('/api/feedback/satisfaction/:projectId', auth, wrap(async (req, res) => {
  const f = await prisma.feedback.findFirst({ where: { kind: 'satisfacao', userId: req.user.id, projectId: req.params.projectId }, select: { rating: true } });
  res.json({ rating: f?.rating || null });
}));
app.get('/api/admin/feedback', auth, wrap(async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ err: { _: 'Só a equipe da MIP vê esta página.' } });
  const rows = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { user: { select: { name: true, email: true } }, images: { select: { id: true } } } });
  const ids = [...new Set(rows.map(r => r.projectId).filter(Boolean))];
  const names = Object.fromEntries((await prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(p => [p.id, p.name]));
  res.json(rows.map(r => ({ id: r.id, kind: r.kind, rating: r.rating, text: r.text, screen: r.screen, path: r.path, device: r.device, createdAt: r.createdAt, user: r.user, images: r.images.map(i => i.id), project: r.projectId ? { id: r.projectId, name: names[r.projectId] || null } : null })));
}));
app.get('/api/admin/feedback/image/:id', auth, wrap(async (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ err: { _: 'Só a equipe da MIP vê esta página.' } });
  const im = await prisma.feedbackImage.findUnique({ where: { id: req.params.id } });
  if (!im) return res.status(404).json({ err: { _: 'Imagem não encontrada.' } });
  res.set({ 'Content-Type': im.mime, 'Cache-Control': 'private, max-age=86400' }).send(Buffer.from(im.data));
}));

app.get('/api/config', (_req, res) => res.json({ devLogin, testLogin, feedback: feedbackOn, appUrl: appUrl(), mail: mailMode() }));

/* ===== Site (build do apps/web) ===== */
const web = join(dirname(fileURLToPath(import.meta.url)), '../../web/dist');
if (existsSync(web)) {
  app.use(express.static(web, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(join(web, 'index.html')));
}
app.use('/api', (_req, res) => res.status(404).json({ err: { _: 'Rota não encontrada.' } }));

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`MIP API em http://localhost:${port}`));

export { sendMail };
