/* Grupo 8 — Formatação e catálogo de perguntas:
   fmt, nm, fmtAns, lvOf, lvName, typeOf, qsFor, decQs, isP, clone, sobreKeys (e GRP). */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, nm, fmtAns, lvOf, lvName, typeOf, qsFor, decQs, isP, clone, sobreKeys, GRP, QS, QBASE } from '@mip/domain';
import { projeto, T, T_TXT } from './fixtures.js';

describe('fmt', () => {
  test('data e hora no fuso de São Paulo, "dd/mm/aaaa às hh:mm"', () => {
    assert.equal(fmt(T), T_TXT);
    // 02:07 UTC do dia 5 ainda é dia 4 em São Paulo.
    assert.equal(fmt(Date.UTC(2026, 0, 5, 2, 7)), '04/01/2026 às 23:07');
  });
});

describe('nm', () => {
  test('nome da pessoa, ou o próprio id quando não há nome', () => {
    assert.equal(nm(projeto(), 'ana'), 'Ana');
    assert.equal(nm(projeto(), 'ze'), 'ze');
    assert.equal(nm({}, 'ze'), 'ze');
  });
});

describe('fmtAns', () => {
  const p = projeto();
  test('notas: nível de cada pessoa com nota válida', () => {
    assert.equal(fmtAns(p, 'notas', { ana: 10, bruno: 0, carla: '', dani: null, eva: '3' }), 'Ana: muito · Bruno: nada · Eva: pouco');
    assert.equal(fmtAns(p, 'notas', {}), 'Sem respostas');
    assert.equal(fmtAns(p, 'notas', undefined), 'Sem respostas');
  });

  test('pessoas: nomes separados por vírgula', () => {
    assert.equal(fmtAns(p, 'titular', ['ana', 'carla']), 'Ana, Carla');
    assert.equal(fmtAns(p, 'titular', []), 'Ninguém marcado');
    assert.equal(fmtAns(p, 'titular', undefined), 'Ninguém marcado');
  });

  test('opção: o valor, ou "Não respondida"', () => {
    assert.equal(fmtAns(p, 'uso', 'Só quem for dono'), 'Só quem for dono');
    assert.equal(fmtAns(p, 'uso', ''), 'Não respondida');
    assert.equal(fmtAns(p, 'uso', undefined), 'Não respondida');
  });
});

describe('lvOf', () => {
  test('valores exatos dos níveis', () => {
    assert.deepEqual([0, 3, 6, 10].map(lvOf), [0, 3, 6, 10]);
  });

  test('nível mais próximo', () => {
    assert.deepEqual([1, 2, 5, 7, 9, 12, -4].map(lvOf), [0, 3, 6, 6, 10, 10, 0]);
  });

  test('empate fica com o nível de baixo', () => {
    assert.equal(lvOf(1.5), 0);
    assert.equal(lvOf(4.5), 3);
    assert.equal(lvOf(8), 6);
  });
});

describe('lvName', () => {
  test('nome do nível mais próximo, aceitando texto', () => {
    assert.deepEqual([0, 3, 6, 10].map(lvName), ['Nada', 'Pouco', 'Parte', 'Muito']);
    assert.equal(lvName('6'), 'Parte');
    assert.equal(lvName(8), 'Parte');
  });
});

describe('typeOf', () => {
  test('tipo da criação pelo campo type', () => {
    assert.equal(typeOf({ type: 'codigo' }).n, 'Código');
    assert.equal(typeOf({ type: 'nao-existe' }), undefined);
    assert.equal(typeOf(undefined), undefined);
  });
});

describe('qsFor', () => {
  test('perguntas base mais a pergunta extra do tipo', () => {
    assert.deepEqual(qsFor({ type: 'codigo' }), QBASE.concat('licenca'));
    assert.deepEqual(qsFor({ type: 'marca' }), QBASE.concat('marcaRegistro'));
    assert.deepEqual(qsFor({ type: 'design' }).at(-1), 'terceiros');
    assert.deepEqual(qsFor({ type: 'conteudo' }).at(-1), 'terceiros');
    assert.deepEqual(qsFor({ type: 'audio' }).at(-1), 'audioDireitos');
    assert.deepEqual(qsFor({ type: 'invencao' }).at(-1), 'invDivulgacao');
  });

  test('sem extra (outro, tipo desconhecido ou sem criação): só as base', () => {
    assert.deepEqual(qsFor({ type: 'outro' }), QBASE);
    assert.deepEqual(qsFor({ type: 'x' }), QBASE);
    assert.deepEqual(qsFor(undefined), QBASE);
  });
});

describe('decQs', () => {
  test('perguntas que entram na proposta: todas menos notas', () => {
    assert.deepEqual(decQs({ type: 'marca' }), ['origem', 'titularAtual', 'titular', 'divisao', 'uso', 'materiais', 'comercial', 'portfolio', 'marcaRegistro']);
  });
});

describe('isP', () => {
  test('só titular é pergunta de escolher pessoas', () => {
    assert.deepEqual(Object.keys(QS).filter(isP), ['titular']);
  });
});

describe('clone', () => {
  test('cópia profunda, independente do original', () => {
    const o = { a: [1, { b: 2 }] }, c = clone(o);
    assert.deepEqual(c, o);
    c.a[1].b = 3;
    assert.equal(o.a[1].b, 2);
  });

  test('undefined continua undefined; campos undefined somem (cópia via JSON)', () => {
    assert.equal(clone(undefined), undefined);
    assert.deepEqual(clone({ a: undefined, b: 1 }), { b: 1 });
  });
});

describe('sobreKeys', () => {
  test('"qual documento" só aparece quando há edital', () => {
    assert.deepEqual(sobreKeys(undefined), ['contas', 'acordo', 'edital']);
    assert.deepEqual(sobreKeys({ edital: 'Não' }), ['contas', 'acordo', 'edital']);
    assert.deepEqual(sobreKeys({ edital: 'Sim' }), ['contas', 'acordo', 'edital', 'editalQual']);
  });
});

describe('GRP (exportado como constante, mas é função)', () => {
  test('grupo de cada pergunta', () => {
    for (const q of ['notas', 'desc', 'origem', 'titularAtual']) assert.equal(GRP(q), 'Origem e situação atual');
    for (const q of ['titular', 'divisao']) assert.equal(GRP(q), 'Titularidade pretendida');
    for (const q of ['uso', 'remix', 'licenca']) assert.equal(GRP(q), 'Uso e condições');
  });
});
