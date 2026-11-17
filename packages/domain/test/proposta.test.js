/* Grupo 4 — Proposta e decisão: propDefault, propOf, dsteps, decPick, lastV. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { propDefault, propOf, dsteps, decPick, lastV, PCT_NEG } from '@mip/domain';
import { projeto, responder, semResposta, BASE } from './fixtures.js';

const VAZIA = { origem: '', titularAtual: '', titular: [], divisao: '', uso: '', materiais: '', comercial: '', portfolio: '', marcaRegistro: '' };

describe('propDefault', () => {
  describe('regra: propDefault pré-preenche a proposta só com o que foi convergente, inclusive o titular externo', () => {
    test('tudo convergente: tudo pré-preenchido com a resposta comum', () => {
      assert.deepEqual(propDefault(projeto(), 'a1').v, {
        origem: BASE.origem, titularAtual: BASE.titularAtual, titular: ['ana'], divisao: PCT_NEG,
        uso: BASE.uso, materiais: BASE.materiais, comercial: BASE.comercial, portfolio: BASE.portfolio, marcaRegistro: BASE.marcaRegistro
      });
    });

    test('o que diverge fica em branco; o resto continua preenchido', () => {
      const p = responder(projeto(), 'carla', { uso: 'Qualquer pessoa que participou', titular: ['ana', 'carla'] });
      const v = propDefault(p, 'a1').v;
      assert.equal(v.uso, '');
      assert.deepEqual(v.titular, []);
      assert.equal(v.comercial, BASE.comercial);
    });

    test('o que está pendente fica em branco, mesmo que quem respondeu concorde', () => {
      const pr = propDefault(semResposta(projeto(), 'carla'), 'a1');
      assert.deepEqual(pr.v, VAZIA);
      assert.equal(pr.externo, '');
    });

    test('titular externo convergente vem pré-preenchido', () => {
      const p = projeto();
      ['ana', 'bruno', 'carla'].forEach(pid => responder(p, pid, { titularExterno: 'Empresa X' }));
      const pr = propDefault(p, 'a1');
      assert.equal(pr.externo, 'Empresa X');
      assert.deepEqual(pr.v.titular, ['ana']);
    });

    test('titular externo só para uma pessoa: titular inteiro diverge e nada é pré-preenchido', () => {
      const pr = propDefault(responder(projeto(), 'carla', { titularExterno: 'Empresa X' }), 'a1');
      assert.equal(pr.externo, '');
      assert.deepEqual(pr.v.titular, []);
    });

    test('titular externo convergente sem ninguém da equipe', () => {
      const p = projeto();
      ['ana', 'bruno', 'carla'].forEach(pid => responder(p, pid, { titular: [], titularExterno: 'Empresa X' }));
      const pr = propDefault(p, 'a1');
      assert.equal(pr.externo, 'Empresa X');
      assert.deepEqual(pr.v.titular, []);
    });

    test('comportamento atual: o externo é copiado como a primeira pessoa escreveu, sem normalizar', () => {
      const p = projeto();
      responder(p, 'ana', { titularExterno: ' Empresa X ' });
      responder(p, 'bruno', { titularExterno: 'empresa x' });
      responder(p, 'carla', { titularExterno: 'EMPRESA X' });
      assert.equal(propDefault(p, 'a1').externo, ' Empresa X ');
    });
  });

  test('só perguntas de decisão do tipo da criação (sem notas)', () => {
    const p = projeto();
    p.assets.push({ id: 'a2', type: 'codigo', st: 'ok' });
    assert.deepEqual(Object.keys(propDefault(p, 'a1').v), Object.keys(VAZIA));
    assert.ok('licenca' in propDefault(p, 'a2').v);
    assert.ok(!('marcaRegistro' in propDefault(p, 'a2').v));
  });

  test('começa sem percentuais, texto ou "sem acordo", e não salva', () => {
    const { percentual, texto, semAcordo, saved } = propDefault(projeto(), 'a1');
    assert.deepEqual({ percentual, texto, semAcordo, saved }, { percentual: {}, texto: '', semAcordo: false, saved: false });
  });

  test('devolve cópias: mexer na proposta não altera as respostas', () => {
    const p = projeto(), pr = propDefault(p, 'a1');
    pr.v.titular.push('bruno');
    assert.deepEqual(p.answers.ana.a1.sent.titular, ['ana']);
  });
});

describe('propOf', () => {
  test('devolve a proposta salva quando existe', () => {
    const p = projeto(), salva = { v: { uso: 'x' } };
    p.proposal.a1 = salva;
    assert.equal(propOf(p, 'a1'), salva);
  });

  test('sem proposta salva, devolve a padrão', () => {
    const p = projeto();
    assert.deepEqual(propOf(p, 'a1'), propDefault(p, 'a1'));
  });
});

describe('dsteps', () => {
  test('notas, as perguntas de decisão do tipo e a revisão no fim', () => {
    const p = projeto();
    assert.deepEqual(dsteps(p, { id: 'a1', type: 'marca' }), ['notas', 'origem', 'titularAtual', 'titular', 'divisao', 'uso', 'materiais', 'comercial', 'portfolio', 'marcaRegistro', 'review']);
    assert.deepEqual(dsteps(p, { id: 'a1', type: 'outro' }), ['notas', 'origem', 'titularAtual', 'titular', 'divisao', 'uso', 'materiais', 'comercial', 'portfolio', 'review']);
  });

  test('não depende das respostas: pontos convergentes também passam pela tela', () => {
    const p = projeto(), antes = dsteps(p, p.assets[0]);
    responder(p, 'carla', { uso: 'Qualquer pessoa que participou' });
    assert.deepEqual(dsteps(p, p.assets[0]), antes);
  });
});

describe('decPick', () => {
  test('pergunta de pessoas: nomes separados por vírgula', () => {
    const p = projeto();
    assert.equal(decPick(p, 'titular', { v: { titular: ['ana', 'carla'] } }), 'Ana, Carla');
    assert.equal(decPick(p, 'titular', { v: { titular: [] } }), '');
    assert.equal(decPick(p, 'titular', { v: {} }), '');
  });

  test('pergunta de opção: o valor escolhido ou vazio', () => {
    assert.equal(decPick(projeto(), 'uso', { v: { uso: 'Só quem for dono' } }), 'Só quem for dono');
    assert.equal(decPick(projeto(), 'uso', { v: {} }), '');
  });
});

describe('lastV', () => {
  test('última versão enviada, ou undefined', () => {
    const p = projeto();
    assert.equal(lastV(p), undefined);
    p.versions.push({ n: 1 }, { n: 2 });
    assert.equal(lastV(p).n, 2);
  });
});
