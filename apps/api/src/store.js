/* Leitura e gravação de um projeto inteiro no formato do protótipo.
   load() monta o objeto `p`; save() compara com a cópia de antes e grava só o que mudou. */
import { Prisma } from '@prisma/client';
import { clone } from '@mip/domain';

const ms = d => (d ? new Date(d).getTime() : null);

export async function load(tx, projectId) {
  const r = await tx.project.findUnique({
    where: { id: projectId },
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
  const people = {};
  r.members.forEach(m => { people[m.userId] = { name: m.user.name, email: m.user.email }; });
  const answers = {};
  r.answers.forEach(a => {
    answers[a.userId] = answers[a.userId] || {};
    answers[a.userId][a.assetId] = { draft: a.draft || {}, sent: a.sent ? { ...a.sent, at: ms(a.sentAt) } : null, step: a.step };
  });
  const proposal = {};
  r.proposals.forEach(x => { proposal[x.assetId] = x.data; });
  return {
    id: r.id, name: r.name, context: r.context, org: r.orgId, phase: r.phase, setupStep: r.setupStep,
    createdAt: ms(r.createdAt),
    people,
    members: r.members.map(m => ({ pid: m.userId, status: m.status, elig: m.elig, by: m.removedBy || undefined, at: ms(m.removedAt) || undefined })),
    link: { active: r.inviteActive, code: r.inviteCode },
    assets: r.assets.map(a => ({ id: a.id, name: a.name, type: a.type, cat: a.cat, desc: a.desc, link: a.link, st: a.status, by: a.suggestedBy || undefined, reason: a.reason || undefined })),
    answers,
    proposal,
    comments: r.comments.map(c => ({ id: c.id, aid: c.assetId, pid: c.userId, text: c.text, at: ms(c.createdAt) })),
    versions: r.versions.map(v => {
      const conf = {};
      v.confirmations.forEach(c => { conf[c.userId] = { v: c.value, comment: c.comment, assets: c.assets, at: ms(c.createdAt) }; });
      return { id: v.id, n: v.n, at: ms(v.createdAt), snap: v.snap, conf };
    }),
    history: r.history.map(h => ({ id: h.id, at: ms(h.createdAt), who: h.userId || 'sistema', text: h.text })),
    memorials: r.memorials.map(m => ({ id: m.id, at: ms(m.createdAt), body: m.body, hash: m.hash }))
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function save(tx, before, p) {
  const pid = p.id;
  if (!same([before.name, before.context, before.phase, before.setupStep, before.link.active], [p.name, p.context, p.phase, p.setupStep, p.link.active])) {
    await tx.project.update({ where: { id: pid }, data: { name: p.name, context: p.context, phase: p.phase, setupStep: p.setupStep, inviteActive: p.link.active } });
  }
  /* Integrantes (novos integrantes entram por rotas próprias; aqui só mudam de estado). */
  for (const m of p.members) {
    const b = before.members.find(x => x.pid === m.pid);
    if (b && !same(b, m)) await tx.member.update({ where: { projectId_userId: { projectId: pid, userId: m.pid } }, data: { status: m.status, elig: m.elig, removedBy: m.by || null, removedAt: m.at ? new Date(m.at) : null } });
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
      const data = { draft: an.draft || {}, sent: sent ?? Prisma.DbNull, sentAt: an.sent ? new Date(an.sent.at) : null, step: an.step || 0 };
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
    await tx.proposal.upsert({ where: { assetId: aid }, create: { projectId: pid, assetId: aid, data: pr }, update: { data: pr } });
  }
  /* Versões e confirmações */
  for (const v of p.versions) {
    const b = before.versions.find(x => x.n === v.n);
    let vid = b?.id;
    if (!b) { const created = await tx.version.create({ data: { projectId: pid, n: v.n, snap: v.snap, createdAt: new Date(v.at) } }); vid = created.id; v.id = vid; }
    for (const [uid, c] of Object.entries(v.conf)) {
      if (b?.conf[uid]) continue;
      await tx.confirmation.create({ data: { versionId: vid, userId: uid, value: c.v, comment: c.comment || '', assets: c.assets || [], createdAt: new Date(c.at) } });
    }
  }
  /* Comentários, histórico e registros: só entram itens novos. */
  for (const c of p.comments.filter(c => !c.id)) await tx.comment.create({ data: { projectId: pid, assetId: c.aid, userId: c.pid, text: c.text, createdAt: new Date(c.at) } });
  for (const h of p.history.filter(h => !h.id).reverse()) await tx.historyEntry.create({ data: { projectId: pid, userId: h.who === 'sistema' ? null : h.who, text: h.text, createdAt: new Date(h.at) } });
  for (const m of p.memorials.filter(m => !m.id)) await tx.memorial.create({ data: { projectId: pid, body: m.body, hash: m.hash, createdAt: new Date(m.at) } });
}

/* Trava o projeto durante a ação para que duas pessoas não gravem por cima uma da outra. */
export async function withProject(prisma, projectId, fn) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${projectId} FOR UPDATE`;
    const p = await load(tx, projectId);
    if (!p) return fn(null, tx);
    const before = clone(p);
    const out = await fn(p, tx);
    await save(tx, before, p);
    return out;
  }, { timeout: 15000 });
}
