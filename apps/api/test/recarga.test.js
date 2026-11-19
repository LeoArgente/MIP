/* Resposta das rotas que mudam o projeto e o recarregam depois da transação (comProjeto, em modules/shared.ts).
   No despachante de ações, a pessoa pode ter sido tirada do projeto pela rota /remove entre o fim da transação e o
   load, e o load devolve null: a ação já foi gravada, então a resposta leva o resultado sem o projeto (como as ações
   quiet), em vez de estourar em viewFor(null). Roda sem banco: chama o comProjeto real (dist/modules/shared.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comProjeto } from '../dist/modules/shared.js';
import { viewFor } from '../dist/view.js';
import { emDecisao } from './projeto.js';

test('com o projeto recarregado: o resultado e a vista de quem pediu', () => {
  const p = emDecisao(), result = { toast: 'ok' };
  assert.deepEqual(comProjeto(result, p, 'bruno'), { result, project: viewFor(p, 'bruno') });
});

test('sem o projeto (load devolveu null): só o resultado, sem a chave project', () => {
  const r = comProjeto({ toast: 'ok' }, null, 'bruno');
  assert.deepEqual(r, { result: { toast: 'ok' } });
  assert.equal(Object.hasOwn(r, 'project'), false);
});
