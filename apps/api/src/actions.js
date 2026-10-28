/* Ações que mudam um projeto. Portadas de act() do protótipo, sem a parte de tela.
   Cada ação recebe o projeto `p` (já travado no banco), quem está agindo (`me`) e os dados enviados.
   Erros de regra viram ActionError e chegam ao navegador como mensagem por campo. */
import { createHash, randomUUID } from 'node:crypto';
import {
  QS, TYPES, SOBRE, PERFIL, sobreErrors, perfilErrors, approved, elig, mem, nm, ansOf, lastV, isP, qsFor, propOf, propDefault, propError,
  sendErrors, snapshot, memorialBody, validLink, clone
} from '@mip/domain';

export class ActionError extends Error {
  constructor(err, status = 400) { super(typeof err === 'string' ? err : Object.values(err)[0]); this.err = typeof err === 'string' ? { _: err } : err; this.status = status; }
}
const deny = msg => { throw new ActionError(msg, 403); };
const fail = (field, msg) => { throw new ActionError({ [field]: msg }); };
const log = (p, who, text) => p.history.unshift({ at: Date.now(), who, text });
const now = () => Date.now();
export const sha256 = t => createHash('sha256').update(t, 'utf8').digest('hex');

const needOrg = (p, me) => { if (p.org !== me) deny('Só quem organiza pode fazer isso.'); };
const needPhase = (p, ...ph) => { if (!ph.includes(p.phase)) deny('Esta ação não está disponível nesta fase do projeto.'); };
const assetOf = (p, aid) => p.assets.find(a => a.id === aid) || fail('_', 'Criação não encontrada.');
const ensureAns = (p, pid, aid) => { p.answers[pid] = p.answers[pid] || {}; return (p.answers[pid][aid] = p.answers[pid][aid] || { draft: { desc: '', link: '' }, sent: null, step: 0 }); };
const ensureProp = (p, aid) => (p.proposal[aid] = p.proposal[aid] || propDefault(p, aid));

/* Campos de rascunho que cada pessoa pode gravar. */
const DRAFT_KEYS = new Set(['notas', 'desc', 'link', 'titularAtualNome', 'titularAtualBase', 'titularExterno', ...Object.keys(QS)]);
const PROP_KEYS = ['v', 'externo', 'percentual', 'texto', 'semAcordo'];

function newAsset(p, me, f, st) {
  const ty = TYPES.find(x => x.k === f.type), err = {};
  if (!ty) err.ft = 'Escolha o tipo da criação';
  if (!(f.name || '').trim()) err.fn = 'Informe o nome da criação';
  if ((f.link || '').trim() && !validLink(f.link)) err.fl = 'Informe um link válido, começando com http';
  if (Object.keys(err).length) throw new ActionError(err);
  const a = { id: randomUUID(), name: f.name.trim(), type: ty.k, cat: ty.n, desc: (f.desc || '').trim(), link: (f.link || '').trim(), st };
  if (st === 'sug') a.by = me;
  p.assets.push(a);
  return { a, ty };
}

export const ACTIONS = {
  setupnext(p, me) {
    needOrg(p, me);
    if (p.setupStep === 'equipe') { p.setupStep = 'ativos'; return { tab: 'ativos' }; }
    if (p.setupStep === 'ativos') { if (!approved(p).length) fail('_', 'Cadastre pelo menos 1 criação para continuar.'); p.setupStep = 'sobre'; return { tab: 'sobre' }; }
    return {};
  },

  /* Sobre o projeto: quem organiza responde (pode ajustar enquanto as respostas estão abertas). */
  sobre(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    const cur = { ...(p.sobre || {}) };
    Object.keys(SOBRE).forEach(k => { if (k in (d.sobre || {})) cur[k] = String(d.sobre[k] ?? '').slice(0, 500); });
    if (cur.edital !== 'Sim') delete cur.editalQual;
    p.sobre = cur;
    if (d.check) { const e = sobreErrors(cur); if (Object.keys(e).length) throw new ActionError(e); }
    return { quiet: !d.check };
  },

  /* Sobre você: cada pessoa responde por si, enquanto as respostas estão abertas. */
  perfil(p, me, d) {
    if (p.phase !== 'coleta') deny('As respostas foram encerradas.');
    const m = mem(p, me), cur = { ...(m.perfil || {}) };
    Object.keys(PERFIL).forEach(k => { if (k in (d.perfil || {})) cur[k] = String(d.perfil[k] ?? '').slice(0, 200); });
    m.perfil = cur;
    if (d.check) { const e = perfilErrors(cur); if (Object.keys(e).length) throw new ActionError(e); }
    return { quiet: !d.check };
  },

  setupassets(p, me) {
    needOrg(p, me); needPhase(p, 'coleta');
    if (!approved(p).length) fail('_', 'Cadastre pelo menos 1 criação para liberar as perguntas.');
    { const e = sobreErrors(p.sobre); if (Object.keys(e).length) throw new ActionError(e); }
    p.setupStep = 'resp'; log(p, me, 'liberou as perguntas para a equipe');
    return { tab: 'resp', notice: 'Perguntas liberadas para a equipe. Comece pelas suas.' };
  },

  toglink(p, me) { needOrg(p, me); p.link.active = !p.link.active; log(p, me, p.link.active ? 'ativou o link de convite' : 'desativou o link de convite'); return {}; },

  naopart(p, me, d) {
    needOrg(p, me);
    if (d.pid === p.org) fail('np', 'Quem organiza não pode sair das respostas');
    const m = mem(p, d.pid) || fail('np', 'Pessoa não encontrada no projeto');
    m.status = 'naopart'; m.by = me; m.at = now();
    Object.values(p.proposal).forEach(pr => { if (pr.v.titular) pr.v.titular = pr.v.titular.filter(x => x !== d.pid); });
    log(p, me, 'tirou ' + nm(p, d.pid) + ' das respostas');
    return {};
  },

  addasset(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    const { a, ty } = newAsset(p, me, d, 'ok');
    log(p, me, 'cadastrou a criação ' + a.name);
    return { toast: ty.n + ' “' + a.name + '” cadastrado. Ele já entra nas perguntas de todos.' };
  },

  sugasset(p, me, d) {
    if (p.phase !== 'coleta') fail('fn', 'As respostas já foram encerradas');
    const { a } = newAsset(p, me, d, 'sug');
    log(p, me, 'sugeriu a criação ' + a.name);
    return { toast: 'Sugestão enviada para ' + nm(p, p.org) + '.' };
  },

  aprov(p, me, d) { needOrg(p, me); needPhase(p, 'coleta'); const a = assetOf(p, d.aid); a.st = 'ok'; log(p, me, 'aprovou a criação ' + a.name); return {}; },

  recusok(p, me, d) {
    needOrg(p, me); needPhase(p, 'coleta');
    const a = assetOf(p, d.aid); a.st = 'rec'; a.reason = (d.reason || '').trim() || 'Sem motivo informado';
    log(p, me, 'recusou a criação ' + a.name);
    return {};
  },

  /* Sem `confirm`, devolve quantas respostas seriam descartadas para a tela pedir confirmação. */
  del(p, me, d) {
    needOrg(p, me);
    if (p.phase !== 'coleta') fail('d' + d.aid, 'Criações não podem ser excluídas depois que as respostas forem encerradas');
    const a = assetOf(p, d.aid), n = p.members.filter(m => ansOf(p, m.pid, a.id)?.sent).length;
    if (n && !d.confirm) return { confirmDelete: { aid: a.id, n } };
    p.assets = p.assets.filter(x => x.id !== a.id);
    Object.values(p.answers).forEach(o => delete o[a.id]);
    delete p.proposal[a.id];
    log(p, me, 'excluiu a criação ' + a.name + ' e descartou as respostas');
    return { toast: 'Criação excluída e registrada no histórico.' };
  },

  /* Rascunho salvo sozinho enquanto a pessoa responde. */
  draft(p, me, d) {
    if (p.phase !== 'coleta' || !elig(p).includes(me)) deny('As respostas foram encerradas. Você pode ver o que respondeu, mas não pode mudar.');
    assetOf(p, d.aid);
    const an = ensureAns(p, me, d.aid), patch = d.draft || {};
    Object.keys(patch).forEach(k => { if (DRAFT_KEYS.has(k)) an.draft[k] = patch[k]; });
    if (Number.isInteger(d.step)) an.step = d.step;
    return { quiet: true };
  },

  qsend(p, me, d) {
    if (!approved(p).some(a => a.id === d.aid)) fail('_', 'Criação não encontrada.');
    if (p.phase !== 'coleta' || !elig(p).includes(me)) deny('As respostas foram encerradas.');
    const a = assetOf(p, d.aid), an = ensureAns(p, me, a.id), dr = an.draft;
    const err = sendErrors(p, me, a, dr);
    if (Object.keys(err).length) throw new ActionError(err);
    const had = !!an.sent; dr.link = (dr.link || '').trim();
    an.sent = Object.assign(clone(dr), { at: now() });
    log(p, me, (had ? 'alterou' : 'enviou') + ' as respostas de ' + a.name);
    return { toast: 'Respostas de ' + a.name + ' registradas.' };
  },

  closeok(p, me) {
    needOrg(p, me); needPhase(p, 'coleta');
    if (!approved(p).length) fail('_', 'Cadastre ao menos uma criação antes de encerrar as respostas.');
    p.phase = 'decisao';
    approved(p).forEach(a => ensureProp(p, a.id));
    log(p, me, 'encerrou as respostas');
    return { tab: 'decidir', notice: 'Respostas encerradas. Agora decidam os pontos em que as respostas diferem.' };
  },

  /* Quem organiza edita a proposta de uma criação (salvo sozinho). */
  propdraft(p, me, d) {
    needOrg(p, me); needPhase(p, 'decisao');
    assetOf(p, d.aid);
    const pr = ensureProp(p, d.aid), patch = d.prop || {};
    PROP_KEYS.forEach(k => { if (k in patch) pr[k] = k === 'v' ? { ...pr.v, ...patch.v } : patch[k]; });
    if (pr.v.titular) pr.v.titular = pr.v.titular.filter(x => elig(p).includes(x));
    pr.saved = false;
    return { quiet: true };
  },

  saveprop(p, me, d) {
    needOrg(p, me); needPhase(p, 'decisao');
    const a = assetOf(p, d.aid), pr = ensureProp(p, a.id), e = propError(p, a.id);
    if (e) fail('p' + a.id, e);
    pr.saved = true; pr.by = me; pr.at = now(); delete pr.ajuste;
    log(p, me, 'registrou as decisões de ' + a.name);
    const next = approved(p).find(x => !propOf(p, x.id).saved);
    return { toast: pr.semAcordo ? 'Criação registrada como sem acordo. O acordo não fecha enquanto isso valer.' : 'Decisões de ' + a.name + ' salvas.', next: next?.id || null };
  },

  comment(p, me, d) {
    if (!elig(p).includes(me)) deny('Só quem participa das respostas pode comentar.');
    assetOf(p, d.aid);
    const t = (d.text || '').trim();
    if (!t) fail('cmt', 'Escreva o comentário antes de enviar.');
    p.comments.push({ aid: d.aid, pid: me, text: t.slice(0, 2000), at: now() });
    return { toast: 'Comentário registrado. A proposta não foi alterada.' };
  },

  sendv(p, me) {
    needOrg(p, me); needPhase(p, 'decisao');
    const as = approved(p);
    if (!as.length) fail('send', 'Cadastre ao menos uma criação antes de enviar.');
    if (as.some(a => !propOf(p, a.id).saved)) fail('send', 'Conclua a proposta de todas as criações antes de enviar.');
    const n = p.versions.length + 1;
    p.versions.push({ n, at: now(), snap: snapshot(p), conf: {} });
    p.phase = 'confirmacao';
    log(p, me, 'enviou a proposta ' + n + ' para confirmação');
    return { tab: 'conf', notice: 'Proposta enviada. Cada pessoa confirma ou recusa individualmente.' };
  },

  editok(p, me) {
    needOrg(p, me); needPhase(p, 'confirmacao');
    p.phase = 'decisao';
    log(p, me, 'reabriu a proposta; o próximo envio criará a proposta ' + (p.versions.length + 1));
    return { tab: 'decidir' };
  },

  conf(p, me, d) {
    const lv = lastV(p);
    if (!lv || +d.n !== lv.n || p.phase !== 'confirmacao') deny('Só é possível se posicionar sobre a versão atual.');
    if (lv.conf[me]) deny('Você já se posicionou sobre esta versão.');
    if (!elig(p).includes(me)) deny('Você não respondeu desta vez e não confirma a proposta.');
    lv.conf[me] = { v: 'ok', comment: '', at: now() };
    log(p, me, 'confirmou a proposta ' + lv.n);
    const allOk = elig(p).every(x => lv.conf[x]?.v === 'ok'), sem = Object.values(lv.snap).some(s => s.semAcordo);
    if (allOk && !sem) { p.phase = 'consolidado'; return { tab: 'memorial', notice: 'Todos confirmaram a proposta. O registro pode ser gerado agora.' }; }
    if (allOk) return { notice: 'Todos confirmaram a proposta, mas há criação sem acordo. O registro mantém essa pendência.' };
    return { notice: 'Sua confirmação foi registrada. Aguarde as demais pessoas.' };
  },

  refuse(p, me, d) {
    const lv = lastV(p);
    if (!lv || +d.n !== lv.n || p.phase !== 'confirmacao') deny('Só é possível se posicionar sobre a versão atual.');
    if (lv.conf[me]) deny('Você já se posicionou sobre esta versão.');
    if (!elig(p).includes(me)) deny('Você não respondeu desta vez e não confirma a proposta.');
    if (p.org === me) deny('Quem organiza edita a proposta em vez de recusá-la.');
    const ra = (d.assets || []).filter(x => lv.snap[x]), comment = (d.comment || '').trim(), err = {};
    if (!ra.length) err.refa = 'Marque pelo menos uma criação';
    if (!comment) err.refuse = 'Explique o que precisa mudar';
    if (Object.keys(err).length) throw new ActionError(err);
    lv.conf[me] = { v: 'no', comment, assets: ra, at: now() };
    ra.forEach(x => { const pr = ensureProp(p, x); pr.saved = false; pr.ajuste = { by: me, comment }; });
    p.phase = 'decisao';
    const names = ra.map(x => lv.snap[x].name).join(', ');
    log(p, me, 'recusou a proposta ' + lv.n + ' e pediu ajuste em ' + names);
    return { tab: 'proj', notice: 'Recusa enviada. ' + nm(p, p.org) + ' vai revisar ' + names + ' e enviar a proposta ' + (lv.n + 1) + ' para todos.' };
  },

  genmem(p, me) {
    if (!lastV(p)) deny('O registro do acordo fica disponível depois do envio da primeira proposta.');
    if (!mem(p, me)) deny('Você não participa deste projeto.');
    const at = now(), body = memorialBody(p, at);
    p.memorials.unshift({ at, body, hash: sha256(body) });
    log(p, me, 'gerou o registro do acordo');
    return { toast: 'Registro do acordo gerado com código de verificação.' };
  }
};

export function apply(p, me, type, d = {}) {
  const fn = ACTIONS[type];
  if (!fn) throw new ActionError('Ação desconhecida.', 404);
  const m = mem(p, me);
  if (!m || m.status === 'pendente') deny('Você não participa deste projeto.');
  return fn(p, me, d) || {};
}
