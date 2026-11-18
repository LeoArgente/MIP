/* Quem não participa de um projeto não recebe nada dele, por nenhuma rota.
   A lista de rotas não é escrita à mão: o teste registra as rotas reais (auth.js e modules/) num app Express sem banco
   e lê do roteador todas as que têm parâmetro. Uma rota nova com :id entra no teste sozinha; uma rota com um parâmetro
   que o teste não conhece faz o teste falhar até ser classificada abaixo.
   Precisa do servidor rodando com TEST_LOGIN=1 (como a CI) e do build da API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { routes as authRoutes } from '../dist/auth.js';
import { routes as moduleRoutes, ACTIONS } from '../dist/modules/index.js';

const BASE = process.env.API || 'http://localhost:3001';
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const s of r.headers.getSetCookie()) { const kv = s.split(';')[0]; if (!kv.endsWith('=')) cookie = kv; }
    const text = await r.text();
    return { status: r.status, text, data: (() => { try { return JSON.parse(text); } catch { return {}; } })() };
  };
  return { get: p => call('GET', p), post: (p, b) => call('POST', p, b || {}), patch: (p, b) => call('PATCH', p, b) };
}
const act = (c, pid, type, body) => c.post(`/api/projects/${pid}/actions/${type}`, body);

/* Todas as rotas registradas por auth.js e modules/, com todas as opções ligadas (DEV_LOGIN, TEST_LOGIN, FEEDBACK). */
function rotasRegistradas() {
  const app = express(), passa = (_req, _res, next) => next();
  const ctx = { prisma: {}, wrap: fn => fn, auth: passa, prod: false, devLogin: true, testLogin: true, feedbackOn: true, isAdmin: () => false };
  authRoutes(app, ctx);
  moduleRoutes(app, ctx);
  return app._router.stack.filter(l => l.route).flatMap(l => Object.keys(l.route.methods).map(m => ({ method: m.toUpperCase(), path: l.route.path })));
}

/* Parâmetros de rota que o teste sabe preencher. :id e :projectId recebem o id do projeto (em /admin/feedback/image/:id
   o id é de imagem, mas a rota entra igual: não pode devolver nada do projeto). :type vira cada ação registrada. */
const PARAMS_DO_PROJETO = new Set(['id', 'projectId']);
/* Rotas com parâmetro que ficam de fora, e por quê. */
const FORA = {
  'GET /api/invite/:code': 'pública por desenho: quem tem o código vê o nome do projeto e de quem organiza, para decidir se entra',
  'POST /api/invite/:code/join': 'é como alguém que não participa passa a participar'
};
/* Rotas que respondem 200 a quem não participa sem devolver nada do projeto. */
const RESPONDE_SEM_DADO = {
  'GET /api/feedback/satisfaction/:projectId': 'devolve só a nota que a própria pessoa deu ({ rating: null } para quem não deu)'
};

test('quem não participa não recebe nada do projeto por nenhuma rota com :id, nem muda o projeto', async () => {
  const at = String.fromCharCode(64), tag = 'sigilo' + Date.now().toString(36);
  const org = client(), par = client(), fora = client();
  const orgEmail = `org.${tag}${at}teste.local`, parEmail = `par.${tag}${at}teste.local`;

  /* Um projeto com um texto marcado em cada lugar que guarda dado: nome, contexto, pessoas, criação, sobre, resposta e comentário. */
  assert.equal((await org.post('/api/auth/test-login', { name: 'Org ' + tag, email: orgEmail })).status, 200);
  const { data: { id } } = await org.post('/api/projects', { person: 'Org ' + tag, name: 'Projeto ' + tag, context: 'Contexto ' + tag });
  assert.ok(id);
  assert.equal((await org.post(`/api/projects/${id}/invite`, { email: parEmail })).status, 200);
  assert.equal((await act(org, id, 'addasset', { type: 'codigo', name: 'Criacao ' + tag, desc: 'Descricao ' + tag })).status, 200);
  assert.equal((await act(org, id, 'sobre', { sobre: { contas: 'Contas ' + tag } })).status, 200);
  assert.equal((await par.post('/api/auth/test-login', { name: 'Par ' + tag, email: parEmail })).status, 200);
  let vOrg = (await org.get('/api/projects/' + id)).data;
  const aid = vOrg.assets[0].id, parId = vOrg.members.find(m => m.pid !== vOrg.org).pid;
  assert.equal((await act(par, id, 'draft', { aid, draft: { desc: 'Resposta ' + tag } })).status, 200);
  assert.equal((await act(org, id, 'comment', { aid, text: 'Comentario ' + tag })).status, 200);

  vOrg = (await org.get('/api/projects/' + id)).data;
  const marcas = ['Projeto ' + tag, 'Contexto ' + tag, 'Org ' + tag, 'Par ' + tag, orgEmail, parEmail, 'Criacao ' + tag, 'Descricao ' + tag, 'Contas ' + tag, 'Resposta ' + tag, 'Comentario ' + tag, vOrg.link.code, aid, parId, vOrg.org];
  /* As marcas estão mesmo no projeto: a resposta da Par só chega para ela. */
  const vPar = (await par.get('/api/projects/' + id)).data;
  for (const m of marcas) assert.ok(JSON.stringify(vOrg).includes(m) || JSON.stringify(vPar).includes(m), 'marca ausente do projeto: ' + m);

  assert.equal((await fora.post('/api/auth/test-login', { name: 'Fora ' + tag, email: `fora.${tag}${at}teste.local` })).status, 200);
  const corpo = { email: `novo.${tag}${at}teste.local`, pid: parId, aid, n: 1, confirm: true, check: true, text: 'intruso', name: 'intruso', type: 'codigo', draft: { desc: 'intruso' }, sobre: { contas: 'intruso' }, perfil: { funcao: 'intruso' }, prop: {}, assets: [aid] };

  const chamadas = [];
  for (const r of rotasRegistradas()) {
    const params = [...r.path.matchAll(/:(\w+)/g)].map(m => m[1]);
    if (!params.length) continue;
    const chave = r.method + ' ' + r.path;
    if (Object.hasOwn(FORA, chave)) continue;
    const desconhecidos = params.filter(p => !PARAMS_DO_PROJETO.has(p) && p !== 'type');
    assert.deepEqual(desconhecidos, [], `${chave}: parâmetro que o teste não sabe preencher; classifique a rota neste teste`);
    const base = r.path.replace(/:(id|projectId)\b/g, id);
    const tipos = params.includes('type') ? Object.keys(ACTIONS) : [null];
    for (const t of tipos) chamadas.push({ chave, method: r.method, path: t ? base.replace(':type', t) : base });
  }
  /* As rotas que este teste existe para cobrir estão na lista. */
  for (const k of ['GET /api/projects/:id', 'POST /api/projects/:id/invite', 'POST /api/projects/:id/remove', 'POST /api/projects/:id/remind', 'POST /api/projects/:id/actions/:type']) {
    assert.ok(chamadas.some(c => c.chave === k), 'rota não encontrada no roteador: ' + k);
  }
  assert.equal(chamadas.filter(c => c.chave === 'POST /api/projects/:id/actions/:type').length, Object.keys(ACTIONS).length);

  for (const c of chamadas) {
    const r = c.method === 'GET' ? await fora.get(c.path) : c.method === 'PATCH' ? await fora.patch(c.path, corpo) : await fora.post(c.path, corpo);
    const onde = `${c.method} ${c.path}`;
    for (const m of marcas) assert.ok(!r.text.includes(m), `${onde} devolveu dado do projeto (${m}): ${r.text.slice(0, 300)}`);
    if (Object.hasOwn(RESPONDE_SEM_DADO, c.chave)) continue;
    assert.ok(r.status >= 400 && r.status < 500, `${onde} respondeu ${r.status} a quem não participa`);
  }

  /* Nada mudou no projeto (o histórico também entra na comparação). */
  assert.deepEqual((await org.get('/api/projects/' + id)).data, vOrg, 'quem não participa conseguiu mudar o projeto');
});
