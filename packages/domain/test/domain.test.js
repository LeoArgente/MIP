import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemStatus, partOf, taskFor, propDefault, propError, sendErrors, memorialBody, snapshot, approved, PCT_SIM, dsteps } from '../src/index.js';

/* Cenário do protótipo: Ana organiza, Bruno e Carla participam. */
function demo() {
  const base = { materiais: 'Só o que a própria pessoa fez', origem: 'Criada neste projeto', titularAtual: 'Ainda não sabemos', divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', comercial: 'Sim', portfolio: 'Todos que criaram', marcaRegistro: 'Sim, com evidência', desc: 'fiz', link: '' };
  const sent = (o) => ({ draft: { ...base, ...o }, sent: { ...base, ...o, at: 1 } });
  return {
    id: 'p1', name: 'App Rotas', context: 'Disciplina', org: 'ana', phase: 'decisao', setupStep: 'resp',
    people: { ana: { name: 'Ana' }, bruno: { name: 'Bruno' }, carla: { name: 'Carla' } },
    members: [{ pid: 'ana', status: 'ativo', elig: true }, { pid: 'bruno', status: 'ativo', elig: true }, { pid: 'carla', status: 'ativo', elig: true }],
    link: { active: true, code: 'x' },
    assets: [{ id: 'a1', name: 'Logo', type: 'marca', cat: 'Marca', st: 'ok' }],
    answers: {
      ana: { a1: sent({ notas: { ana: 10, bruno: 0, carla: 6 }, titular: ['ana'] }) },
      bruno: { a1: sent({ notas: { ana: 10, bruno: 0, carla: 6 }, titular: ['ana'] }) },
      carla: { a1: sent({ notas: { ana: 10, bruno: 0, carla: 6 }, titular: ['ana', 'carla'] }) }
    },
    proposal: {}, comments: [], versions: [], history: [], memorials: []
  };
}

test('respostas iguais convergem e diferentes divergem', () => {
  const p = demo();
  assert.equal(itemStatus(p, 'a1', 'uso').status, 'conv');
  assert.equal(itemStatus(p, 'a1', 'titular').status, 'div');
  assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
});

test('decisão passa só pelos pontos divergentes antes da revisão', () => {
  const p = demo();
  assert.deepEqual(dsteps(p, p.assets[0]), ['titular', 'review']);
  p.answers.carla.a1 = p.answers.ana.a1;
  assert.deepEqual(dsteps(p, p.assets[0]), ['review']);
});

test('proposta inicial traz só o que todos responderam igual', () => {
  const p = demo(), pr = propDefault(p, 'a1');
  assert.equal(pr.v.uso, 'Só quem for dono');
  assert.deepEqual(pr.v.titular, []);
  assert.match(propError({ ...p, proposal: { a1: pr } }, 'a1'), /Titularidade pretendida/);
});

test('percentuais combinados precisam somar 100', () => {
  const p = demo(), pr = propDefault(p, 'a1');
  pr.v.titular = ['ana', 'carla']; pr.v.divisao = PCT_SIM; pr.percentual = { ana: 60, carla: 30 };
  p.proposal.a1 = pr;
  assert.match(propError(p, 'a1'), /100%/);
  pr.percentual.carla = 40;
  assert.equal(propError(p, 'a1'), null);
});

test('participação percebida é a média das respostas', () => {
  const pt = partOf(demo(), 'a1');
  assert.equal(pt.avg.ana, 10);
  assert.equal(pt.share.ana, 63);
});

test('envio exige todas as perguntas', () => {
  const p = demo(), d = { notas: { ana: 3 } };
  const err = sendErrors(p, 'ana', approved(p)[0], d);
  assert.ok(err['a1:notas'] && err['a1:origem'] && err['a1:desc']);
});

test('próxima tarefa de quem organiza depois da recusa', () => {
  const p = demo();
  p.versions.push({ n: 1, at: 1, snap: snapshot(p), conf: { bruno: { v: 'no', comment: 'Ajustar', assets: ['a1'], at: 2 } } });
  assert.equal(taskFor(p, 'ana').label, 'Ajustar a proposta');
  assert.equal(taskFor(p, 'bruno').label, 'Sua recusa foi enviada');
  assert.equal(taskFor(p, 'carla').label, 'A proposta voltou para ajuste');
});

test('registro do acordo lista participantes e pendências', () => {
  const p = demo(); p.phase = 'consolidado';
  p.versions.push({ n: 1, at: 1, snap: snapshot(p), conf: {} });
  const body = memorialBody(p, Date.UTC(2026, 9, 27, 15));
  assert.match(body, /PARTICIPANTES/);
  assert.match(body, /percentuais ainda não negociados/);
});

test('pergunta sem resposta (enviada antes de existir) fica pendente, não convergente', () => {
  const p = demo();
  Object.values(p.answers).forEach(x => { delete x.a1.sent.materiais; });
  assert.equal(itemStatus(p, 'a1', 'materiais').status, 'pend');
  assert.equal(propDefault(p, 'a1').v.materiais, '');
});
