/* Ordem das listas do projeto: toda orderBy de load termina numa coluna única. createdAt empata por construção (o
   default now() do Postgres é o horário da transação), e com empate a ordem que volta é arbitrária e pode mudar depois
   de um update ou de um vacuum. A ordem importa: p.members decide a ordem das pessoas no registro do acordo (que é
   hasheado), e p.memorials[0] é o registro mais recente.
   Roda sem banco: chama o load real (dist/store.js) com um Prisma falso que só guarda a consulta. Precisa do build da
   API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from '../dist/store.js';
import { routes as rotasDaConta } from '../dist/auth.js';
import { routes as rotasDeProjetos } from '../dist/modules/projetos/index.js';
import { routes as rotasDeFeedback } from '../dist/modules/feedback/index.js';

/* Relações que viram mapa (por pessoa ou por criação) e não lista: a ordem do banco não chega a lugar nenhum. Quem
   percorre esses mapas no domínio ordena por conta própria (veja packages/domain/test/determinismo.test.js). */
const SEM_ORDEM = new Set(['answers', 'proposals']);
/* Última coluna aceita em cada lista: id (chave primária) ou, em versions, n (único com projectId). */
const UNICA = { versions: 'n' };

async function consulta() {
  let args;
  const tx = { project: { findFirst: async a => { args = a; return null; } } };
  assert.equal(await load(tx, 'p1', 'u1'), null);
  return args;
}

test('toda lista carregada pelo load termina a ordem numa coluna única', async () => {
  const { include } = await consulta();
  for (const [rel, cfg] of Object.entries(include)) {
    if (SEM_ORDEM.has(rel)) { assert.equal(cfg, true, rel + ' virou consulta com opções: confira se precisa de ordem'); continue; }
    assert.ok(cfg && cfg.orderBy, rel + ': lista sem orderBy');
    const ordem = [].concat(cfg.orderBy);
    assert.deepEqual(Object.keys(ordem.at(-1)), [UNICA[rel] || 'id'], rel + ': a ordem precisa terminar em ' + (UNICA[rel] || 'id'));
  }
});

test('o desempate segue o sentido da ordem: o mais recente primeiro em history e memorials', async () => {
  const { include } = await consulta();
  for (const rel of ['members', 'assets', 'comments']) assert.deepEqual(include[rel].orderBy, [{ createdAt: 'asc' }, { id: 'asc' }], rel);
  for (const rel of ['history', 'memorials']) assert.deepEqual(include[rel].orderBy, [{ createdAt: 'desc' }, { id: 'desc' }], rel);
});

test('as confirmações de cada versão viram mapa por pessoa; quem as lê ordena (registro, tarefa)', async () => {
  const { include } = await consulta();
  assert.deepEqual(include.versions.include, { confirmations: true });
});

/* ===== Listas fora do load: as rotas que ordenam por createdAt ===== */
/* Mesma regra, mesmo desempate (id no sentido da ordem). Roda sem banco e sem servidor: registra as rotas reais
   (dist/auth.js e dist/modules/) num app falso que só guarda os handlers, com um Prisma falso que guarda cada consulta
   e devolve lista vazia, e chama o handler direto. */

function montar(registrar) {
  const rotas = {}, consultas = [];
  const app = new Proxy({}, { get: (_, metodo) => (caminho, ...hs) => { rotas[metodo.toUpperCase() + ' ' + caminho] = hs.at(-1); } });
  const prisma = new Proxy({}, { get: (_, modelo) => new Proxy({}, { get: (_, metodo) => async args => { consultas.push({ modelo, metodo, args }); return []; } }) });
  const ctx = { prisma, wrap: fn => fn, auth: (_q, _r, next) => next(), prod: false, devLogin: true, testLogin: false, feedbackOn: true, isAdmin: () => true };
  /* devLogin avisa no console ao registrar as rotas de teste. */
  const warn = console.warn; console.warn = () => {};
  try { registrar(app, ctx); } finally { console.warn = warn; }
  const chamar = async rota => {
    assert.ok(rotas[rota], rota + ': rota não registrada');
    let corpo;
    await rotas[rota]({ user: { id: 'u1', email: 'admin@mip.test' }, params: {}, body: {} }, { json: x => { corpo = x; }, status() { return this; } });
    return corpo;
  };
  const achar = (modelo, metodo) => { const c = consultas.filter(x => x.modelo === modelo && x.metodo === metodo); assert.equal(c.length, 1, modelo + '.' + metodo); return c[0].args; };
  return { chamar, achar };
}

test('lista de projetos: integrantes por createdAt desc, desempate por id desc', async () => {
  const { chamar, achar } = montar(rotasDeProjetos);
  assert.deepEqual(await chamar('GET /api/projects'), []);
  assert.deepEqual(achar('member', 'findMany').orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
});

test('feedback no /admin: por createdAt desc com desempate por id desc; as imagens de cada um, asc com desempate asc', async () => {
  const { chamar, achar } = montar(rotasDeFeedback);
  assert.deepEqual(await chamar('GET /api/admin/feedback'), []);
  const args = achar('feedback', 'findMany');
  assert.deepEqual(args.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.deepEqual(args.include.images.orderBy, [{ createdAt: 'asc' }, { id: 'asc' }]);
});

test('pessoas do login de teste (DEV_LOGIN): por createdAt asc, desempate por id asc', async () => {
  const { chamar, achar } = montar(rotasDaConta);
  assert.deepEqual(await chamar('GET /api/dev/users'), []);
  assert.deepEqual(achar('user', 'findMany').orderBy, [{ createdAt: 'asc' }, { id: 'asc' }]);
});
