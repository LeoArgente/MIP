/* Confirmação de uma versão: quem confirma é a equipe congelada no envio, e ela não muda no meio da confirmação.
   Cenário do travamento (antes desta regra): todos confirmavam menos uma pessoa, quem organiza a tirava das
   respostas, e ninguém mais conseguia se posicionar; o projeto ficava em confirmação para sempre.
   Precisa do servidor rodando com TEST_LOGIN=1 (como a CI). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QS } from '@mip/domain';

const BASE = process.env.API || 'http://localhost:3001';
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const s of r.headers.getSetCookie()) { const kv = s.split(';')[0]; if (!kv.endsWith('=')) cookie = kv; }
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };
  return { get: p => call('GET', p), post: (p, b) => call('POST', p, b || {}) };
}
const act = (c, pid, type, body) => c.post(`/api/projects/${pid}/actions/${type}`, body);

/* Projeto de três pessoas (Org, Bia, Caio) em confirmação da proposta 1, com todos tendo respondido. */
async function emConfirmacao() {
  const at = String.fromCharCode(64), tag = 'conf' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const org = client(), bia = client(), caio = client(), email = n => `${n}.${tag}${at}teste.local`;
  assert.equal((await org.post('/api/auth/test-login', { name: 'Org', email: email('org') })).status, 200);
  const { data: { id } } = await org.post('/api/projects', { person: 'Org', name: 'Confirmação ' + tag });
  for (const n of ['bia', 'caio']) assert.equal((await org.post(`/api/projects/${id}/invite`, { email: email(n) })).status, 200);
  await act(org, id, 'setupnext');
  await act(org, id, 'addasset', { type: 'codigo', name: 'App' });
  await act(org, id, 'setupnext');
  await act(org, id, 'sobre', { sobre: { contas: 'Com a Org', acordo: 'Nenhum', edital: 'Não' } });
  assert.equal((await act(org, id, 'setupassets')).status, 200);
  assert.equal((await bia.post('/api/auth/test-login', { name: 'Bia', email: email('bia') })).status, 200);
  assert.equal((await caio.post('/api/auth/test-login', { name: 'Caio', email: email('caio') })).status, 200);

  const vo = (await org.get('/api/projects/' + id)).data, aid = vo.assets[0].id, ids = vo.members.map(m => m.pid);
  const pidOf = n => vo.members.find(m => vo.people[m.pid].email === email(n)).pid;
  const draft = { notas: Object.fromEntries(ids.map(x => [x, 6])), origem: 'Criada neste projeto', titularAtual: 'Não sei', titular: [vo.org], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', materiais: 'Só o que a própria pessoa fez', comercial: 'Sim', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', desc: 'fiz', link: '' };
  for (const c of [org, bia, caio]) {
    assert.equal((await act(c, id, 'draft', { aid, draft })).status, 200);
    const r = await act(c, id, 'qsend', { aid });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  assert.equal((await act(org, id, 'closeok')).data.project.phase, 'decisao');
  const pr = (await org.get('/api/projects/' + id)).data.proposal[aid], v = {};
  for (const q of Object.keys(pr.v)) if (!pr.v[q] || (Array.isArray(pr.v[q]) && !pr.v[q].length)) v[q] = q === 'titular' ? [vo.org] : QS[q].opts[0];
  await act(org, id, 'propdraft', { aid, prop: { v } });
  let r = await act(org, id, 'saveprop', { aid });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await act(org, id, 'sendv');
  assert.equal(r.data.project.phase, 'confirmacao');
  return { id, org, bia, caio, caioId: pidOf('caio') };
}

test('travamento: tirar das respostas é recusado durante a confirmação, e a confirmação fecha com todos da versão', async () => {
  const { id, org, bia, caio, caioId } = await emConfirmacao();
  assert.equal((await act(org, id, 'conf', { n: 1 })).status, 200);
  assert.equal((await act(bia, id, 'conf', { n: 1 })).status, 200);

  /* Era aqui que o projeto travava: Caio saía do conjunto e ninguém mais podia se posicionar. */
  let r = await act(org, id, 'naopart', { pid: caioId });
  assert.equal(r.status, 400);
  assert.match(r.data.err.np, /durante a confirmação/);
  const p = (await org.get('/api/projects/' + id)).data;
  assert.equal(p.phase, 'confirmacao');
  assert.equal(p.members.find(m => m.pid === caioId).status, 'ativo', 'nada mudou na equipe');

  r = await act(caio, id, 'conf', { n: 1 });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.project.phase, 'consolidado');

  r = await act(org, id, 'genmem');
  const L = r.data.project.memorials[0].body.split('\n');
  assert.equal(L[2], 'Situação da proposta 1: confirmada por todos');
  const i = L.indexOf('CONFIRMAÇÕES DA PROPOSTA 1');
  assert.deepEqual(L.slice(i + 1, i + 4).map(l => l.replace(/ em .*$/, '')), ['- Org: confirmou', '- Bia: confirmou', '- Caio: confirmou']);
});

test('depois de fechada a versão, tirar das respostas volta a valer e quem confirmou continua nas confirmações', async () => {
  const { id, org, bia, caio, caioId } = await emConfirmacao();
  for (const c of [org, bia, caio]) assert.equal((await act(c, id, 'conf', { n: 1 })).status, 200);
  const r = await act(org, id, 'naopart', { pid: caioId });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const L = (await act(org, id, 'genmem')).data.project.memorials[0].body.split('\n');
  assert.equal(L[2], 'Situação da proposta 1: confirmada por todos');
  assert.ok(L.some(l => /^- Caio: confirmou em /.test(l)), 'Caio continua nas confirmações');
});
