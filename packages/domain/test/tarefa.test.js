/* Grupo 5 — Próxima tarefa e navegação: taskFor, secInfo, phaseName, stepOf, steps. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { taskFor, secInfo, phaseName, stepOf, steps } from '@mip/domain';
import { projeto, responder, semResposta, addMembro, enviarVersao } from './fixtures.js';

const coleta = (setupStep = 'resp') => { const p = projeto(); p.phase = 'coleta'; p.setupStep = setupStep; return p; };
/* Duas criações aprovadas; todos responderam só a primeira. */
const duasCriacoes = () => { const p = coleta(); p.assets.push({ id: 'a2', name: 'App', type: 'codigo', cat: 'Código', st: 'ok' }); return p; };

describe('taskFor', () => {
  test('quem não é membro ou tem convite pendente precisa aceitar o convite', () => {
    const p = addMembro(projeto(), 'dani', { status: 'pendente' });
    assert.equal(taskFor(p, 'ninguem').label, 'Aceitar convite');
    assert.equal(taskFor(p, 'dani').label, 'Aceitar convite');
  });

  describe('coleta: preparação por quem organiza', () => {
    test('passo 1: equipe', () => {
      const t = taskFor(coleta('equipe'), 'ana');
      assert.deepEqual([t.tab, t.label], ['equipe', 'Adicionar a equipe']);
      assert.match(t.note, /^Passo 1 de 3/);
    });

    test('passo 2: criações', () => {
      const t = taskFor(coleta('ativos'), 'ana');
      assert.deepEqual([t.tab, t.label], ['ativos', 'Cadastrar as criações']);
      assert.match(t.note, /^Passo 2 de 3/);
    });

    test('passo 3: sobre o projeto, só se já há criação aprovada', () => {
      const p = coleta('sobre');
      assert.equal(taskFor(p, 'ana').label, 'Contar sobre o projeto');
      p.assets[0].st = 'sug';
      assert.equal(taskFor(p, 'ana').label, 'Cadastrar as criações');
    });

    test('fora dos passos de preparação mas sem criação aprovada: volta para o cadastro', () => {
      const p = coleta('outro');
      p.assets = [];
      assert.equal(taskFor(p, 'ana').label, 'Cadastrar as criações');
    });

    test('com as perguntas liberadas mas sem criação aprovada, quem organiza também aguarda', () => {
      const p = coleta('resp');
      p.assets = [];
      assert.equal(taskFor(p, 'ana').label, 'Aguardando as criações');
    });

    test('integrante não vê a preparação; vê a espera ou as perguntas', () => {
      const p = coleta('equipe');
      assert.equal(taskFor(p, 'bruno').label, 'Você está em dia');
      p.assets = [];
      assert.equal(taskFor(p, 'bruno').label, 'Aguardando as criações');
    });
  });

  describe('coleta: respondendo', () => {
    test('quem entrou depois só acompanha', () => {
      const p = addMembro(coleta(), 'dani', { elig: false });
      assert.equal(taskFor(p, 'dani').label, 'Acompanhar a equipe');
    });

    test('conta as criações que faltam, no singular e no plural', () => {
      const p = duasCriacoes();
      assert.match(taskFor(p, 'bruno').note, /^1 criação para responder\./);
      semResposta(p, 'bruno');
      const t = taskFor(p, 'bruno');
      assert.equal(t.label, 'Responder as perguntas');
      assert.match(t.note, /^2 criações para responder\./);
    });

    test('rascunho não enviado ainda conta como faltando', () => {
      const p = coleta();
      p.answers.bruno.a1 = { draft: {} };
      assert.equal(taskFor(p, 'bruno').label, 'Responder as perguntas');
    });

    test('"continuar" quando já há progresso salvo em alguma criação que falta', () => {
      const p = duasCriacoes();
      assert.equal(taskFor(p, 'bruno').cta, 'Começar a responder');
      assert.equal(taskFor(p, 'bruno', { a2: 3 }).cta, 'Continuar respondendo');
      assert.equal(taskFor(p, 'bruno', { a1: 3 }).cta, 'Começar a responder');
    });

    test('integrante em dia', () => {
      assert.equal(taskFor(coleta(), 'bruno').label, 'Você está em dia');
    });

    test('quem organiza, em dia: aguarda quem falta, no singular e no plural', () => {
      const p = duasCriacoes();
      responder(p, 'ana', {}, 'a2');
      responder(p, 'bruno', {}, 'a2');
      let t = taskFor(p, 'ana');
      assert.deepEqual([t.label, t.cta], ['Aguardando a equipe', 'Ver andamento']);
      assert.equal(t.note, 'Faltam respostas de 1 pessoa. Você pode lembrar ou encerrar mesmo assim.');
      semResposta(p, 'bruno', 'a2');
      assert.match(taskFor(p, 'ana').note, /^Faltam respostas de 2 pessoas\./);
    });

    test('quem organiza, todos responderam (quem não é elegível não conta)', () => {
      const p = addMembro(coleta(), 'dani', { elig: false });
      const t = taskFor(p, 'ana');
      assert.deepEqual([t.label, t.cta], ['Todos responderam', 'Encerrar respostas']);
    });
  });

  describe('regra: taskFor muda o texto conforme quem recusou e em que fase o projeto está', () => {
    const recusado = (phase = 'decisao', assets = ['a1']) => {
      const p = projeto();
      enviarVersao(p, { carla: { v: 'ok', at: 1 }, bruno: { v: 'no', comment: 'Ajustar o logo', assets, at: 2 } });
      p.phase = phase;
      return p;
    };

    test('quem organiza: ajustar, com quem recusou, a versão, as criações e o comentário', () => {
      const t = taskFor(recusado(), 'ana');
      assert.deepEqual([t.tab, t.label, t.cta], ['decidir', 'Ajustar a proposta', 'Ajustar proposta']);
      assert.equal(t.note, 'Bruno recusou a proposta 1 e pediu ajuste em Logo: "Ajustar o logo"');
    });

    test('quem organiza: sem criações apontadas, a nota não fala em ajuste específico', () => {
      assert.equal(taskFor(recusado('decisao', []), 'ana').note, 'Bruno recusou a proposta 1: "Ajustar o logo"');
      assert.equal(taskFor(recusado('decisao', ['zz']), 'ana').note, 'Bruno recusou a proposta 1: "Ajustar o logo"');
    });

    test('quem recusou: recusa enviada, aguardando quem organiza', () => {
      const t = taskFor(recusado(), 'bruno');
      assert.equal(t.label, 'Sua recusa foi enviada');
      assert.equal(t.note, 'Ana vai ajustar a proposta. Você confirma a nova versão quando ela chegar.');
    });

    test('demais pessoas: a proposta voltou, com quem recusou e o comentário', () => {
      const t = taskFor(recusado(), 'carla');
      assert.equal(t.label, 'A proposta voltou para ajuste');
      assert.equal(t.note, 'Bruno recusou: "Ajustar o logo". Quando a nova versão chegar, todos confirmam de novo.');
    });

    test('a mesma recusa fora da fase de decisão não gera tarefa de ajuste', () => {
      assert.equal(taskFor(recusado('encerrada'), 'ana').label, 'Decidir com a equipe');
      assert.equal(taskFor(recusado('confirmacao'), 'ana').label, 'Confirmar a proposta');
      assert.equal(taskFor(recusado('confirmacao'), 'bruno').label, 'Você está em dia');
    });

    test('só a última versão importa: recusa antiga já respondida não volta', () => {
      const p = recusado();
      enviarVersao(p, {});
      assert.equal(taskFor(p, 'ana').label, 'Decidir com a equipe');
      assert.equal(taskFor(p, 'carla').label, 'Você está em dia');
    });

    test('com várias recusas, a nota nomeia a primeira', () => {
      const p = projeto();
      enviarVersao(p, { carla: { v: 'no', comment: 'C', at: 1 }, bruno: { v: 'no', comment: 'B', at: 2 } });
      assert.equal(taskFor(p, 'ana').note, 'Carla recusou a proposta 1: "C"');
      assert.equal(taskFor(p, 'bruno').label, 'Sua recusa foi enviada');
    });
  });

  describe('decisão sem recusa e respostas encerradas', () => {
    for (const phase of ['decisao', 'encerrada']) {
      test(phase + ': quem organiza decide, integrante acompanha', () => {
        const p = projeto(); p.phase = phase;
        assert.deepEqual([taskFor(p, 'ana').tab, taskFor(p, 'ana').label], ['decidir', 'Decidir com a equipe']);
        assert.deepEqual([taskFor(p, 'bruno').tab, taskFor(p, 'bruno').label], ['proj', 'Você está em dia']);
      });
    }
  });

  describe('confirmação', () => {
    const confirmacao = (conf, semAcordo = false) => {
      const p = projeto(), v = enviarVersao(p, conf);
      v.snap.a1.semAcordo = semAcordo;
      p.phase = 'confirmacao';
      return p;
    };
    const todosOk = () => ({ ana: { v: 'ok' }, bruno: { v: 'ok' }, carla: { v: 'ok' } });

    test('quem ainda não se posicionou confirma; quem já se posicionou está em dia', () => {
      const p = confirmacao({ ana: { v: 'ok' } });
      assert.deepEqual([taskFor(p, 'bruno').tab, taskFor(p, 'bruno').label], ['conf', 'Confirmar a proposta']);
      assert.equal(taskFor(p, 'ana').label, 'Você está em dia');
    });

    test('quem não é elegível não confirma', () => {
      const p = addMembro(confirmacao({}), 'dani', { elig: false });
      assert.equal(taskFor(p, 'dani').label, 'Você está em dia');
    });

    test('todos confirmaram mas há criação sem acordo: quem organiza reabre, demais aguardam', () => {
      const p = confirmacao(todosOk(), true);
      const org = taskFor(p, 'ana'), int = taskFor(p, 'bruno');
      assert.deepEqual([org.tab, org.label, org.cta], ['conf', 'Falta acordo em Logo', 'Reabrir proposta']);
      assert.deepEqual([int.tab, int.label], ['proj', 'Falta acordo em Logo']);
      assert.match(int.note, /Ana envia uma nova proposta\.$/);
    });

    test('sem acordo, mas nem todos confirmaram: segue a confirmação normal', () => {
      const p = confirmacao({ ana: { v: 'ok' }, bruno: { v: 'ok' } }, true);
      assert.equal(taskFor(p, 'carla').label, 'Confirmar a proposta');
      assert.equal(taskFor(p, 'ana').label, 'Você está em dia');
    });

    test('todos confirmaram e há acordo em tudo: em dia', () => {
      assert.equal(taskFor(confirmacao(todosOk()), 'ana').label, 'Você está em dia');
    });
  });

  test('consolidado: acordo confirmado', () => {
    const p = projeto(); p.phase = 'consolidado';
    assert.deepEqual([taskFor(p, 'bruno').tab, taskFor(p, 'bruno').label], ['memorial', 'Acordo confirmado']);
  });
});

describe('secInfo', () => {
  test('equipe: conta só membros ativos, no singular e no plural', () => {
    const p = addMembro(projeto(), 'dani', { status: 'pendente' });
    assert.deepEqual(secInfo(p, 'ana', 'equipe'), { on: true, s: '3 pessoas' });
    p.members = [p.members[0]];
    assert.equal(secInfo(p, 'ana', 'equipe').s, '1 pessoa');
  });

  test('ativos: criações aprovadas e sugestões para avaliar', () => {
    const p = projeto();
    assert.deepEqual(secInfo(p, 'ana', 'ativos'), { on: true, s: '1 criação' });
    p.assets.push({ id: 'a2', st: 'ok' }, { id: 'a3', st: 'sug' }, { id: 'a4', st: 'rej' });
    assert.equal(secInfo(p, 'ana', 'ativos').s, '2 criações · 1 sugestão para avaliar');
    p.assets.push({ id: 'a5', st: 'sug' });
    assert.equal(secInfo(p, 'ana', 'ativos').s, '2 criações · 2 sugestões para avaliar');
  });

  test('sobre: quantas perguntas obrigatórias foram respondidas', () => {
    const p = projeto();
    assert.equal(secInfo(p, 'ana', 'sobre').s, '0 de 3 respondidas');
    p.sobre = { contas: 'x' };
    assert.equal(secInfo(p, 'ana', 'sobre').s, '1 de 3 respondidas');
    p.sobre = { contas: 'x', acordo: 'Nenhum', edital: 'Sim' };
    assert.deepEqual(secInfo(p, 'ana', 'sobre'), { on: true, s: 'Respondido' });
  });

  test('resp: progresso das próprias respostas', () => {
    const p = addMembro(projeto(), 'dani', { elig: false });
    assert.deepEqual(secInfo(p, 'dani', 'resp'), { on: false, s: 'Você não responde desta vez' });
    assert.deepEqual(secInfo(p, 'ana', 'resp'), { on: true, s: 'Respondidas' });
    p.assets.push({ id: 'a2', type: 'codigo', st: 'ok' });
    assert.equal(secInfo(p, 'ana', 'resp').s, '1 de 2 criações respondidas');
    p.assets = [];
    assert.deepEqual(secInfo(p, 'ana', 'resp'), { on: false, s: 'Depois do cadastro das criações' });
  });

  test('coleta: quantas pessoas concluíram, ou encerrada', () => {
    const p = coleta();
    assert.equal(secInfo(p, 'ana', 'coleta').s, '3 de 3 pessoas concluíram');
    semResposta(p, 'carla');
    assert.equal(secInfo(p, 'ana', 'coleta').s, '2 de 3 pessoas concluíram');
    p.assets = [];
    assert.equal(secInfo(p, 'ana', 'coleta').s, '0 de 3 pessoas concluíram');
    p.phase = 'decisao';
    assert.equal(secInfo(p, 'ana', 'coleta').s, 'Respostas encerradas');
  });

  test('decidir: fechado na coleta; depois, quantos pontos diferem', () => {
    const p = coleta();
    assert.deepEqual(secInfo(p, 'ana', 'decidir'), { on: false, s: 'Abre após o encerramento da coleta' });
    p.phase = 'decisao';
    assert.deepEqual(secInfo(p, 'ana', 'decidir'), { on: true, s: 'Todos concordaram' });
    responder(p, 'carla', { uso: 'Qualquer pessoa que participou' });
    assert.equal(secInfo(p, 'ana', 'decidir').s, '1 ponto com diferença');
    responder(p, 'carla', { uso: 'Qualquer pessoa que participou', comercial: 'Não' });
    assert.equal(secInfo(p, 'ana', 'decidir').s, '2 pontos com diferença');
  });

  test('conf: fechado sem proposta; depois, quantos confirmaram', () => {
    const p = projeto();
    assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: false, s: 'Quando a proposta for enviada' });
    enviarVersao(p, { ana: { v: 'ok' }, bruno: { v: 'no', comment: 'x' } });
    assert.deepEqual(secInfo(p, 'ana', 'conf'), { on: true, s: '1 de 3 confirmaram' });
  });

  test('registro do acordo: fechado sem proposta; prévia ou pronto', () => {
    const p = projeto();
    assert.deepEqual(secInfo(p, 'ana', 'memorial'), { on: false, s: 'Quando a proposta for enviada' });
    enviarVersao(p);
    p.phase = 'confirmacao';
    assert.deepEqual(secInfo(p, 'ana', 'memorial'), { on: true, s: 'Prévia disponível' });
    p.phase = 'consolidado';
    assert.deepEqual(secInfo(p, 'ana', 'memorial'), { on: true, s: 'Pronto' });
  });
});

describe('phaseName', () => {
  test('na coleta, durante a preparação, é "Preparando"', () => {
    for (const s of ['equipe', 'ativos', 'sobre']) assert.equal(phaseName({ phase: 'coleta', setupStep: s }), 'Preparando');
  });

  test('nos demais casos, o nome da fase', () => {
    assert.equal(phaseName({ phase: 'coleta', setupStep: 'resp' }), 'Respondendo');
    assert.equal(phaseName({ phase: 'decisao', setupStep: 'equipe' }), 'Decidindo');
    assert.equal(phaseName({ phase: 'encerrada' }), 'Respostas encerradas');
    assert.equal(phaseName({ phase: 'confirmacao' }), 'Em confirmação');
    assert.equal(phaseName({ phase: 'consolidado' }), 'Acordo confirmado');
  });
});

describe('stepOf', () => {
  test('tela de cada pergunta', () => {
    assert.equal(stepOf('notas'), 'contrib');
    assert.equal(stepOf('desc'), 'contrib');
    assert.equal(stepOf('titularAtual'), 'contrib');
    assert.equal(stepOf('titular'), 'donos');
    assert.equal(stepOf('divisao'), 'donos');
    assert.equal(stepOf('licenca'), 'uso');
    assert.equal(stepOf('invDivulgacao'), 'uso');
    assert.equal(stepOf('inexistente'), undefined);
  });
});

describe('steps', () => {
  test('três telas e a revisão', () => {
    assert.deepEqual(steps(), ['contrib', 'donos', 'uso', 'review']);
  });
});
