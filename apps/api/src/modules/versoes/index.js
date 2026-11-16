/* Versões: envio da proposta para confirmação, reabertura, confirmação e recusa de cada pessoa. */
import { approved, elig, nm, lastV, propOf, snapshot } from '@mip/domain';
import { ActionError, deny, fail, now, needOrg, needPhase, ensureProp } from '../shared.js';
import { log } from '../historico/index.js';

export const ACTIONS = {
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
  }
};
