/* Versões: envio da proposta para confirmação, reabertura, confirmação e recusa de cada pessoa. */
import { approved, eligNaVersao, nm, lastV, propOf, snapshot, membrosCongelados } from '@mip/domain';
import { ActionError, deny, fail, now, needOrg, needPhase, ensureProp, erroDeFormato, ehListaDeIds } from '../shared.js';
import { log } from '../historico/index.js';
import type { Acoes } from '../shared.js';

export const ACTIONS: Acoes = {
  sendv(p, me) {
    needOrg(p, me); needPhase(p, 'decisao');
    const as = approved(p);
    if (!as.length) fail('send', 'Cadastre ao menos uma criação antes de enviar.');
    if (as.some(a => !propOf(p, a.id).saved)) fail('send', 'Conclua a proposta de todas as criações antes de enviar.');
    const n = p.versions.length + 1;
    p.versions.push({ n, at: now(), snap: snapshot(p), membros: membrosCongelados(p), conf: {} });
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
    /* Garantido: sem n, +undefined é NaN e deny lança. */
    if (!lv || +d.n! !== lv.n || p.phase !== 'confirmacao') deny('Só é possível se posicionar sobre a versão atual.');
    if (lv.conf[me]) deny('Você já se posicionou sobre esta versão.');
    if (!eligNaVersao(lv).includes(me)) deny('Você não respondeu desta vez e não confirma a proposta.');
    lv.conf[me] = { v: 'ok', comment: '', at: now() };
    log(p, me, 'confirmou a proposta ' + lv.n);
    const allOk = eligNaVersao(lv).every(x => lv.conf[x]?.v === 'ok'), sem = Object.values(lv.snap).some(s => s.semAcordo);
    if (allOk && !sem) { p.phase = 'consolidado'; return { tab: 'memorial', notice: 'Todos confirmaram a proposta. O registro pode ser gerado agora.' }; }
    if (allOk) return { notice: 'Todos confirmaram a proposta, mas há criação sem acordo. O registro mantém essa pendência.' };
    return { notice: 'Sua confirmação foi registrada. Aguarde as demais pessoas.' };
  },

  refuse(p, me, d) {
    const lv = lastV(p);
    /* Garantido: sem n, +undefined é NaN e deny lança. */
    if (!lv || +d.n! !== lv.n || p.phase !== 'confirmacao') deny('Só é possível se posicionar sobre a versão atual.');
    if (lv.conf[me]) deny('Você já se posicionou sobre esta versão.');
    if (!eligNaVersao(lv).includes(me)) deny('Você não respondeu desta vez e não confirma a proposta.');
    if (p.org === me) deny('Quem organiza edita a proposta em vez de recusá-la.');
    /* O corpo chega sem tipo. Sem assets ou sem comment, vale como vazio (pede a criação ou a explicação); com eles,
       assets precisa ser lista de ids e comment, texto dentro do limite. Ids que não são criações da versão continuam
       ignorados, como antes. */
    const formato = d.comment === undefined ? null : erroDeFormato('comment', d.comment);
    const listaOk = d.assets === undefined || ehListaDeIds(d.assets);
    const ra = listaOk ? (d.assets || []).filter(x => lv.snap[x]) : [], comment = formato ? '' : (d.comment || '').trim(), err: Record<string, string> = {};
    if (!listaOk) err.refa = 'Envie as criações marcadas como uma lista.';
    else if (!ra.length) err.refa = 'Marque pelo menos uma criação';
    if (formato) err.refuse = formato;
    else if (!comment) err.refuse = 'Explique o que precisa mudar';
    if (Object.keys(err).length) throw new ActionError(err);
    lv.conf[me] = { v: 'no', comment, assets: ra, at: now() };
    ra.forEach(x => { const pr = ensureProp(p, x); pr.saved = false; pr.ajuste = { by: me, comment }; });
    p.phase = 'decisao';
    const names = ra.map(x => lv.snap[x].name).join(', ');
    log(p, me, 'recusou a proposta ' + lv.n + ' e pediu ajuste em ' + names);
    return { tab: 'proj', notice: 'Recusa enviada. ' + nm(p, p.org) + ' vai revisar ' + names + ' e enviar a proposta ' + (lv.n + 1) + ' para todos.' };
  }
};
