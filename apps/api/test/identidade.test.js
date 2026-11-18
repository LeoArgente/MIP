/* A aba que ainda mostra uma pessoa não lê nem grava em nome de outra.
   O cookie é do navegador, não da aba: depois de trocar de conta em outra aba, a aba antiga continua mandando
   pedidos, agora com o cookie da conta nova. Sem a checagem, o rascunho que a aba do Bruno salvava sozinho era
   gravado como resposta da Carla (autoria falsa no registro do acordo). O apps/web manda em todo pedido quem a tela
   acha que é (cabeçalho X-MIP-Pessoa); o `auth` do server.ts recusa com 409 quando não é a pessoa da sessão.
   Precisa do servidor rodando com TEST_LOGIN=1 (como a CI). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API || 'http://localhost:3001';
/* Um navegador: um cookie só, trocado a cada entrada, como nas abas de verdade. */
function navegador() {
  let cookie = '';
  const call = async (method, path, body, pessoa) => {
    const headers = { 'content-type': 'application/json', cookie, ...(pessoa !== undefined ? { 'X-MIP-Pessoa': pessoa } : {}) };
    const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const s of r.headers.getSetCookie()) { const kv = s.split(';')[0]; if (!kv.endsWith('=')) cookie = kv; }
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };
  return { get: (p, pessoa) => call('GET', p, undefined, pessoa), post: (p, b, pessoa) => call('POST', p, b || {}, pessoa) };
}
const act = (c, pid, type, body, pessoa) => c.post(`/api/projects/${pid}/actions/${type}`, body, pessoa);

/* Projeto em coleta com uma criação; Bruno e Carla participam e ainda não responderam. */
async function emColeta() {
  const at = String.fromCharCode(64), tag = 'idt' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const email = n => `${n}.${tag}${at}teste.local`, org = navegador();
  assert.equal((await org.post('/api/auth/test-login', { name: 'Org', email: email('org') })).status, 200);
  const { data: { id } } = await org.post('/api/projects', { person: 'Org', name: 'Identidade ' + tag });
  for (const n of ['bruno', 'carla']) assert.equal((await org.post(`/api/projects/${id}/invite`, { email: email(n) })).status, 200);
  await act(org, id, 'setupnext');
  await act(org, id, 'addasset', { type: 'codigo', name: 'App' });
  await act(org, id, 'setupnext');
  await act(org, id, 'sobre', { sobre: { contas: 'Com a Org', acordo: 'Nenhum', edital: 'Não' } });
  assert.equal((await act(org, id, 'setupassets')).status, 200);
  const aid = (await org.get('/api/projects/' + id)).data.assets[0].id;
  return { id, aid, email };
}

test('rascunho salvo pela aba que ainda é do Bruno, com o cookie já da Carla: recusado, nada gravado em ninguém', async () => {
  const { id, aid, email } = await emColeta();
  const nav = navegador(), bruno = navegador();
  /* Aba A: entra como Bruno e carrega quem é (é o que session.jsx faz com /api/me). */
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Bruno', email: email('bruno') })).status, 200);
  const brunoId = (await nav.get('/api/me')).data.id;
  assert.equal((await bruno.post('/api/auth/test-login', { name: 'Bruno', email: email('bruno') })).status, 200);
  /* Aba B, mesmo navegador: entra como Carla. O cookie passa a ser dela nas duas abas. */
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Carla', email: email('carla') })).status, 200);
  const carlaId = (await nav.get('/api/me')).data.id;
  assert.notEqual(carlaId, brunoId);

  /* Aba A salva o rascunho (flush), dizendo que é o Bruno. */
  const r = await act(nav, id, 'draft', { aid, draft: { desc: 'Escrito na aba do Bruno' } }, brunoId);
  assert.equal(r.status, 409);
  assert.match(r.data.err._, /outra conta/);

  /* Nada foi gravado: nem na Carla (a sessão), nem no Bruno (a tela). */
  const vc = (await nav.get('/api/projects/' + id, carlaId)).data, vb = (await bruno.get('/api/projects/' + id, brunoId)).data;
  assert.equal(vc.answers[carlaId]?.[aid]?.draft?.desc ?? '', '');
  assert.equal(vb.answers[brunoId]?.[aid]?.draft?.desc ?? '', '');
});

test('com o cabeçalho certo, ou sem cabeçalho, o rascunho grava na pessoa da sessão como antes', async () => {
  const { id, aid, email } = await emColeta();
  const nav = navegador();
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Carla', email: email('carla') })).status, 200);
  const carlaId = (await nav.get('/api/me')).data.id;
  assert.equal((await act(nav, id, 'draft', { aid, draft: { desc: 'Com cabeçalho' } }, carlaId)).status, 200);
  assert.equal((await nav.get('/api/projects/' + id, carlaId)).data.answers[carlaId][aid].draft.desc, 'Com cabeçalho');
  assert.equal((await act(nav, id, 'draft', { aid, draft: { desc: 'Sem cabeçalho' } })).status, 200);
  assert.equal((await nav.get('/api/projects/' + id)).data.answers[carlaId][aid].draft.desc, 'Sem cabeçalho');
});

test('leitura também é recusada; /api/me não exige o cabeçalho; sem sessão continua 401', async () => {
  const { id, email } = await emColeta();
  const nav = navegador();
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Bruno', email: email('bruno') })).status, 200);
  const brunoId = (await nav.get('/api/me')).data.id;
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Carla', email: email('carla') })).status, 200);

  /* A aba do Bruno não recebe o projeto montado para a Carla, nem a lista de projetos dela. */
  assert.equal((await nav.get('/api/projects/' + id, brunoId)).status, 409);
  assert.equal((await nav.get('/api/projects', brunoId)).status, 409);
  /* /api/me é o que a aba usa para descobrir quem é: responde a sessão, com ou sem cabeçalho velho. */
  const me = await nav.get('/api/me', brunoId);
  assert.equal(me.status, 200);
  assert.equal(me.data.name, 'Carla');
  /* Sem sessão é "entre na sua conta" (401), não "recarregue" (409), mesmo com cabeçalho. */
  assert.equal((await navegador().get('/api/projects/' + id, brunoId)).status, 401);
});

test('feedback (rota pública que grava quem enviou) também recusa a identidade divergente', async () => {
  const { email } = await emColeta();
  const nav = navegador();
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Bruno', email: email('bruno') })).status, 200);
  const brunoId = (await nav.get('/api/me')).data.id;
  assert.equal((await nav.post('/api/auth/test-login', { name: 'Carla', email: email('carla') })).status, 200);
  assert.equal((await nav.post('/api/feedback', { kind: 'texto', text: 'Da aba do Bruno' }, brunoId)).status, 409);
});
