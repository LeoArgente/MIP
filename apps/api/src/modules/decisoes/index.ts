/* Decisões: a proposta de cada criação, editada por quem organiza, e os comentários da equipe. */
import { approved, elig, propOf, propError } from '@mip/domain';
import { deny, fail, now, needOrg, needPhase, assetOf, ensureProp } from '../shared.js';
import { log } from '../historico/index.js';
import type { Proposta } from '@mip/domain';
import type { Acoes } from '../shared.js';

const PROP_KEYS: (keyof Proposta)[] = ['v', 'externo', 'percentual', 'texto', 'semAcordo'];

export const ACTIONS: Acoes = {
  /* Quem organiza edita a proposta de uma criação (salvo sozinho). */
  propdraft(p, me, d) {
    needOrg(p, me); needPhase(p, 'decisao');
    assetOf(p, d.aid);
    /* Garantido: assetOf acima lança sem um aid de criação do projeto. */
    const pr = ensureProp(p, d.aid!), patch = d.prop || {};
    /* Sem garantia: o corpo não é conferido. As chaves de cima são filtradas (PROP_KEYS), mas os valores entram
       como vieram e `v` aceita qualquer chave. Um titular que não seja lista quebra o .filter abaixo (500). */
    PROP_KEYS.forEach(k => { if (k in patch) (pr as Record<keyof Proposta, unknown>)[k] = k === 'v' ? { ...pr.v, ...patch.v } : patch[k]; });
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
    /* Garantido: assetOf acima. */
    p.comments.push({ aid: d.aid!, pid: me, text: t.slice(0, 2000), at: now() });
    return { toast: 'Comentário registrado. A proposta não foi alterada.' };
  }
};
