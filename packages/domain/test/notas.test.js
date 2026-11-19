/* notaNum: o número de uma nota lida (NotasLidas). Notas gravadas são só números; um rascunho gravado antes do 01c1030
   pode trazer '', null ou texto, e onde o domínio precisa do número de uma nota esses valores viram 0. Nos usos
   (contribOf, stepErrors, sendErrors, itemStatus e distRows) o resultado é o mesmo do + de antes: o valor é comparado
   com > 0 ou já passou por hasNota. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { notaNum } from '@mip/domain';

describe('notaNum', () => {
  test('número fica como está', () => {
    for (const n of [0, 3, 6, 10, 2.5, -1, Infinity]) assert.equal(notaNum(n), n);
  });
  test('texto com número vira o número, como no +', () => {
    assert.equal(notaNum('6'), 6);
    assert.equal(notaNum('10'), 10);
  });
  test("o que não é número vira 0: '', null, undefined, texto e NaN", () => {
    for (const x of ['', null, undefined, 'muito', NaN]) assert.equal(notaNum(x), 0, String(x));
  });
});
