/* Decisões: a proposta de cada criação, editada por quem organiza, e os comentários da equipe. */
import { approved, elig, propOf, propError, decQs } from '@mip/domain';
import { ActionError, deny, fail, now, needOrg, needPhase, assetOf, ensureProp, ehObjeto, ehId, erroDeFormato, errosDeFormato } from '../shared.js';
import { log } from '../historico/index.js';
import type { Ativo, Proposta } from '@mip/domain';
import type { Acoes } from '../shared.js';

const PROP_KEYS: (keyof Proposta)[] = ['v', 'externo', 'percentual', 'texto', 'semAcordo'];

/* Percentual: a tela manda o valor do input numérico como veio (texto, '' quando vazio); o propError já trata os dois.
   Aceita número ou texto numérico curto; recusa o resto. */
const ehPercentual = (n: unknown) => (typeof n === 'number' && Number.isFinite(n)) || (typeof n === 'string' && (n === '' || (n.length <= 32 && n.trim() !== '' && Number.isFinite(Number(n)))));

/* Erros de formato do rascunho da proposta, com a chave 'p' + aid + ':' + campo. Chaves fora de PROP_KEYS
   continuam ignoradas; dentro de `v`, só entram as perguntas de decQs do tipo da criação. */
function errosDaProposta(a: Ativo, prop: Record<string, unknown>): Record<string, string> {
  const k = 'p' + a.id + ':', err: Record<string, string> = {};
  if ('v' in prop) {
    if (!ehObjeto(prop.v)) err[k + 'v'] = 'Envie as decisões como objeto.';
    else Object.assign(err, errosDeFormato(prop.v, new Set<string>(decQs(a)), k, 'recusa'));
  }
  for (const c of ['externo', 'texto'] as const) if (c in prop) { const e = erroDeFormato(c, prop[c]); if (e) err[k + c] = e; }
  if ('percentual' in prop && !(ehObjeto(prop.percentual) && Object.entries(prop.percentual).every(([pid, n]) => ehId(pid) && ehPercentual(n)))) err[k + 'percentual'] = 'Envie cada percentual como número.';
  if ('semAcordo' in prop && typeof prop.semAcordo !== 'boolean') err[k + 'semAcordo'] = 'Envie "sem acordo" como verdadeiro ou falso.';
  return err;
}

export const ACTIONS: Acoes = {
  /* Quem organiza edita a proposta de uma criação (salvo sozinho). */
  propdraft(p, me, d) {
    needOrg(p, me); needPhase(p, 'decisao');
    const a = assetOf(p, d.aid);
    /* O corpo chega sem tipo: confere tudo antes de gravar qualquer coisa (400 com erro por campo, nada gravado). */
    const raw: unknown = d.prop ?? {};
    if (!ehObjeto(raw)) fail('p' + a.id, 'Envie a proposta como objeto.');
    const err = errosDaProposta(a, raw);
    if (Object.keys(err).length) throw new ActionError(err);
    const pr = ensureProp(p, a.id), patch = raw as Partial<Proposta>;
    /* Garantido: errosDaProposta acima. As chaves de cima são filtradas (PROP_KEYS) e `v` só traz chaves de decQs(a),
       cada uma no formato da pergunta, então o spread não deixa entrar chave nenhuma além delas. */
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
    /* O corpo chega sem tipo: text precisa ser texto dentro do limite (recusado, não cortado). Sem text, vale como vazio. */
    const e = d.text === undefined ? null : erroDeFormato('text', d.text);
    if (e) fail('cmt', e);
    const t = (d.text || '').trim();
    if (!t) fail('cmt', 'Escreva o comentário antes de enviar.');
    /* Garantido: assetOf acima. */
    p.comments.push({ aid: d.aid!, pid: me, text: t, at: now() });
    return { toast: 'Comentário registrado. A proposta não foi alterada.' };
  }
};
