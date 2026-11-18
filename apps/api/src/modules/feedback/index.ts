/* Feedback: botão "Feedback", nota de satisfação e a leitura em /admin (fase de testes). */
import { rateLimited } from '../../auth.js';
import { mesmaPessoa } from '../../http.js';
import type { Express } from 'express';
import type { Prisma } from '@prisma/client';
import type { Contexto, AuthedRequest } from '../../server.js';
import type { Acoes } from '../shared.js';

export const ACTIONS: Acoes = {};

export function routes(app: Express, { prisma, wrap, auth, feedbackOn, isAdmin }: Contexto) {
  /* ===== Feedback ===== */
  const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  /* Rota pública, mas grava req.user (autor do feedback, nota de satisfação): passa pela mesma checagem de `auth`. */
  app.post('/api/feedback', mesmaPessoa, wrap(async (req, res) => {
    if (!feedbackOn) return res.status(404).json({ err: { _: 'Rota não encontrada.' } });
    if (rateLimited('fb:' + (req.user?.id || req.ip), 20)) return res.status(429).json({ err: { _: 'Muitos envios seguidos. Tente de novo daqui a alguns minutos.' } });
    const b: Record<string, unknown> = req.body || {}, kind = b.kind === 'satisfacao' ? 'satisfacao' : 'texto';
    const data: Prisma.FeedbackUncheckedCreateInput = { kind, screen: cut(b.screen, 120) || 'Tela desconhecida', path: cut(b.path, 200) || '/', device: b.device === 'celular' ? 'celular' : 'computador', userId: req.user?.id || null, text: cut(b.text, 2000) || null, rating: null, projectId: null };
    if (kind === 'satisfacao') {
      if (!req.user) return res.status(401).json({ err: { _: 'Entre na sua conta para continuar.' } });
      const r = Number(b.rating);
      if (!Number.isInteger(r) || r < 1 || r > 5) return res.status(400).json({ err: { rating: 'Escolha uma opção.' } });
      data.rating = r;
    }
    /* O projeto só é guardado se a pessoa participa dele. */
    if (typeof b.projectId === 'string' && req.user && await prisma.member.findFirst({ where: { projectId: b.projectId, userId: req.user.id }, select: { id: true } })) data.projectId = b.projectId;
    if (kind === 'satisfacao' && !data.projectId) return res.status(400).json({ err: { _: 'Projeto não encontrado.' } });
    /* Prints: até 3 imagens PNG, JPEG ou WebP de até 1 MB cada. */
    const imgs = kind === 'texto' && Array.isArray(b.images) ? b.images.slice(0, 3) : [];
    const images = [];
    for (const im of imgs) {
      const mime = ['image/png', 'image/jpeg', 'image/webp'].includes(im?.mime) ? im.mime : null, buf = mime && typeof im.data === 'string' ? Buffer.from(im.data, 'base64') : null;
      if (!buf || !buf.length || buf.length > 1e6) return res.status(400).json({ err: { images: 'Não foi possível anexar uma das imagens. Tente outra.' } });
      images.push({ mime, data: buf });
    }
    if (kind === 'texto' && !data.text && !images.length) return res.status(400).json({ err: { text: 'Escreva o que aconteceu ou anexe um print.' } });
    if (images.length) data.images = { create: images };
    /* Uma nota por pessoa e projeto: enviar de novo troca a anterior. */
    /* Garantido: no ramo satisfacao, sem sessão já respondeu 401 acima (rota pública: req.user é opcional). */
    if (kind === 'satisfacao') await prisma.feedback.deleteMany({ where: { kind, userId: req.user!.id, projectId: data.projectId } });
    await prisma.feedback.create({ data });
    res.json({ ok: true });
  }));
  app.get('/api/feedback/satisfaction/:projectId', auth, wrap(async (req: AuthedRequest, res) => {
    const f = await prisma.feedback.findFirst({ where: { kind: 'satisfacao', userId: req.user.id, projectId: req.params.projectId }, select: { rating: true } });
    res.json({ rating: f?.rating || null });
  }));
  app.get('/api/admin/feedback', auth, wrap(async (req: AuthedRequest, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ err: { _: 'Só a equipe da MIP vê esta página.' } });
    const rows = await prisma.feedback.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { user: { select: { name: true, email: true } }, images: { select: { id: true } } } });
    /* Garantido: filter(Boolean) tira os null; o TS não estreita o tipo por Boolean. */
    const ids = [...new Set(rows.map(r => r.projectId).filter(Boolean) as string[])];
    const names = Object.fromEntries((await prisma.project.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map(p => [p.id, p.name]));
    res.json(rows.map(r => ({ id: r.id, kind: r.kind, rating: r.rating, text: r.text, screen: r.screen, path: r.path, device: r.device, createdAt: r.createdAt, user: r.user, images: r.images.map(i => i.id), project: r.projectId ? { id: r.projectId, name: names[r.projectId] || null } : null })));
  }));
  app.get('/api/admin/feedback/image/:id', auth, wrap(async (req: AuthedRequest, res) => {
    if (!isAdmin(req.user)) return res.status(403).json({ err: { _: 'Só a equipe da MIP vê esta página.' } });
    const im = await prisma.feedbackImage.findUnique({ where: { id: req.params.id } });
    if (!im) return res.status(404).json({ err: { _: 'Imagem não encontrada.' } });
    res.set({ 'Content-Type': im.mime, 'Cache-Control': 'private, max-age=86400' }).send(Buffer.from(im.data));
  }));
}
