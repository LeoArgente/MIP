/* Respostas: o rascunho de cada pessoa, o envio e o encerramento das respostas. */
import { QS, approved, elig, sendErrors, clone } from '@mip/domain';
import { ActionError, deny, fail, now, needOrg, needPhase, assetOf, ensureProp, ehObjeto, errosDeFormato } from '../shared.js';
import { log } from '../historico/index.js';
import type { Pid, Aid } from '@mip/domain';
import type { ProjetoCompleto, RespostaGravada } from '../../store.js';
import type { Acoes } from '../shared.js';

const ensureAns = (p: ProjetoCompleto, pid: Pid, aid: Aid): RespostaGravada => { p.answers[pid] = p.answers[pid] || {}; return (p.answers[pid][aid] = p.answers[pid][aid] || { draft: { desc: '', link: '' }, sent: null, step: 0 }); };

/* Campos de rascunho que cada pessoa pode gravar. */
const DRAFT_KEYS = new Set(['notas', 'desc', 'link', 'titularAtualNome', 'titularAtualBase', 'titularExterno', ...Object.keys(QS)]);

export const ACTIONS: Acoes = {
  /* Rascunho salvo sozinho enquanto a pessoa responde. */
  draft(p, me, d) {
    if (p.phase !== 'coleta' || !elig(p).includes(me)) deny('As respostas foram encerradas. Você pode ver o que respondeu, mas não pode mudar.');
    const a = assetOf(p, d.aid);
    /* O corpo chega sem tipo: confere o formato de cada valor antes de gravar qualquer coisa. Chaves fora de
       DRAFT_KEYS continuam ignoradas; um valor no formato errado recusa o rascunho inteiro (400, nada gravado). */
    const patch: unknown = d.draft ?? {};
    if (!ehObjeto(patch)) fail('_', 'Envie o rascunho como objeto.');
    const err = errosDeFormato(patch, DRAFT_KEYS, a.id + ':', 'ignora');
    if (Object.keys(err).length) throw new ActionError(err);
    const an = ensureAns(p, me, a.id);
    /* Garantido: errosDeFormato acima conferiu cada valor de DRAFT_KEYS contra o formato da pergunta ou o limite do texto. */
    Object.keys(patch).forEach(k => { if (DRAFT_KEYS.has(k)) (an.draft as Record<string, unknown>)[k] = patch[k]; });
    /* Garantido: Number.isInteger acima. */
    if (Number.isInteger(d.step)) an.step = d.step!;
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
  }
};
