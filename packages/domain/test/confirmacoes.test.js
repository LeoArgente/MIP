/* Quem se posiciona sobre uma versão é quem era elegível nela (eligNaVersao), não a equipe de hoje: as confirmações do
   registro, a situação da proposta, a tarefa de cada pessoa e o "x de N confirmaram" seguem a versão. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eligNaVersao, membrosCongelados, memorialBody, taskFor, secInfo } from '@mip/domain';
import { projeto, enviarVersao, addMembro, semResposta, T, T_TXT } from './fixtures.js';

const OK = { v: 'ok', at: T };
/* Versão enviada com a equipe congelada (como a API envia hoje). */
const enviarComEquipe = (p, conf = {}) => { const v = enviarVersao(p, conf); v.membros = membrosCongelados(p); return v; };
const linhas = p => memorialBody(p, T).split('\n');
const situacao = p => linhas(p)[2];
const confirmacoes = p => { const L = linhas(p), i = L.findIndex(l => l.startsWith('CONFIRMAÇÕES DA PROPOSTA ')), f = L.indexOf('', i); return L.slice(i + 1, f); };
const tirar = (p, pid) => { p.members.find(m => m.pid === pid).status = 'naopart'; return p; };

describe('eligNaVersao', () => {
  test('versão com membros: só quem estava ativo e elegível no envio, na ordem da equipe', () => {
    const p = projeto();
    tirar(p, 'bruno');
    addMembro(p, 'dani', { status: 'pendente' });
    addMembro(p, 'eva');
    assert.deepEqual(eligNaVersao(enviarComEquipe(p)), ['ana', 'carla']);
  });

  test('versão com membros: mudar a equipe depois do envio não muda a lista', () => {
    const p = projeto(), v = enviarComEquipe(p);
    tirar(p, 'carla');
    addMembro(p, 'dani', { elig: true });
    assert.deepEqual(eligNaVersao(v), ['ana', 'bruno', 'carla']);
  });

  test('versão antiga, sem membros: a lista vem dos relatos (um por pessoa elegível no envio)', () => {
    const p = projeto();
    tirar(p, 'bruno');
    const v = enviarVersao(p);
    assert.equal(v.membros, undefined);
    tirar(p, 'carla');
    addMembro(p, 'dani', { elig: true });
    assert.deepEqual(eligNaVersao(v), ['ana', 'carla']);
  });

  test('versão antiga: quem era elegível e não respondeu também conta (o relato existe, como "não respondeu")', () => {
    const p = semResposta(projeto(), 'carla'), v = enviarVersao(p);
    assert.equal(v.snap.a1.relatos.find(r => r.pid === 'carla').respondido, false);
    assert.deepEqual(eligNaVersao(v), ['ana', 'bruno', 'carla']);
  });

  test('versão antiga com várias criações: cada pessoa uma vez', () => {
    const p = projeto();
    p.assets.push({ id: 'a2', name: 'App', type: 'codigo', cat: 'Código', st: 'ok' });
    const v = enviarVersao(p);
    assert.deepEqual(eligNaVersao(v), ['ana', 'bruno', 'carla']);
  });
});

/* O travamento: todos confirmaram menos Carla, e Carla foi tirada das respostas depois do envio. A API agora recusa
   essa ação durante a confirmação; um projeto que já ficou nesse estado fecha quando Carla se posiciona. */
describe('travamento: pessoa da versão tirada das respostas antes de confirmar', () => {
  for (const [nome, enviar] of [['com membros', enviarComEquipe], ['versão antiga, sem membros', enviarVersao]]) {
    describe(nome, () => {
      const travado = () => { const p = projeto(); p.phase = 'confirmacao'; const v = enviar(p, { ana: OK, bruno: OK }); tirar(p, 'carla'); return { p, v }; };

      test('a proposta continua em confirmação, esperando Carla', () => {
        const { p } = travado();
        assert.equal(situacao(p), 'Situação da proposta 1: em confirmação');
        assert.deepEqual(confirmacoes(p), ['- Ana: confirmou em ' + T_TXT, '- Bruno: confirmou em ' + T_TXT, '- Carla: ainda não se posicionou']);
        assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: true, s: '2 de 3 confirmaram' });
      });

      test('Carla tem a tarefa de confirmar; quem já confirmou aguarda', () => {
        const { p } = travado();
        assert.deepEqual([taskFor(p, 'carla').tab, taskFor(p, 'carla').label], ['conf', 'Confirmar a proposta']);
        assert.equal(taskFor(p, 'ana').label, 'Você está em dia');
      });

      test('quando Carla confirma, a proposta fica confirmada por todos', () => {
        const { p, v } = travado();
        v.conf.carla = OK;
        assert.equal(situacao(p), 'Situação da proposta 1: confirmada por todos');
        assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: true, s: '3 de 3 confirmaram' });
      });

      test('com criação sem acordo, "falta acordo" só aparece quando Carla também confirmou', () => {
        const { p, v } = travado();
        v.snap.a1.semAcordo = true;
        assert.equal(taskFor(p, 'ana').label, 'Você está em dia');
        assert.equal(taskFor(p, 'carla').label, 'Confirmar a proposta');
        v.conf.carla = OK;
        assert.equal(taskFor(p, 'ana').label, 'Falta acordo em Logo');
        assert.equal(taskFor(p, 'carla').label, 'Falta acordo em Logo');
      });
    });
  }
});

describe('confirmações seguem a versão, não a equipe de hoje', () => {
  test('pessoa tirada das respostas depois de confirmar continua nas confirmações', () => {
    for (const enviar of [enviarComEquipe, enviarVersao]) {
      const p = projeto();
      enviar(p, { ana: OK, bruno: OK, carla: OK });
      p.phase = 'consolidado';
      tirar(p, 'carla');
      assert.deepEqual(confirmacoes(p), ['- Ana: confirmou em ' + T_TXT, '- Bruno: confirmou em ' + T_TXT, '- Carla: confirmou em ' + T_TXT]);
      assert.equal(situacao(p), 'Situação da proposta 1: confirmada por todos');
    }
  });

  test('"confirmada por todos" não espera quem passou a ser elegível depois do envio', () => {
    for (const enviar of [enviarComEquipe, enviarVersao]) {
      const p = projeto();
      p.phase = 'confirmacao';
      enviar(p, { ana: OK, bruno: OK, carla: OK });
      addMembro(p, 'dani', { elig: true });
      assert.equal(situacao(p), 'Situação da proposta 1: confirmada por todos');
      assert.ok(!confirmacoes(p).some(l => l.startsWith('- Dani')));
      assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: true, s: '3 de 3 confirmaram' });
      assert.equal(taskFor(p, 'dani').label, 'Você está em dia');
    }
  });

  test('quem já tinha saído das respostas no envio não entra nas confirmações nem na contagem', () => {
    for (const enviar of [enviarComEquipe, enviarVersao]) {
      const p = projeto();
      p.phase = 'confirmacao';
      tirar(p, 'carla');
      enviar(p, { ana: OK, bruno: OK });
      assert.equal(situacao(p), 'Situação da proposta 1: confirmada por todos');
      assert.deepEqual(confirmacoes(p), ['- Ana: confirmou em ' + T_TXT, '- Bruno: confirmou em ' + T_TXT]);
      assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: true, s: '2 de 2 confirmaram' });
      assert.equal(taskFor(p, 'carla').label, 'Você está em dia');
    }
  });
});
