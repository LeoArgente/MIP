/* Projetos: criar e listar projetos, montar o projeto, equipe e convites. */
import { randomBytes } from 'node:crypto';
import type { ChaveSobre, ChavePerfil } from '@mip/domain';
import { SOBRE, PERFIL, sobreErrors, perfilErrors, approved, mem, nm, taskFor, phaseName } from '@mip/domain';
import { load, withProject } from '../../store.js';
import { viewFor } from '../../view.js';
import { sendLoginLink, validEmail, nameFromEmail } from '../../auth.js';
import { ActionError, deny, fail, now, needOrg, needPhase, ehObjeto, errosDeFormato } from '../shared.js';
import { log } from '../historico/index.js';
import type { Express, Response } from 'express';
import type { Contexto, AuthedRequest } from '../../server.js';
import type { ProjetoCompleto } from '../../store.js';
import type { Acoes } from '../shared.js';

export const ACTIONS: Acoes = {
  setupnext(p, me) {
    needOrg(p, me);
    if (p.setupStep === 'equipe') { p.setupStep = 'ativos'; return { tab: 'ativos' }; }
    if (p.setupStep === 'ativos') { if (!approved(p).length) fail('_', 'Cadastre pelo menos 1 criação para continuar.'); p.setupStep = 'sobre'; return { tab: 'sobre' }; }
    return {};
  },

  /* Sobre o projeto: quem organiza responde (pode ajustar enquanto as respostas estão abertas). */
  sobre(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    /* O corpo chega sem tipo: confere o formato de cada valor antes de gravar (400 com erro por campo, nada gravado).
       Chaves fora de SOBRE continuam ignoradas. */
    const raw: unknown = d.sobre ?? {};
    if (!ehObjeto(raw)) fail('_', 'Envie as respostas sobre o projeto como objeto.');
    const err = errosDeFormato(raw, new Set(Object.keys(SOBRE)), 'sobre:', 'ignora');
    if (Object.keys(err).length) throw new ActionError(err);
    const cur = { ...(p.sobre || {}) };
    /* Garantido: errosDeFormato acima conferiu cada valor (texto, uma das opções quando há opts, limite do texto). */
    (Object.keys(SOBRE) as ChaveSobre[]).forEach(k => { if (k in raw) cur[k] = raw[k] as string; });
    if (cur.edital !== 'Sim') delete cur.editalQual;
    p.sobre = cur;
    if (d.check) { const e = sobreErrors(cur); if (Object.keys(e).length) throw new ActionError(e); }
    return { quiet: !d.check };
  },

  /* Sobre você: cada pessoa responde por si, enquanto as respostas estão abertas. */
  perfil(p, me, d) {
    if (p.phase !== 'coleta') deny('As respostas foram encerradas.');
    /* Garantido: apply só chama a ação para quem é integrante e não está pendente. */
    const raw: unknown = d.perfil ?? {};
    if (!ehObjeto(raw)) fail('_', 'Envie as respostas sobre você como objeto.');
    /* Chaves fora de PERFIL continuam ignoradas (a tela reenvia o próprio perfil, que pode trazer outras). */
    const err = errosDeFormato(raw, new Set(Object.keys(PERFIL)), 'perfil:', 'ignora');
    if (Object.keys(err).length) throw new ActionError(err);
    const m = mem(p, me)!, cur = { ...(m.perfil || {}) };
    /* Garantido: errosDeFormato acima conferiu cada valor (texto, uma das opções quando há opts, limite do texto). */
    (Object.keys(PERFIL) as ChavePerfil[]).forEach(k => { if (k in raw) cur[k] = raw[k] as string; });
    m.perfil = cur;
    if (d.check) { const e = perfilErrors(cur); if (Object.keys(e).length) throw new ActionError(e); }
    return { quiet: !d.check };
  },

  toglink(p, me) { needOrg(p, me); p.link.active = !p.link.active; log(p, me, p.link.active ? 'ativou o link de convite' : 'desativou o link de convite'); return {}; },

  naopart(p, me, d) {
    needOrg(p, me);
    if (d.pid === p.org) fail('np', 'Quem organiza não pode sair das respostas');
    /* Garantido: sem pid, mem não acha ninguém e fail lança; daqui em diante d.pid existe. */
    const m = mem(p, d.pid!) || fail('np', 'Pessoa não encontrada no projeto');
    m.status = 'naopart'; m.by = me; m.at = now();
    Object.values(p.proposal).forEach(pr => { if (pr.v.titular) pr.v.titular = pr.v.titular.filter(x => x !== d.pid); });
    log(p, me, 'tirou ' + nm(p, d.pid!) + ' das respostas');
    return {};
  }
};

export function routes(app: Express, { prisma, wrap, auth }: Contexto) {
  const newCode = () => randomBytes(6).toString('base64url');

  /* ===== Projetos ===== */
  app.get('/api/projects', auth, wrap(async (req: AuthedRequest, res) => {
    const ms = await prisma.member.findMany({ where: { userId: req.user.id }, select: { projectId: true }, orderBy: { createdAt: 'desc' } });
    const out = [];
    /* Carrega os projetos em paralelo, não um depois do outro. */
    const all = await Promise.all(ms.map(({ projectId }) => load(prisma, projectId, req.user.id)));
    for (const p of all) {
      if (!p) continue;
      const v = viewFor(p, req.user.id), qpos = Object.fromEntries(Object.entries(p.answers[req.user.id] || {}).map(([aid, an]) => [aid, an.step]));
      const lastAt = Math.max(p.createdAt || 0, ...p.history.map(h => h.at));
      out.push({ id: p.id, name: p.name, context: p.context, phase: p.phase, phaseName: phaseName(p), org: p.org === req.user.id, orgName: p.people[p.org]?.name, people: p.members.filter(m => m.status === 'ativo').length, assets: p.assets.filter(a => a.st === 'ok').length, lastAt, task: taskFor(v, req.user.id, qpos) });
    }
    out.sort((a, b) => b.lastAt - a.lastAt);
    res.json(out);
  }));

  app.post('/api/projects', auth, wrap(async (req: AuthedRequest, res) => {
    const name = String(req.body.name || '').trim().slice(0, 120), context = String(req.body.context || '').trim().slice(0, 300), person = String(req.body.person || '').trim().slice(0, 80);
    const err: Record<string, string> = {};
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

  const projectFor = async (req: AuthedRequest, res: Response): Promise<ProjetoCompleto | null> => {
    /* load já devolve null para quem não participa. */
    const p = await load(prisma, req.params.id, req.user.id);
    if (!p) { res.status(404).json({ err: { _: 'Projeto não encontrado ou sem acesso.' } }); return null; }
    return p;
  };

  app.get('/api/projects/:id', auth, wrap(async (req: AuthedRequest, res) => {
    const p = await projectFor(req, res); if (!p) return;
    res.json(viewFor(p, req.user.id));
  }));

  /* Adicionar pessoa por e-mail: cria a conta se preciso e manda o link de acesso ao projeto. */
  app.post('/api/projects/:id/invite', auth, wrap(async (req: AuthedRequest, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!validEmail(email)) return res.status(400).json({ err: { inv: 'Informe um e-mail válido' } });
    const added = await withProject(prisma, req.params.id, req.user.id, async (p, tx) => {
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
    const fresh = await load(prisma, req.params.id, req.user.id);
    /* Garantido hoje: o projeto existia na transação acima com quem organiza como integrante, e nenhuma rota apaga
       projeto. Se um dia houver exclusão de projeto, aqui vira 500 (o wrap responde). */
    res.json({ result: { toast: added.user.name + ' entrou no projeto.' + (sent ? ' Enviamos um e-mail com o link de acesso.' : ' O e-mail não foi enviado; compartilhe o link de convite.') }, project: viewFor(fresh!, req.user.id) });
  }));

  /* Remover alguém do projeto (só quem organiza, enquanto as respostas estão abertas).
     Sem `confirm`, devolve o que será apagado para a tela pedir confirmação. */
  app.post('/api/projects/:id/remove', auth, wrap(async (req: AuthedRequest, res) => {
    const pid = String(req.body.pid || '');
    const out = await withProject(prisma, req.params.id, req.user.id, async (p, tx) => {
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
    const fresh = await load(prisma, req.params.id, req.user.id);
    /* Garantido hoje: o projeto existia na transação acima com quem organiza como integrante (quem organiza não pode
       ser removido), e nenhuma rota apaga projeto. Se um dia houver exclusão de projeto, aqui vira 500 (o wrap responde). */
    res.json({ result: out, project: viewFor(fresh!, req.user.id) });
  }));

  app.post('/api/projects/:id/remind', auth, wrap(async (req: AuthedRequest, res) => {
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

  app.post('/api/invite/:code/join', auth, wrap(async (req: AuthedRequest, res) => {
    const pr = await prisma.project.findUnique({ where: { inviteCode: req.params.code } });
    if (!pr) return res.status(404).json({ err: { _: 'Convite não encontrado.' } });
    if (!pr.inviteActive) return res.status(400).json({ err: { link: 'Este convite não está mais ativo' } });
    /* Quem entra ainda não participa, então não passa por withProject/load (que só montam o projeto para integrantes).
       Mesma trava de withProject; lê só a fase e a própria linha em Member. */
    const out = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Project" WHERE id = ${pr.id} FOR UPDATE`;
      if (await tx.member.findUnique({ where: { projectId_userId: { projectId: pr.id, userId: req.user.id } }, select: { id: true } })) return { already: true };
      /* Garantido hoje: pr foi achado logo acima e nenhuma rota apaga projeto. Se um dia houver exclusão de projeto,
         aqui vira 500 (o wrap responde). */
      const { phase } = (await tx.project.findUnique({ where: { id: pr.id }, select: { phase: true } }))!;
      await tx.member.create({ data: { projectId: pr.id, userId: req.user.id, elig: phase === 'coleta' } });
      await tx.historyEntry.create({ data: { projectId: pr.id, userId: req.user.id, text: 'entrou pelo link de convite' } });
      return { already: false, elig: phase === 'coleta' };
    }, { timeout: 15000 });
    res.json({ id: pr.id, result: { notice: out.already ? 'Você já participa deste projeto.' : out.elig ? 'Você entrou no projeto. Veja sua tarefa atual.' : 'Você entrou no projeto, mas as respostas já foram encerradas e você não responde desta vez.' } });
  }));
}
