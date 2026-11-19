/* Projeto em memória para os testes que chamam o despachante real (dist/modules/index.js) sem banco e sem servidor.
   Não define testes: o node --test o carrega por estar em test/, e ele só exporta. */
import assert from 'node:assert/strict';
import { apply } from '../dist/modules/index.js';

/* Ana organiza, Bruno e Carla participam; todos responderam igual a criação a1, então a proposta padrão já fecha.
   Fica na fase de decisão, logo depois do encerramento das respostas. */
export function emDecisao() {
  const igual = () => ({ notas: { ana: 6, bruno: 6, carla: 6 }, origem: 'Criada neste projeto', titularAtual: 'Não sei', titular: ['ana'], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', materiais: 'Só o que a própria pessoa fez', comercial: 'Sim', portfolio: 'Todos que criaram', desc: 'fiz' });
  return {
    id: 'p1', name: 'Projeto', context: '', org: 'ana', phase: 'decisao', setupStep: 'resp', sobre: {}, createdAt: 1,
    people: { ana: { name: 'Ana', email: '' }, bruno: { name: 'Bruno', email: '' }, carla: { name: 'Carla', email: '' } },
    members: ['ana', 'bruno', 'carla'].map(pid => ({ pid, status: 'ativo', elig: true, perfil: {} })),
    link: { active: false, code: 'x' },
    assets: [{ id: 'a1', name: 'App', type: 'outro', cat: 'Outro', desc: '', link: '', st: 'ok' }],
    answers: Object.fromEntries(['ana', 'bruno', 'carla'].map(pid => [pid, { a1: { draft: igual(), sent: { ...igual(), at: 1 }, step: 3 } }])),
    proposal: {}, comments: [], versions: [], history: [], memorials: []
  };
}

/* O mesmo projeto com a proposta 1 enviada para confirmação. */
export function emConfirmacao() {
  const p = emDecisao();
  apply(p, 'ana', 'saveprop', { aid: 'a1' });
  apply(p, 'ana', 'sendv', {});
  assert.equal(p.phase, 'confirmacao');
  return p;
}

/* Erro da ação: status e erros por campo (ActionError). */
export const erro = fn => { try { fn(); } catch (e) { return { status: e.status, err: e.err }; } assert.fail('a ação deveria ter sido recusada'); };
