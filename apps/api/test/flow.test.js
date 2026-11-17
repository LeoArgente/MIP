/* Percorre a jornada inteira pela API, como pessoas diferentes.
   Precisa do servidor rodando com DEV_LOGIN=1 e do cenário de demonstração (npm run db:seed). */
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
    const v = {}; for (const q of Object.keys(pr.v)) if (!pr.v[q] || (Array.isArray(pr.v[q]) && !pr.v[q].length)) v[q] = q === 'titular' ? [ana.u.id] : (q === 'divisao' ? 'Não se aplica a esta criação' : (QS[q].opts.includes('Não sei') ? 'Não sei' : QS[q].opts[0]));
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

/* Fronteira de entrada: draft e propdraft conferem o formato de cada valor e recusam (400, erro por campo)
   em vez de gravar o que veio. */
async function projetoSozinho(nome) {
  const at = String.fromCharCode(64), org = client(), tag = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  await org.post('/api/auth/test-login', { name: 'Org Formato', email: 'org.formato.' + tag + at + 'teste.local' });
  const { data: { id } } = await org.post('/api/projects', { person: 'Org Formato', name: nome });
  await act(org, id, 'setupnext');
  await act(org, id, 'addasset', { type: 'codigo', name: 'App' });
  await act(org, id, 'setupnext');
  await act(org, id, 'sobre', { sobre: { contas: 'Domínio com a Org', acordo: 'Nenhum', edital: 'Não' } });
  assert.equal((await act(org, id, 'setupassets')).status, 200);
  const v = (await org.get('/api/projects/' + id)).data;
  return { org, id, aid: v.assets[0].id, me: v.org };
}
const respostaCompleta = me => ({ notas: { [me]: 10 }, origem: 'Criada neste projeto', titularAtual: 'Não sei', titular: [me], divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', materiais: 'Só o que a própria pessoa fez', comercial: 'Sim', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', desc: 'Fiz o app', link: '' });

test('draft recusa valor em formato errado e não grava nada', async () => {
  const { org, id, aid, me } = await projetoSozinho('Formato Draft');
  const meu = async () => (await org.get('/api/projects/' + id)).data.answers[me]?.[aid];

  /* Criação ainda sem resposta: o rascunho errado não cria nem a entrada. */
  let r = await act(org, id, 'draft', { aid, draft: { titular: me, desc: 'não pode entrar' } });
  assert.equal(r.status, 400, JSON.stringify(r.data));
  assert.ok(r.data.err[aid + ':titular'], 'erro no campo titular');
  assert.equal(await meu(), undefined, 'nada gravado');

  /* Com rascunho salvo: o errado não altera nenhum campo, nem os que vieram certos no mesmo corpo. */
  assert.equal((await act(org, id, 'draft', { aid, draft: { titular: [me], desc: 'antes' } })).status, 200);
  r = await act(org, id, 'draft', { aid, draft: { titular: 'Org Formato', desc: 'depois' } });
  assert.equal(r.status, 400);
  assert.ok(r.data.err[aid + ':titular']);
  const d = (await meu()).draft;
  assert.deepEqual(d.titular, [me]);
  assert.equal(d.desc, 'antes');

  /* Outros formatos errados: notas, opção fora da lista, texto que não é texto, rascunho que não é objeto. */
  for (const [draft, campo] of [[{ notas: { [me]: 'muito' } }, 'notas'], [{ notas: [10] }, 'notas'], [{ origem: 'Inventei agora' }, 'origem'], [{ uso: ['Só quem for dono'] }, 'uso'], [{ desc: 42 }, 'desc'], [{ titular: [me, 7] }, 'titular']]) {
    r = await act(org, id, 'draft', { aid, draft });
    assert.equal(r.status, 400, JSON.stringify(draft));
    assert.ok(r.data.err[aid + ':' + campo], JSON.stringify(draft));
  }
  assert.equal((await act(org, id, 'draft', { aid, draft: 'texto' })).status, 400);

  /* O qsend seguinte responde como envio incompleto (400), não estoura (500). */
  r = await act(org, id, 'qsend', { aid });
  assert.equal(r.status, 400, JSON.stringify(r.data));
});

test('draft recusa texto acima do limite', async () => {
  const { org, id, aid, me } = await projetoSozinho('Formato Limite');
  assert.equal((await act(org, id, 'draft', { aid, draft: { desc: 'x'.repeat(2000) } })).status, 200, 'no limite passa');
  for (const [campo, max] of [['desc', 2000], ['link', 2000], ['titularAtualNome', 200], ['titularAtualBase', 500], ['titularExterno', 200]]) {
    const r = await act(org, id, 'draft', { aid, draft: { [campo]: 'x'.repeat(max + 1) } });
    assert.equal(r.status, 400, campo);
    assert.ok(r.data.err[aid + ':' + campo], campo);
  }
  assert.equal((await org.get('/api/projects/' + id)).data.answers[me][aid].draft.desc.length, 2000);
});

test('propdraft recusa formato errado e chave inesperada em v; draft e propdraft legítimos passam', async () => {
  const { org, id, aid, me } = await projetoSozinho('Formato Proposta');

  /* Draft legítimo, como a tela manda (o rascunho inteiro), e envio. */
  let r = await act(org, id, 'draft', { aid, draft: respostaCompleta(me), step: 3 });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal((await act(org, id, 'qsend', { aid })).status, 200);
  assert.equal((await act(org, id, 'closeok')).status, 200);
  const antes = (await org.get('/api/projects/' + id)).data.proposal[aid];

  /* v em formato errado. */
  for (const [prop, campo] of [[{ v: { titular: me } }, 'titular'], [{ v: { uso: 'Talvez' } }, 'uso'], [{ v: 'tudo' }, 'v'], [{ v: [] }, 'v'], [{ externo: 3 }, 'externo'], [{ texto: 'x'.repeat(2001) }, 'texto'], [{ percentual: { [me]: 'metade' } }, 'percentual'], [{ semAcordo: 'sim' }, 'semAcordo']]) {
    r = await act(org, id, 'propdraft', { aid, prop });
    assert.equal(r.status, 400, JSON.stringify(prop));
    assert.ok(r.data.err['p' + aid + ':' + campo], JSON.stringify(prop) + ' ' + JSON.stringify(r.data));
  }

  /* Chave inesperada dentro de v: fora de decQs do tipo (notas, pergunta de outro tipo de criação, chave interna). */
  for (const extra of [{ hack: 'x' }, { notas: { [me]: 10 } }, { marcaRegistro: 'Sim, com evidência' }, { saved: true }]) {
    r = await act(org, id, 'propdraft', { aid, prop: { v: { uso: 'Qualquer pessoa que participou', ...extra } } });
    assert.equal(r.status, 400, JSON.stringify(extra));
    assert.ok(r.data.err['p' + aid + ':' + Object.keys(extra)[0]], JSON.stringify(extra));
  }
  assert.deepEqual((await org.get('/api/projects/' + id)).data.proposal[aid], antes, 'nada gravado na proposta');

  /* Propdraft legítimo, no formato que a tela manda: v inteiro (com '' no que ainda não foi decidido),
     percentual como texto do input numérico e semAcordo booleano. */
  r = await act(org, id, 'propdraft', { aid, prop: { v: { ...antes.v, divisao: '' }, externo: '', percentual: { [me]: '100' }, texto: 'Falta conferir a licença.', semAcordo: false } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await act(org, id, 'propdraft', { aid, prop: { v: { divisao: 'Sim, a equipe combinou percentuais' } } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  r = await act(org, id, 'saveprop', { aid });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const pr = r.data.project.proposal[aid];
  assert.equal(pr.v.divisao, 'Sim, a equipe combinou percentuais');
  assert.equal(pr.texto, 'Falta conferir a licença.');
  assert.equal(pr.v.hack, undefined);
});

async function projetoNovo(nome) {
  const at = String.fromCharCode(64), org = client(), tag = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  await org.post('/api/auth/test-login', { name: 'Org Formato', email: 'org.formato.' + tag + at + 'teste.local' });
  const { data: { id } } = await org.post('/api/projects', { person: 'Org Formato', name: nome });
  return { org, id, ver: async () => (await org.get('/api/projects/' + id)).data };
}

test('sobre recusa opção fora da lista, valor que não é texto e texto acima do limite, sem converter', async () => {
  const { org, id, ver } = await projetoNovo('Formato Sobre');
  let r = await act(org, id, 'sobre', { sobre: { contas: 'Domínio com a Org', acordo: 'Verbal', edital: 'Sim', editalQual: 'Regulamento' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const antes = (await ver()).sobre;
  assert.deepEqual(antes, { contas: 'Domínio com a Org', acordo: 'Verbal', edital: 'Sim', editalQual: 'Regulamento' });

  for (const [sobre, campo] of [[{ edital: 'Talvez' }, 'edital'], [{ acordo: ['Escrito'] }, 'acordo'], [{ acordo: null }, 'acordo'], [{ contas: 42 }, 'contas'], [{ contas: 'x'.repeat(501) }, 'contas'], [{ editalQual: 'x'.repeat(501) }, 'editalQual']]) {
    r = await act(org, id, 'sobre', { sobre: { contas: 'não pode entrar', ...sobre } });
    assert.equal(r.status, 400, JSON.stringify(sobre));
    assert.ok(r.data.err['sobre:' + campo], JSON.stringify(sobre) + ' ' + JSON.stringify(r.data));
  }
  r = await act(org, id, 'sobre', { sobre: 'Sim' });
  assert.equal(r.status, 400, 'sobre que não é objeto');
  assert.deepEqual((await ver()).sobre, antes, 'nada gravado, nem os campos certos do mesmo corpo');

  /* No limite passa e é gravado inteiro (sem corte). */
  r = await act(org, id, 'sobre', { sobre: { contas: 'x'.repeat(500) } });
  assert.equal(r.status, 200);
  assert.equal((await ver()).sobre.contas.length, 500);
});

test('perfil recusa opção fora da lista, valor que não é texto e texto acima do limite, sem converter', async () => {
  const { org, id, ver } = await projetoNovo('Formato Perfil');
  const meu = async () => { const v = await ver(); return v.members.find(m => m.pid === v.org).perfil; };
  let r = await act(org, id, 'perfil', { perfil: { funcao: 'Design', investiu: 'Não' } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual(await meu(), { funcao: 'Design', investiu: 'Não' });

  for (const [perfil, campo] of [[{ investiu: 'Talvez' }, 'investiu'], [{ investiu: ['Sim'] }, 'investiu'], [{ investiu: true }, 'investiu'], [{ funcao: ['Design'] }, 'funcao'], [{ funcao: 'x'.repeat(201) }, 'funcao']]) {
    r = await act(org, id, 'perfil', { perfil: { funcao: 'não pode entrar', ...perfil } });
    assert.equal(r.status, 400, JSON.stringify(perfil));
    assert.ok(r.data.err['perfil:' + campo], JSON.stringify(perfil) + ' ' + JSON.stringify(r.data));
  }
  assert.equal((await act(org, id, 'perfil', { perfil: ['Design', 'Sim'] })).status, 400, 'perfil que não é objeto');
  assert.deepEqual(await meu(), { funcao: 'Design', investiu: 'Não' }, 'nada gravado');

  /* Como a tela manda: o próprio perfil reenviado, com chave extra ignorada; no limite passa sem corte. */
  r = await act(org, id, 'perfil', { perfil: { funcao: 'x'.repeat(200), investiu: 'Sim', feito: true }, check: true });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.deepEqual(await meu(), { funcao: 'x'.repeat(200), investiu: 'Sim' });
});
