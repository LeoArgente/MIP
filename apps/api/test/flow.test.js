/* Percorre a jornada inteira pela API, como pessoas diferentes.
   Precisa do servidor rodando com DEV_LOGIN=1 e do cenário de demonstração (npm run db:seed). */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API || 'http://localhost:3001';
function client() {
  let cookie = '';
  const call = async (method, path, body) => {
    const r = await fetch(BASE + path, { method, headers: { 'content-type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
    for (const s of r.headers.getSetCookie()) { const kv = s.split(';')[0]; if (!kv.endsWith('=')) cookie = kv; }
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };
  return { get: p => call('GET', p), post: (p, b) => call('POST', p, b || {}), patch: (p, b) => call('PATCH', p, b) };
}
async function as(email) {
  const c = client(), users = (await c.get('/api/dev/users')).data, u = users.find(x => x.email === email);
  await c.post('/api/dev/login', { id: u.id });
  return { c, u };
}
const act = (c, pid, type, body) => c.post(`/api/projects/${pid}/actions/${type}`, body);

/* Roda antes da jornada, enquanto o App Rotas do cenário ainda está na coleta. */
test('nomes herdados de Object não viram ação nem devolvem o projeto cru', async () => {
  const ana = await as('ana@demo.mip'), bruno = await as('bruno@demo.mip');
  const pa = (await ana.c.get('/api/projects')).data.find(x => x.name === 'App Rotas');
  const pid = pa.id;
  const va = (await ana.c.get('/api/projects/' + pid)).data;
  assert.equal(va.phase, 'coleta');
  const textos = Object.values(va.answers[ana.u.id]).map(a => a.sent?.desc).filter(Boolean);
  assert.ok(textos.length, 'a Ana precisa ter enviado respostas com texto no cenário');

  for (const nome of ['constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
    const r = await act(bruno.c, pid, nome);
    assert.equal(r.status, 404, nome + ' deve ser ação desconhecida');
    const json = JSON.stringify(r.data);
    for (const t of textos) assert.ok(!json.includes(t), nome + ' não pode devolver o texto que a Ana enviou');
    assert.equal(r.data.result, undefined, nome);
  }
});

test('jornada completa com privacidade, decisão, recusa e confirmação', async () => {
  const ana = await as('ana@demo.mip'), bruno = await as('bruno@demo.mip'), carla = await as('carla@demo.mip');
  const pid = (await ana.c.get('/api/projects')).data.find(x => x.name === 'App Rotas').id;

  /* Privacidade: Bruno não recebe o conteúdo das respostas da Ana. */
  let pb = (await bruno.c.get('/api/projects/' + pid)).data;
  const anaAns = Object.values(pb.answers[ana.u.id]);
  assert.ok(anaAns.every(a => !a.draft && (!a.sent || Object.keys(a.sent).join() === 'at')));
  assert.equal(pb.stats, undefined);
  assert.equal(pb.link.code, undefined);

  /* Quem não organiza não encerra as respostas. */
  assert.equal((await act(bruno.c, pid, 'closeok')).status, 403);

  /* Bruno termina o Backend; Carla responde as duas criações. */
  const [logo, back] = pb.assets;
  const full = me => ({ notas: { [ana.u.id]: 6, [bruno.u.id]: 10, [carla.u.id]: 3 }, origem: 'Criada neste projeto', titularAtual: 'Não sei', titular: [ana.u.id, bruno.u.id], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', materiais: 'Só o que a própria pessoa fez', comercial: 'Sim', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', marcaRegistro: 'Sim, com evidência', desc: 'Parte de ' + me, link: '' });
  let r = await act(bruno.c, pid, 'qsend', { aid: back.id });
  assert.equal(r.status, 400, 'envio incompleto deve falhar');
  assert.ok(r.data.err[back.id + ':origem']);
  assert.equal((await act(bruno.c, pid, 'draft', { aid: back.id, draft: full('Bruno') })).status, 200);
  assert.equal((await act(bruno.c, pid, 'qsend', { aid: back.id })).status, 200);
  for (const a of [logo, back]) {
    await act(carla.c, pid, 'draft', { aid: a.id, draft: { ...full('Carla'), uso: a.id === logo.id ? 'Qualquer pessoa que participou' : 'Só quem for dono' } });
    assert.equal((await act(carla.c, pid, 'qsend', { aid: a.id })).status, 200);
  }

  /* Ana encerra; a partir daqui a equipe vê quem escolheu o quê. */
  r = await act(ana.c, pid, 'closeok');
  assert.equal(r.status, 200);
  assert.equal(r.data.project.phase, 'decisao');
  const st = r.data.project.stats[back.id].titular;
  assert.ok(st.vals.length && st.vals.every(v => typeof v.pid === 'string'), 'cada resposta chega com o autor');
  for (const who of [bruno, carla]) assert.deepEqual(st.vals.find(v => v.pid === who.u.id)?.v, [ana.u.id, bruno.u.id], 'resposta de ' + who.u.email + ' com o autor');
  pb = (await bruno.c.get('/api/projects/' + pid)).data;
  assert.ok(Object.values(pb.answers[carla.u.id]).every(a => !a.draft));

  /* Respostas não mudam depois de encerradas. */
  assert.equal((await act(carla.c, pid, 'draft', { aid: logo.id, draft: { desc: 'x' } })).status, 403);

  /* Ana decide as duas criações e envia. */
  for (const a of [logo, back]) {
    const pa = (await ana.c.get('/api/projects/' + pid)).data, pr = pa.proposal[a.id];
    const v = {}; for (const q of Object.keys(pr.v)) if (!pr.v[q] || (Array.isArray(pr.v[q]) && !pr.v[q].length)) v[q] = q === 'titular' ? [ana.u.id] : (q === 'divisao' ? 'Não se aplica a esta criação' : 'Não sei');
    await act(ana.c, pid, 'propdraft', { aid: a.id, prop: { v } });
    r = await act(ana.c, pid, 'saveprop', { aid: a.id });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  }
  assert.equal((await act(ana.c, pid, 'sendv')).data.project.phase, 'confirmacao');

  /* Bruno recusa pedindo ajuste no Backend: volta para decisão e só o Backend reabre. */
  assert.equal((await act(bruno.c, pid, 'refuse', { n: 1, assets: [], comment: '' })).status, 400);
  r = await act(bruno.c, pid, 'refuse', { n: 1, assets: [back.id], comment: 'Divisão do Backend' });
  assert.equal(r.data.project.phase, 'decisao');
  assert.equal(r.data.project.proposal[back.id].saved, false);
  assert.equal(r.data.project.proposal[logo.id].saved, true);

  /* Ana ajusta e envia a proposta 2; todos confirmam. */
  await act(ana.c, pid, 'propdraft', { aid: back.id, prop: { v: { uso: 'Qualquer pessoa que participou' } } });
  assert.equal((await act(ana.c, pid, 'saveprop', { aid: back.id })).status, 200);
  r = await act(ana.c, pid, 'sendv');
  assert.equal(r.data.project.versions.length, 2);
  for (const who of [ana, bruno, carla]) r = await act(who.c, pid, 'conf', { n: 2 });
  assert.equal(r.data.project.phase, 'consolidado');

  /* Registro do acordo. */
  r = await act(carla.c, pid, 'genmem');
  const m = r.data.project.memorials[0];
  assert.match(m.body, /CONFIRMAÇÕES DA PROPOSTA 2/);
});

test('durante a coleta, ninguém recebe o conteúdo nem o autor das respostas de outra pessoa', async () => {
  const at = String.fromCharCode(64), org = client(), par = client();
  await org.post('/api/auth/test-login', { name: 'Org Coleta', email: 'org.coleta' + at + 'teste.local' });
  const { data: { id } } = await org.post('/api/projects', { person: 'Org Coleta', name: 'Coleta Teste' });
  await org.post(`/api/projects/${id}/invite`, { email: 'par.coleta' + at + 'teste.local' });
  await act(org, id, 'setupnext');
  await act(org, id, 'addasset', { type: 'codigo', name: 'App' });
  await act(org, id, 'setupnext');
  await act(org, id, 'sobre', { sobre: { contas: 'Domínio com a Org', acordo: 'Nenhum', edital: 'Não' } });
  assert.equal((await act(org, id, 'setupassets')).status, 200);
  await par.post('/api/auth/test-login', { name: 'Par Coleta', email: 'par.coleta' + at + 'teste.local' });

  /* Quem organiza envia uma resposta completa com um texto marcado. */
  const vo = (await org.get('/api/projects/' + id)).data, aid = vo.assets[0].id, orgId = vo.org, parId = vo.members.find(m => m.pid !== orgId).pid;
  const SEGREDO = 'segredo-da-org-' + Date.now();
  await act(org, id, 'draft', { aid, draft: { notas: { [orgId]: 7, [parId]: 4 }, origem: 'Criada neste projeto', titularAtual: 'Não sei', titular: [orgId], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', materiais: 'Só o que a própria pessoa fez', comercial: 'Sim', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', marcaRegistro: 'Sim, com evidência', desc: SEGREDO, link: '' } });
  const sent = await act(org, id, 'qsend', { aid });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));

  /* A outra pessoa recebe só o marcador de "já enviou": nada do conteúdo, nada de vals com autor. */
  const r = await par.get('/api/projects/' + id);
  assert.equal(r.status, 200);
  const vp = r.data;
  assert.equal(vp.phase, 'coleta');
  assert.deepEqual(Object.keys(vp.answers[orgId][aid]), ['sent']);
  assert.deepEqual(Object.keys(vp.answers[orgId][aid].sent), ['at']);
  assert.equal(vp.stats, undefined);
  assert.equal(vp.parts, undefined);
  const json = JSON.stringify(vp);
  assert.ok(!json.includes(SEGREDO), 'o conteúdo da resposta não pode chegar a outra pessoa');
  assert.ok(!json.includes('"vals"'), 'nenhuma lista de respostas com autor durante a coleta');
});

test('sobre o projeto, sobre você e privacidade do perfil', async () => {
  const at = String.fromCharCode(64), org = client(), outro = client();
  await org.post('/api/auth/test-login', { name: 'Org Sobre', email: 'org.sobre' + at + 'teste.local' });
  const { data: { id } } = await org.post('/api/projects', { person: 'Org Sobre', name: 'Sobre Teste' });
  await org.post(`/api/projects/${id}/invite`, { email: 'par.sobre' + at + 'teste.local' });
  assert.equal((await act(org, id, 'setupnext')).status, 200);
  assert.equal((await act(org, id, 'setupnext')).status, 400, 'sem criação não avança');
  await act(org, id, 'addasset', { type: 'codigo', name: 'App' });
  assert.equal((await act(org, id, 'setupnext')).data.project.setupStep, 'sobre');
  let r = await act(org, id, 'setupassets');
  assert.equal(r.status, 400); assert.ok(r.data.err['sobre:contas'] && r.data.err['sobre:edital']);
  await act(org, id, 'sobre', { sobre: { contas: 'Domínio com a Org', acordo: 'Nenhum', edital: 'Sim', editalQual: 'Regulamento' } });
  assert.equal((await act(org, id, 'setupassets')).data.project.setupStep, 'resp');
  await outro.post('/api/auth/test-login', { name: 'Par', email: 'par.sobre' + at + 'teste.local' });
  assert.equal((await act(outro, id, 'sobre', { sobre: { acordo: 'Escrito' } })).status, 403, 'só quem organiza responde sobre o projeto');
  r = await act(outro, id, 'perfil', { perfil: { funcao: 'Design' }, check: true });
  assert.equal(r.status, 400);
  await act(outro, id, 'perfil', { perfil: { funcao: 'Design', investiu: 'Sim' } });
  const vOrg = (await org.get('/api/projects/' + id)).data, par = vOrg.members.find(m => m.pid !== vOrg.org);
  assert.equal(par.perfil.funcao, undefined, 'função escondida durante as respostas');
  assert.equal(par.perfil.feito, true);
  assert.equal(vOrg.sobre.editalQual, 'Regulamento');
});
