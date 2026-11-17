/* Cenário base dos testes por grupo (não é um arquivo de teste: não casa com *.test.js).
   Ana organiza, Bruno e Carla participam; todos responderam a criação a1 (uma marca) e TODOS
   concordam em tudo. Cada teste altera só o que precisa para o caso que descreve. */
import { PCT_NEG, snapshot } from '@mip/domain';

export const BASE = Object.freeze({
  origem: 'Criada neste projeto',
  titularAtual: 'Não sei',
  divisao: PCT_NEG,
  uso: 'Só quem for dono',
  materiais: 'Só o que a própria pessoa fez',
  comercial: 'Sim',
  portfolio: 'Todos que criaram',
  marcaRegistro: 'Sim, com evidência',
  desc: 'fiz',
  link: ''
});
export const NOTAS = Object.freeze({ ana: 10, bruno: 0, carla: 6 });

/* Uma resposta enviada (draft + sent). `o` sobrescreve qualquer campo, inclusive notas e titular. */
export const resposta = (o = {}) => {
  const d = () => ({ ...BASE, notas: { ...NOTAS }, titular: ['ana'], ...o });
  return { draft: d(), sent: { ...d(), at: 1 } };
};

export function projeto() {
  return {
    id: 'p1', name: 'App Rotas', context: 'Disciplina', org: 'ana', phase: 'decisao', setupStep: 'resp',
    people: { ana: { name: 'Ana' }, bruno: { name: 'Bruno' }, carla: { name: 'Carla' }, dani: { name: 'Dani' }, eva: { name: 'Eva' } },
    members: [
      { pid: 'ana', status: 'ativo', elig: true },
      { pid: 'bruno', status: 'ativo', elig: true },
      { pid: 'carla', status: 'ativo', elig: true }
    ],
    link: { active: true, code: 'x' },
    assets: [{ id: 'a1', name: 'Logo', type: 'marca', cat: 'Marca', st: 'ok' }],
    answers: { ana: { a1: resposta() }, bruno: { a1: resposta() }, carla: { a1: resposta() } },
    proposal: {}, comments: [], versions: [], history: [], memorials: []
  };
}

export const responder = (p, pid, o = {}, aid = 'a1') => { (p.answers[pid] ||= {})[aid] = resposta(o); return p; };
export const semResposta = (p, pid, aid = 'a1') => { if (p.answers[pid]) delete p.answers[pid][aid]; return p; };
export const addMembro = (p, pid, extra = {}) => { p.members.push({ pid, status: 'ativo', elig: false, ...extra }); return p; };
/* Envia uma nova versão da proposta (snapshot do estado atual) com as confirmações dadas. */
export const enviarVersao = (p, conf = {}) => { const v = { n: p.versions.length + 1, at: 1, snap: snapshot(p), conf }; p.versions.push(v); return v; };

/* 27/10/2026 15:00 UTC = 12:00 em São Paulo. */
export const T = Date.UTC(2026, 9, 27, 15);
export const T_TXT = '27/10/2026 às 12:00';
