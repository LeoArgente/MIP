/* Recusa da proposta (ação refuse): a explicação é texto com limite, conferida como os outros textos livres
   (erroDeFormato em modules/shared.ts), e as criações marcadas são uma lista de ids. Fora do formato, 400 com o erro
   no campo e nada gravado.
   Roda sem banco e sem servidor: chama o despachante real (dist/modules/index.js) sobre um projeto em memória.
   Precisa do build da API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../dist/modules/index.js';
import { emConfirmacao, erro } from './projeto.js';

test('explicação da recusa: até 2000 caracteres passa, 2001 é recusado sem gravar nada', () => {
  const p = emConfirmacao(), antes = JSON.stringify(p);
  assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets: ['a1'], comment: 'x'.repeat(2001) })), { status: 400, err: { refuse: 'A explicação da recusa passou do limite de 2000 caracteres.' } });
  assert.equal(JSON.stringify(p), antes, 'nada mudou no projeto');

  apply(p, 'bruno', 'refuse', { n: 1, assets: ['a1'], comment: 'x'.repeat(2000) });
  assert.equal(p.versions[0].conf.bruno.comment.length, 2000);
  assert.equal(p.phase, 'decisao');
});

test('explicação da recusa que não é texto: 400 no campo, não erro interno', () => {
  for (const comment of [5, null, ['a'], { a: 1 }]) {
    const p = emConfirmacao(), antes = JSON.stringify(p);
    assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets: ['a1'], comment })), { status: 400, err: { refuse: 'A explicação da recusa precisa ser texto.' } }, JSON.stringify(comment));
    assert.equal(JSON.stringify(p), antes, 'nada mudou no projeto');
  }
});

test('explicação vazia, só espaços ou ausente continua pedindo a explicação; junto com o erro das criações', () => {
  for (const d of [{ comment: '' }, { comment: '   ' }, {}]) {
    const p = emConfirmacao();
    assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets: ['a1'], ...d })), { status: 400, err: { refuse: 'Explique o que precisa mudar' } }, JSON.stringify(d));
  }
  const p = emConfirmacao();
  assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets: [], comment: 'x'.repeat(2001) })).err, { refa: 'Marque pelo menos uma criação', refuse: 'A explicação da recusa passou do limite de 2000 caracteres.' });
});

test('a explicação é gravada sem espaços nas pontas, e o limite vale para o texto como chegou', () => {
  const p = emConfirmacao();
  apply(p, 'bruno', 'refuse', { n: 1, assets: ['a1'], comment: '  Ajustar o uso  ' });
  assert.equal(p.versions[0].conf.bruno.comment, 'Ajustar o uso');
  const q = emConfirmacao();
  assert.equal(erro(() => apply(q, 'bruno', 'refuse', { n: 1, assets: ['a1'], comment: ' ' + 'x'.repeat(2000) })).status, 400);
});

test('criações da recusa que não são lista de ids: 400 no campo das criações, não erro interno', () => {
  for (const assets of ['a1', 5, null, { a1: true }, [5], [''], ['a1', {}], ['x'.repeat(65)]]) {
    const p = emConfirmacao(), antes = JSON.stringify(p);
    assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets, comment: 'Ajustar' })), { status: 400, err: { refa: 'Envie as criações marcadas como uma lista.' } }, JSON.stringify(assets));
    assert.equal(JSON.stringify(p), antes, 'nada mudou no projeto');
  }
});

test('criações da recusa: ausente ou vazia pede uma criação; id que não está na versão continua ignorado', () => {
  for (const d of [{}, { assets: [] }, { assets: ['outra'] }]) {
    const p = emConfirmacao();
    assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, comment: 'Ajustar', ...d })), { status: 400, err: { refa: 'Marque pelo menos uma criação' } }, JSON.stringify(d));
  }
  const p = emConfirmacao();
  apply(p, 'bruno', 'refuse', { n: 1, assets: ['outra', 'a1'], comment: 'Ajustar' });
  assert.deepEqual(p.versions[0].conf.bruno.assets, ['a1']);
});

test('criações e explicação fora do formato: os dois erros juntos', () => {
  const p = emConfirmacao();
  assert.deepEqual(erro(() => apply(p, 'bruno', 'refuse', { n: 1, assets: 'a1', comment: 7 })).err, { refa: 'Envie as criações marcadas como uma lista.', refuse: 'A explicação da recusa precisa ser texto.' });
});
