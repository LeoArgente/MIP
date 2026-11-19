/* Ordem das listas do projeto: toda orderBy de load termina numa coluna única. createdAt empata por construção (o
   default now() do Postgres é o horário da transação), e com empate a ordem que volta é arbitrária e pode mudar depois
   de um update ou de um vacuum. A ordem importa: p.members decide a ordem das pessoas no registro do acordo (que é
   hasheado), e p.memorials[0] é o registro mais recente.
   Roda sem banco: chama o load real (dist/store.js) com um Prisma falso que só guarda a consulta. Precisa do build da
   API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from '../dist/store.js';

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
