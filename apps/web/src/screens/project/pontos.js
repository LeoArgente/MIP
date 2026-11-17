/* Pontos de decisão: quais divergem e como a equipe votou (regras de @mip/domain). */
import { decQs, itemStatus, isP, nm } from '@mip/domain';

/* Pontos decidíveis de uma criação em que as respostas divergem. */
export const ptsOf = (p, a) => decQs(a).filter(q => itemStatus(p, a.id, q).status !== 'conv');
export const keyOf = (q, v) => (isP(q) ? [...(v || [])].sort().join('|') : v || '');
export const lista = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs.at(-1) : xs[0] || '');
/* Votos de um ponto: cada resposta diferente com quem votou. */
export function votesOf(p, a, q) {
  const r = itemStatus(p, a.id, q), m = new Map();
  r.vals.forEach(x => {
    const k = keyOf(q, x.v), g = m.get(k) || { key: k, txt: isP(q) ? lista((x.v || []).map(id => nm(p, id))) || 'Ninguém' : x.v, who: [] };
    g.who.push(nm(p, x.pid).split(' ')[0]); m.set(k, g);
  });
  return { n: r.vals.length, missing: r.missing.length, list: [...m.values()].sort((x, y) => y.who.length - x.who.length) };
}
