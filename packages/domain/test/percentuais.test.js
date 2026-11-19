/* Grupo 2 — Percentuais e participação percebida:
   shares, partOf, partTxt, pctTxt, contribOf, notasOf, hasNota. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { shares, partOf, partTxt, pctTxt, contribOf, notasOf, hasNota, PCT_SIM, PCT_NEG } from '@mip/domain';
import { projeto, responder, semResposta, addMembro } from './fixtures.js';

describe('shares', () => {
  test('proporção de cada valor sobre o total, em inteiros que somam 100: resto empatado vai para o valor maior', () => {
    assert.deepEqual(shares({ ana: 10, bruno: 0, carla: 6 }), { ana: 63, bruno: 0, carla: 37 });
  });

  test('três partes iguais somam 100: o menor id fica com o ponto a mais', () => {
    assert.deepEqual(shares({ a: 1, b: 1, c: 1 }), { a: 34, b: 33, c: 33 });
  });

  test('total zero dá zero para todos, sem dividir por zero', () => {
    assert.deepEqual(shares({ a: 0, b: 0 }), { a: 0, b: 0 });
    assert.deepEqual(shares({}), {});
  });

  test('converte texto para número e trata inválidos como zero', () => {
    assert.deepEqual(shares({ a: '3', b: 'x', c: null }), { a: 100, b: 0, c: 0 });
  });

  describe('soma 100 quando a divisão não fecha (maior resto)', () => {
    const iguais = n => Object.fromEntries(Array.from({ length: n }, (_, i) => ['p' + (i + 1), 1]));
    const soma = o => Object.values(o).reduce((s, x) => s + x, 0);

    test('3 pessoas iguais: 34 + 33 + 33', () => {
      const o = shares(iguais(3));
      assert.equal(soma(o), 100);
      assert.deepEqual(o, { p1: 34, p2: 33, p3: 33 });
    });

    test('6 pessoas iguais: quatro com 17, duas com 16', () => {
      const o = shares(iguais(6));
      assert.equal(soma(o), 100);
      assert.deepEqual(o, { p1: 17, p2: 17, p3: 17, p4: 17, p5: 16, p6: 16 });
    });

    test('7 pessoas iguais: duas com 15, cinco com 14', () => {
      const o = shares(iguais(7));
      assert.equal(soma(o), 100);
      assert.deepEqual(o, { p1: 15, p2: 15, p3: 14, p4: 14, p5: 14, p6: 14, p7: 14 });
    });

    test('valores diferentes: os pontos que faltam vão para os maiores restos, não para os maiores valores', () => {
      // 52,63 · 31,58 · 15,79: pisos somam 98; os restos ,79 e ,63 levam os 2 pontos.
      const o = shares({ a: 10, b: 6, c: 3 });
      assert.equal(soma(o), 100);
      assert.deepEqual(o, { a: 53, b: 31, c: 16 });
    });

    test('resto igual na conta exata: o ponto vai para o valor maior, e o ruído do ponto flutuante não decide', () => {
      // 16,67 · 16,67 · 66,67: os três restos são iguais; c (valor 4) leva o primeiro ponto, a (menor id) o segundo.
      assert.deepEqual(shares({ a: 1, b: 1, c: 4 }), { a: 17, b: 16, c: 67 });
    });

    test('a ordem das chaves não muda o resultado', () => {
      assert.deepEqual(shares({ c: 1, b: 1, a: 1 }), { a: 34, b: 33, c: 33 });
      assert.deepEqual(shares({ carla: 6, bruno: 0, ana: 10 }), { ana: 63, bruno: 0, carla: 37 });
    });

    test('toda combinação de níveis para 4 pessoas soma 100, e ninguém se afasta 1 ponto ou mais da proporção', () => {
      const N = [0, 3, 6, 10];
      for (const a of N) for (const b of N) for (const c of N) for (const d of N) {
        const n = { a, b, c, d }, tot = a + b + c + d;
        if (!tot) continue;
        const o = shares(n);
        assert.equal(soma(o), 100, JSON.stringify(n));
        for (const k of Object.keys(n)) assert.ok(Math.abs(o[k] - 100 * n[k] / tot) < 1, JSON.stringify(n) + ' ' + k);
      }
    });
  });
});

describe('partOf', () => {
  test('média das notas que cada pessoa recebeu', () => {
    const p = responder(projeto(), 'bruno', { notas: { ana: 10, bruno: 0, carla: 3 } });
    const pt = partOf(p, 'a1');
    assert.deepEqual(pt.avg, { ana: 10, bruno: 0, carla: 5 });
    assert.deepEqual(pt.share, { ana: 67, bruno: 0, carla: 33 });
  });

  test('quem não respondeu fica fora da média (não conta como zero)', () => {
    const p = semResposta(projeto(), 'carla');
    assert.equal(partOf(p, 'a1').avg.carla, 6);
  });

  test('notas vazias ou nulas ficam fora da média', () => {
    const p = projeto();
    responder(p, 'ana', { notas: { ana: 10, bruno: 0, carla: '' } });
    responder(p, 'bruno', { notas: { ana: 10, bruno: 0, carla: null } });
    responder(p, 'carla', { notas: { ana: 10, bruno: 0, carla: 3 } });
    assert.equal(partOf(p, 'a1').avg.carla, 3);
  });

  test('pessoa que ninguém avaliou fica com zero', () => {
    const p = projeto();
    ['ana', 'bruno', 'carla'].forEach(pid => responder(p, pid, { notas: { ana: 10, bruno: 0 } }));
    assert.equal(partOf(p, 'a1').avg.carla, 0);
  });

  test('só pessoas elegíveis avaliam e são avaliadas', () => {
    const p = projeto();
    addMembro(p, 'dani', { elig: false });
    responder(p, 'dani', { notas: { ana: 0, bruno: 0, carla: 0, dani: 10 } });
    responder(p, 'ana', { notas: { ana: 10, bruno: 0, carla: 6, dani: 10 } });
    const pt = partOf(p, 'a1');
    assert.deepEqual(Object.keys(pt.avg), ['ana', 'bruno', 'carla']);
    assert.equal(pt.avg.ana, 10);
  });

  test('usa p.parts quando o servidor já mandou o cálculo', () => {
    const p = projeto(), pronto = { avg: { ana: 1 }, share: { ana: 100 } };
    p.parts = { a1: pronto };
    assert.equal(partOf(p, 'a1'), pronto);
  });
});

describe('partTxt', () => {
  test('lista quem tem participação maior que zero, com o nível', () => {
    const p = projeto();
    assert.equal(partTxt(p, partOf(p, 'a1')), 'Ana: muito · Carla: parte');
  });

  test('usa o nível mais próximo da média', () => {
    assert.equal(partTxt(projeto(), { avg: { ana: 5, bruno: 2 } }), 'Ana: parte · Bruno: pouco');
  });

  test('sem ninguém acima de zero', () => {
    assert.equal(partTxt(projeto(), { avg: { ana: 0, bruno: 0 } }), 'Sem participação informada');
  });
});

describe('pctTxt', () => {
  test('sem percentuais combinados', () => {
    assert.equal(pctTxt(projeto(), { v: { divisao: PCT_NEG, titular: ['ana'] }, percentual: { ana: 100 } }), 'Não acordados');
    assert.equal(pctTxt(projeto(), {}), 'Não acordados');
  });

  test('com percentuais combinados, na ordem dos titulares', () => {
    const s = { v: { divisao: PCT_SIM, titular: ['carla', 'ana'] }, percentual: { ana: 60, carla: 40 } };
    assert.equal(pctTxt(projeto(), s), 'Carla: 40% · Ana: 60%');
  });

  test('inclui o titular externo pelo nome, no fim', () => {
    const s = { v: { divisao: PCT_SIM, titular: ['ana'] }, externo: 'Empresa X', percentual: { ana: 80, __externo__: 20 } };
    assert.equal(pctTxt(projeto(), s), 'Ana: 80% · Empresa X: 20%');
    assert.equal(pctTxt(projeto(), { ...s, v: { divisao: PCT_SIM } , percentual: { __externo__: 100 } }), 'Empresa X: 100%');
  });

  test('percentual ausente ou em branco aparece como "não informado"', () => {
    const s = { v: { divisao: PCT_SIM, titular: ['ana'] } };
    assert.equal(pctTxt(projeto(), s), 'Ana: não informado');
    assert.equal(pctTxt(projeto(), { v: { divisao: PCT_SIM, titular: ['ana', 'carla'] }, externo: 'Empresa X', percentual: { ana: 40, carla: '' } }), 'Ana: 40% · Carla: não informado · Empresa X: não informado');
  });

  /* O externo é lido por normExterno, como no propError: só espaços não é titular. */
  test('titular externo só com espaços não entra; com espaços nas pontas, entra sem eles', () => {
    const s = { v: { divisao: PCT_SIM, titular: ['ana'] }, percentual: { ana: 100, __externo__: 50 } };
    assert.equal(pctTxt(projeto(), { ...s, externo: '   ' }), 'Ana: 100%');
    assert.equal(pctTxt(projeto(), { ...s, externo: ' Empresa X ' }), 'Ana: 100% · Empresa X: 50%');
  });
});

describe('contribOf', () => {
  test('quem recebeu nota maior que zero', () => {
    assert.deepEqual(contribOf({ notas: { ana: 10, bruno: 0, carla: '3', dani: '0', eva: -1 } }), ['ana', 'carla']);
  });

  test('sem notas', () => {
    assert.deepEqual(contribOf(undefined), []);
    assert.deepEqual(contribOf({}), []);
  });
});

describe('notasOf', () => {
  test('devolve as notas do rascunho ou um objeto vazio', () => {
    const n = { ana: 3 };
    assert.equal(notasOf({ notas: n }), n);
    assert.deepEqual(notasOf({}), {});
    assert.deepEqual(notasOf(undefined), {});
    assert.deepEqual(notasOf(null), {});
  });
});

describe('hasNota', () => {
  test('zero e números em texto contam como nota', () => {
    assert.equal(hasNota({ a: 0 }, 'a'), true);
    assert.equal(hasNota({ a: '6' }, 'a'), true);
    assert.equal(hasNota({ a: 10 }, 'a'), true);
  });

  test('ausente, vazio, nulo ou não numérico não conta', () => {
    assert.equal(hasNota({}, 'a'), false);
    assert.equal(hasNota({ a: undefined }, 'a'), false);
    assert.equal(hasNota({ a: '' }, 'a'), false);
    assert.equal(hasNota({ a: null }, 'a'), false);
    assert.equal(hasNota({ a: 'muito' }, 'a'), false);
  });
});
