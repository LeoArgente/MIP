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
  const full = me => ({ notas: { [ana.u.id]: 6, [bruno.u.id]: 10, [carla.u.id]: 3 }, origem: 'Criada neste projeto', titularAtual: 'Ainda não sabemos', titular: [ana.u.id, bruno.u.id], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', comercial: 'Sim', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', marcaRegistro: 'Sim, com evidência', desc: 'Parte de ' + me, link: '' });
  let r = await act(bruno.c, pid, 'qsend', { aid: back.id });
  assert.equal(r.status, 400, 'envio incompleto deve falhar');
  assert.ok(r.data.err[back.id + ':origem']);
  assert.equal((await act(bruno.c, pid, 'draft', { aid: back.id, draft: full('Bruno') })).status, 200);
  assert.equal((await act(bruno.c, pid, 'qsend', { aid: back.id })).status, 200);
  for (const a of [logo, back]) {
    await act(carla.c, pid, 'draft', { aid: a.id, draft: { ...full('Carla'), uso: a.id === logo.id ? 'Qualquer pessoa que participou' : 'Só quem for dono' } });
    assert.equal((await act(carla.c, pid, 'qsend', { aid: a.id })).status, 200);
  }

  /* Ana encerra; as estatísticas chegam sem autor. */
  r = await act(ana.c, pid, 'closeok');
  assert.equal(r.status, 200);
  assert.equal(r.data.project.phase, 'decisao');
  const st = r.data.project.stats[back.id].titular;
  assert.ok(st.vals.every(v => !('pid' in v)));
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

  /* Registro do acordo e verificação do código. */
  r = await act(carla.c, pid, 'genmem');
  const m = r.data.project.memorials[0];
  assert.match(m.body, /CONFIRMAÇÕES DA PROPOSTA 2/);
  const ok = (await carla.c.post('/api/verify', { text: m.body + '\n\nCódigo de verificação (SHA-256): ' + m.hash })).data;
  assert.equal(ok.ok, true);
  const bad = (await carla.c.post('/api/verify', { text: m.body.replace('Projeto', 'Projeto alterado') })).data;
  assert.equal(bad.ok, false);
});
