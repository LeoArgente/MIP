/* Comentário numa criação (ação comment, em decisoes): o texto é conferido como os outros textos livres (erroDeFormato
   em modules/shared.ts). Acima do limite é recusado, não cortado; valor que não é texto dá 400, não erro interno.
   Roda sem banco e sem servidor: chama o despachante real (dist/modules/index.js) sobre um projeto em memória.
   Precisa do build da API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../dist/modules/index.js';
import { emDecisao, emConfirmacao, erro } from './projeto.js';

test('comentário: até 2000 caracteres é gravado inteiro; 2001 é recusado sem gravar nada', () => {
  const p = emDecisao();
  assert.deepEqual(erro(() => apply(p, 'bruno', 'comment', { aid: 'a1', text: 'x'.repeat(2001) })), { status: 400, err: { cmt: 'O comentário passou do limite de 2000 caracteres.' } });
  assert.equal(p.comments.length, 0);
  apply(p, 'bruno', 'comment', { aid: 'a1', text: 'x'.repeat(2000) });
  assert.equal(p.comments.length, 1);
  assert.equal(p.comments[0].text.length, 2000);
});

test('comentário que não é texto: 400 no campo, não erro interno', () => {
  for (const text of [5, null, ['a'], { a: 1 }, true]) {
    const p = emDecisao();
    assert.deepEqual(erro(() => apply(p, 'bruno', 'comment', { aid: 'a1', text })), { status: 400, err: { cmt: 'O comentário precisa ser texto.' } }, JSON.stringify(text));
    assert.equal(p.comments.length, 0);
  }
});

test('comentário vazio, só espaços ou ausente continua pedindo o texto; o gravado vem sem espaços nas pontas', () => {
  for (const d of [{ text: '' }, { text: '   ' }, {}]) {
    const p = emDecisao();
    assert.deepEqual(erro(() => apply(p, 'bruno', 'comment', { aid: 'a1', ...d })), { status: 400, err: { cmt: 'Escreva o comentário antes de enviar.' } }, JSON.stringify(d));
  }
  const p = emDecisao();
  apply(p, 'bruno', 'comment', { aid: 'a1', text: '  Conversar sobre o uso  ' });
  assert.deepEqual(p.comments.map(c => [c.aid, c.pid, c.text]), [['a1', 'bruno', 'Conversar sobre o uso']]);
});

test('comentário: o limite vale para o texto como chegou, e continua valendo na confirmação', () => {
  const p = emConfirmacao();
  assert.equal(erro(() => apply(p, 'carla', 'comment', { aid: 'a1', text: ' ' + 'x'.repeat(2000) })).status, 400);
  apply(p, 'carla', 'comment', { aid: 'a1', text: 'ok' });
  assert.equal(p.comments.length, 1);
});
