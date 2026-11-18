/* Leitura e gravação de um projeto inteiro no formato do protótipo.
   load() monta o objeto `p`; save() compara com a cópia de antes e grava só o que mudou. */
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { clone } from '@mip/domain';
import type { Projeto, Pid, Aid, Sobre, Perfil, Fase, PassoPreparo, StatusMembro, StatusAtivo, TipoCriacao, ValorConfirmacao, Resposta, EntradaResposta, Proposta, CriacaoCongelada, MembroCongelado, Confirmacao, Comentario, EntradaHistorico, Memorial } from '@mip/domain';

/* Este é o único lugar onde o que vem do banco vira objeto do domínio (e volta).
   Os campos Json do Prisma (Project.sobre, Member.perfil, Answer.draft, Answer.sent, Proposal.data, Version.snap,
   Version.members e Confirmation.assets) chegam como JsonValue, sem forma; os textos de estado (phase, setupStep, status, type, value)
   chegam como string. As conversões abaixo (`as`) não validam nada: confiam que o conteúdo é o que save()
   (ou o seed) gravou. */

/** Resposta de uma pessoa a uma criação como o servidor guarda: rascunho, envio (ou null) e tela em que parou. */
export interface RespostaGravada extends EntradaResposta { draft: Resposta; sent: Resposta | null; step: number }

/** O projeto como load() monta: o formato do domínio, com os campos que o servidor sempre preenche. */
export interface ProjetoCompleto extends Projeto {
  context: string;
  sobre: Sobre;
  createdAt: number;
  people: Record<Pid, { name: string; email: string }>;
  link: { active: boolean; code: string };
  answers: Record<Pid, Record<Aid, RespostaGravada>>;
  comments: Comentario[];
  history: EntradaHistorico[];
  memorials: Memorial[];
}

/* Data do banco em milissegundos; sem data, null. */
const ms = ((d: Date | null) => (d ? new Date(d).getTime() : null)) as { (d: Date): number; (d: Date | null): number | null };

/* Carrega o projeto para quem participa dele (qualquer linha em Member, inclusive pendente e fora das respostas).
   Para quem não participa, devolve null, igual a projeto inexistente: nenhum dado do projeto sai do banco.
   A checagem fica aqui, e não em cada rota, para que uma rota nova não consiga esquecê-la. */
export async function load(tx: Prisma.TransactionClient, projectId: string, me: Pid): Promise<ProjetoCompleto | null> {
  const r = await tx.project.findFirst({
    relationLoadStrategy: 'join',
    where: { id: projectId, members: { some: { userId: me } } },
    include: {
      members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      assets: { orderBy: { createdAt: 'asc' } },
      answers: true,
      proposals: true,
      versions: { include: { confirmations: true }, orderBy: { n: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      history: { orderBy: { createdAt: 'desc' }, take: 200 },
      memorials: { orderBy: { createdAt: 'desc' } }
    }
  });
  if (!r) return null;
  const people: Record<Pid, { name: string; email: string }> = {};
  r.members.forEach(m => { people[m.userId] = { name: m.user.name, email: m.user.email }; });
  const answers: Record<Pid, Record<Aid, RespostaGravada>> = {};
  r.answers.forEach(a => {
    answers[a.userId] = answers[a.userId] || {};
    answers[a.userId][a.assetId] = { draft: (a.draft || {}) as Resposta, sent: a.sent ? ({ ...(a.sent as Resposta), at: ms(a.sentAt) } as Resposta) : null, step: a.step };
  });
  const proposal: Record<Aid, Proposta> = {};
  r.proposals.forEach(x => { proposal[x.assetId] = x.data as unknown as Proposta; });
  return {
    id: r.id, name: r.name, context: r.context, org: r.orgId, phase: r.phase as Fase, setupStep: r.setupStep as PassoPreparo, sobre: (r.sobre || {}) as Sobre,
    createdAt: ms(r.createdAt),
    people,
    members: r.members.map(m => ({ pid: m.userId, status: m.status as StatusMembro, elig: m.elig, by: m.removedBy || undefined, at: ms(m.removedAt) || undefined, perfil: (m.perfil || {}) as Perfil })),
    link: { active: r.inviteActive, code: r.inviteCode },
    assets: r.assets.map(a => ({ id: a.id, name: a.name, type: a.type as TipoCriacao, cat: a.cat, desc: a.desc, link: a.link, st: a.status as StatusAtivo, by: a.suggestedBy || undefined, reason: a.reason || undefined })),
    answers,
    proposal,
    comments: r.comments.map(c => ({ id: c.id, aid: c.assetId, pid: c.userId, text: c.text, at: ms(c.createdAt) })),
    versions: r.versions.map(v => {
      const conf: Record<Pid, Confirmacao> = {};
      v.confirmations.forEach(c => { conf[c.userId] = { v: c.value as ValorConfirmacao, comment: c.comment, assets: c.assets as Aid[], at: ms(c.createdAt) }; });
      return { id: v.id, n: v.n, at: ms(v.createdAt), snap: v.snap as unknown as Record<Aid, CriacaoCongelada>, ...(v.members ? { membros: v.members as unknown as MembroCongelado[] } : {}), conf };
    }),
    history: r.history.map(h => ({ id: h.id, at: ms(h.createdAt), who: h.userId || 'sistema', text: h.text })),
    memorials: r.memorials.map(m => ({ id: m.id, at: ms(m.createdAt), body: m.body, hash: m.hash }))
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function save(tx: Prisma.TransactionClient, before: ProjetoCompleto, p: ProjetoCompleto) {
  const pid = p.id;
  if (!same([before.name, before.context, before.phase, before.setupStep, before.link.active, before.sobre], [p.name, p.context, p.phase, p.setupStep, p.link.active, p.sobre])) {
    await tx.project.update({ where: { id: pid }, data: { name: p.name, context: p.context, phase: p.phase, setupStep: p.setupStep, inviteActive: p.link.active, sobre: p.sobre || {} } });
  }
  /* Integrantes (novos integrantes entram por rotas próprias; aqui só mudam de estado). */
  for (const m of p.members) {
    const b = before.members.find(x => x.pid === m.pid);
    if (b && !same(b, m)) await tx.member.update({ where: { projectId_userId: { projectId: pid, userId: m.pid } }, data: { status: m.status, elig: m.elig, removedBy: m.by || null, removedAt: m.at ? new Date(m.at) : null, perfil: (m.perfil || {}) as Prisma.InputJsonObject } });
  }
  /* Criações */
  for (const a of p.assets) {
    const b = before.assets.find(x => x.id === a.id), data = { name: a.name, type: a.type, cat: a.cat, desc: a.desc || '', link: a.link || '', status: a.st, suggestedBy: a.by || null, reason: a.reason || null };
    if (!b) await tx.asset.create({ data: { id: a.id, projectId: pid, ...data } });
    else if (!same(b, a)) await tx.asset.update({ where: { id: a.id }, data });
  }
  const gone = before.assets.filter(b => !p.assets.find(a => a.id === b.id)).map(b => b.id);
  if (gone.length) await tx.asset.deleteMany({ where: { id: { in: gone } } });
  /* Respostas */
  for (const [uid, byAsset] of Object.entries(p.answers)) {
    for (const [aid, an] of Object.entries(byAsset)) {
      if (gone.includes(aid)) continue;
      const b = before.answers[uid]?.[aid];
      if (b && same(b, an)) continue;
      const sent = an.sent ? (({ at, ...rest }) => rest)(an.sent) : null;
      const data = { draft: (an.draft || {}) as Prisma.InputJsonObject, sent: sent ?? Prisma.DbNull, sentAt: an.sent ? new Date(an.sent.at as number) : null, step: an.step || 0 };
      await tx.answer.upsert({
        where: { assetId_userId: { assetId: aid, userId: uid } },
        create: { projectId: pid, assetId: aid, userId: uid, ...data },
        update: data
      });
    }
  }
  /* Propostas */
  for (const [aid, pr] of Object.entries(p.proposal)) {
    if (gone.includes(aid) || same(before.proposal[aid], pr)) continue;
    await tx.proposal.upsert({ where: { assetId: aid }, create: { projectId: pid, assetId: aid, data: pr as unknown as Prisma.InputJsonObject }, update: { data: pr as unknown as Prisma.InputJsonObject } });
  }
  /* Versões e confirmações */
  for (const v of p.versions) {
    const b = before.versions.find(x => x.n === v.n);
    let vid = b?.id;
    if (!b) { const created = await tx.version.create({ data: { projectId: pid, n: v.n, snap: v.snap as unknown as Prisma.InputJsonObject, members: v.membros ? (v.membros as unknown as Prisma.InputJsonArray) : Prisma.DbNull, createdAt: new Date(v.at as number) } }); vid = created.id; v.id = vid; }
    for (const [uid, c] of Object.entries(v.conf)) {
      if (b?.conf[uid]) continue;
      await tx.confirmation.create({ data: { versionId: vid as string, userId: uid, value: c.v, comment: c.comment || '', assets: c.assets || [], createdAt: new Date(c.at) } });
    }
  }
  /* Comentários, histórico e registros: só entram itens novos. */
  for (const c of p.comments.filter(c => !c.id)) await tx.comment.create({ data: { projectId: pid, assetId: c.aid, userId: c.pid, text: c.text, createdAt: new Date(c.at) } });
  for (const h of p.history.filter(h => !h.id).reverse()) await tx.historyEntry.create({ data: { projectId: pid, userId: h.who === 'sistema' ? null : h.who, text: h.text, createdAt: new Date(h.at) } });
  for (const m of p.memorials.filter(m => !m.id)) await tx.memorial.create({ data: { projectId: pid, body: m.body, hash: m.hash, createdAt: new Date(m.at) } });
}

/* Trava o projeto durante a ação para que duas pessoas não gravem por cima uma da outra.
   `p` chega null se o projeto não existe ou se `me` não participa dele (veja load). */
export async function withProject<T>(prisma: PrismaClient, projectId: string, me: Pid, fn: (p: ProjetoCompleto | null, tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
    const p = await load(tx, projectId, me);
    if (!p) return fn(null, tx);
    const before = clone(p);
    const out = await fn(p, tx);
    await save(tx, before, p);
    return out;
  }, { timeout: 15000 });
}
