/* Grupo 6 — Memorial (registro do acordo): snapshot, memorialBody, memorialText. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, memorialBody, memorialText, partOf, decQs, propDefault, LIMITS, PCT_SIM, PCT_NEG } from '../src/index.js';
import { projeto, responder, semResposta, addMembro, enviarVersao, T, T_TXT } from './fixtures.js';

describe('snapshot', () => {
  test('uma entrada por criação aprovada', () => {
    const p = projeto();
    p.assets.push({ id: 'a2', name: 'Sugerida', type: 'outro', st: 'sug' });
    assert.deepEqual(Object.keys(snapshot(p)), ['a1']);
  });

  test('sem proposta salva: congela a proposta padrão, a participação e as perguntas', () => {
    const p = projeto(), s = snapshot(p).a1, pr = propDefault(p, 'a1');
    assert.equal(s.name, 'Logo');
    assert.equal(s.cat, 'Marca');
    assert.equal(s.desc, '');
    assert.equal(s.link, '');
    assert.deepEqual(s.part, partOf(p, 'a1'));
    assert.deepEqual(s.qs, decQs(p.assets[0]));
    assert.deepEqual(s.v, pr.v);
    assert.deepEqual([s.externo, s.percentual, s.texto, s.semAcordo], ['', {}, '', false]);
  });

  test('com proposta salva: usa a proposta e normaliza "sem acordo" para booleano', () => {
    const p = projeto();
    p.assets[0].desc = 'Logo principal';
    p.assets[0].link = 'https://x.com';
    p.proposal.a1 = { v: { uso: 'x' }, externo: 'Empresa X', percentual: { ana: 100 }, texto: 'obs', semAcordo: 1 };
    const s = snapshot(p).a1;
    assert.deepEqual([s.desc, s.link], ['Logo principal', 'https://x.com']);
    assert.deepEqual(s.v, { uso: 'x' });
    assert.deepEqual([s.externo, s.percentual, s.texto, s.semAcordo], ['Empresa X', { ana: 100 }, 'obs', true]);
  });

  test('é uma cópia: mudar a proposta depois não altera a versão enviada', () => {
    const p = projeto();
    p.proposal.a1 = propDefault(p, 'a1');
    const s = snapshot(p).a1;
    p.proposal.a1.v.titular.push('bruno');
    p.proposal.a1.percentual.ana = 1;
    assert.deepEqual(s.v.titular, ['ana']);
    assert.deepEqual(s.percentual, {});
  });

  test('relatos: um por pessoa elegível, com o que ela declarou', () => {
    const p = semResposta(projeto(), 'carla');
    addMembro(p, 'dani', { elig: false });
    responder(p, 'ana', { link: 'https://ev.com', titularAtualNome: 'Ana', titularAtualBase: 'contrato', titularExterno: 'Empresa X' });
    const r = snapshot(p).a1.relatos;
    assert.deepEqual(r.map(x => x.pid), ['ana', 'bruno', 'carla']);
    assert.deepEqual(r[0], {
      pid: 'ana', respondido: true, desc: 'fiz', evidencia: 'https://ev.com', origem: 'Criada neste projeto', titularAtual: 'Não sei',
      titularAtualNome: 'Ana', titularAtualBase: 'contrato', titularExterno: 'Empresa X'
    });
    assert.deepEqual(r[2], {
      pid: 'carla', respondido: false, desc: '', evidencia: '', origem: '', titularAtual: '', titularAtualNome: '', titularAtualBase: '', titularExterno: ''
    });
  });
});

describe('memorialBody', () => {
  const linhas = (p, at = T) => memorialBody(p, at).split('\n');
  /* Bloco de linhas que começa na linha exata `inicio` e vai até a próxima linha vazia. */
  const bloco = (L, inicio) => { const i = L.indexOf(inicio); assert.notEqual(i, -1, 'linha não encontrada: ' + inicio); const f = L.indexOf('', i); return L.slice(i, f === -1 ? undefined : f); };
  const base = (conf = {}) => { const p = projeto(); p.phase = 'confirmacao'; enviarVersao(p, conf); return p; };

  test('cabeçalho: projeto, contexto, situação e data', () => {
    const L = linhas(base());
    assert.deepEqual(L.slice(0, 4), ['REGISTRO DO ACORDO', 'Projeto: App Rotas (Disciplina)', 'Situação da proposta 1: em confirmação', 'Gerado em: ' + T_TXT]);
  });

  test('sem contexto e confirmada por todos', () => {
    const p = base({ ana: { v: 'ok', at: T }, bruno: { v: 'ok', at: T }, carla: { v: 'ok', at: T } });
    delete p.context;
    const L = linhas(p);
    assert.equal(L[1], 'Projeto: App Rotas (sem contexto)');
    assert.equal(L[2], 'Situação da proposta 1: confirmada por todos');
  });

  test('sobre o projeto: cada pergunta visível, com "não informado" quando falta', () => {
    const p = base();
    assert.deepEqual(bloco(linhas(p), 'SOBRE O PROJETO'), [
      'SOBRE O PROJETO',
      '- Domínio, contas, repositório e marca: não informado',
      '- Acordo existente: não informado',
      '- Contrato, regulamento ou edital: não informado'
    ]);
    p.sobre = { contas: 'GitHub da Ana', acordo: 'Verbal', edital: 'Sim' };
    assert.deepEqual(bloco(linhas(p), 'SOBRE O PROJETO').slice(1), [
      '- Domínio, contas, repositório e marca: GitHub da Ana',
      '- Acordo existente: Verbal',
      '- Contrato, regulamento ou edital: Sim',
      '- Qual documento: não informado'
    ]);
  });

  test('participantes: papel, situação e perfil declarado', () => {
    const p = base();
    p.members[0].perfil = { funcao: 'gestão', investiu: 'Sim' };
    p.members[1].perfil = { funcao: 'dev' };
    p.members[2].status = 'naopart';
    addMembro(p, 'dani', { status: 'pendente' });
    addMembro(p, 'eva', { elig: false });
    assert.deepEqual(bloco(linhas(p), 'PARTICIPANTES'), [
      'PARTICIPANTES',
      '- Ana, quem organiza',
      '  Função declarada: gestão · Investiu dinheiro: Sim',
      '- Bruno, integrante',
      '  Função declarada: dev · Investiu dinheiro: não informado',
      '- Carla, integrante (não respondeu)',
      '- Dani, integrante (convite pendente)',
      '- Eva, integrante (entrou depois das respostas)'
    ]);
  });

  test('por criação: estado, participação, relatos, decisões, percentuais e pendências', () => {
    const p = projeto(); p.phase = 'confirmacao';
    p.assets[0].desc = 'Logo principal';
    p.assets[0].link = 'https://x.com/logo';
    responder(p, 'ana', { link: 'https://ev.com', titularAtualNome: 'Ana', titularAtualBase: 'nenhum', titularExterno: 'Empresa X' });
    semResposta(p, 'carla');
    p.proposal.a1 = { ...propDefault(projeto(), 'a1'), externo: 'Empresa X', texto: 'Falta conversar' };
    enviarVersao(p);
    assert.deepEqual(bloco(linhas(p), 'Logo (Marca)'), [
      'Logo (Marca)',
      '  Descrição: Logo principal',
      '  Link da criação: https://x.com/logo',
      '  Estado da decisão: proposta registrada',
      '  Participação percebida: Ana: muito · Carla: parte. Não define titularidade ou quotas.',
      '  Relatos individuais sobre origem e titularidade atual:',
      '  - Ana: respondeu',
      '    Origem declarada: Criada neste projeto',
      '    Documento de titularidade: Não sei',
      '    Titular indicado hoje: Ana',
      '    Titular pretendido fora da equipe, segundo esta pessoa: Empresa X',
      '    Base ou documento: nenhum',
      '    Contribuição descrita: fiz',
      '    Evidência: https://ev.com',
      '  - Bruno: respondeu',
      '    Origem declarada: Criada neste projeto',
      '    Documento de titularidade: Não sei',
      '    Titular indicado hoje: não informado',
      '    Base ou documento: não informado',
      '    Contribuição descrita: fiz',
      '    Evidência: não informada',
      '  - Carla: não respondeu',
      '  Decisões e condições propostas:',
      '  - Origem: Criada neste projeto',
      '  - Documento de titularidade: Não sei',
      '  - Titularidade pretendida: Ana',
      '  - Percentuais combinados: Ainda não, precisamos negociar',
      '  - Uso após a saída: Só quem for dono',
      '  - Arquivos e dados na saída: Só o que a própria pessoa fez',
      '  - Uso comercial: Sim',
      '  - Portfólio: Todos que criaram',
      '  - Situação da marca: Sim, com evidência',
      '  - Titular pretendido fora da equipe: Empresa X',
      '  Percentuais de titularidade combinados: Não acordados',
      '  Explicações e pendências anotadas: Falta conversar',
      '  Pendências identificadas: percentuais ainda não negociados; titularidade atual a verificar'
    ]);
  });

  test('por criação: sem categoria, sem acordo, sem participação gravada e com percentuais', () => {
    const p = projeto();
    delete p.assets[0].cat;
    p.proposal.a1 = { ...propDefault(p, 'a1'), semAcordo: true, percentual: { ana: 100 } };
    p.proposal.a1.v.divisao = PCT_SIM;
    const v = enviarVersao(p);
    delete v.snap.a1.part;
    const B = bloco(linhas(p), 'Logo (criação)');
    assert.ok(B.includes('  Estado da decisão: SEM ACORDO'));
    assert.ok(B.includes('  Participação percebida: não informada. Não define titularidade ou quotas.'));
    assert.ok(B.includes('  Percentuais de titularidade combinados: Ana: 100%'));
    assert.ok(!B.some(l => l.startsWith('  Descrição') || l.startsWith('  Link da criação') || l.startsWith('  Explicações')));
  });

  test('só entram criações aprovadas hoje e presentes na versão enviada', () => {
    const p = projeto();
    p.assets.push({ id: 'a2', name: 'App', type: 'codigo', cat: 'Código', st: 'ok' });
    enviarVersao(p);
    p.assets.push({ id: 'a3', name: 'Depois', type: 'outro', cat: 'Outro', st: 'ok' });
    p.assets[1].st = 'sug';
    const L = linhas(p);
    assert.ok(L.includes('Logo (Marca)'));
    assert.ok(!L.includes('App (Código)'));
    assert.ok(!L.includes('Depois (Outro)'));
  });

  describe('pendências identificadas', () => {
    const SEM_PEND = { origem: 'Criada neste projeto', titularAtual: 'Sim, há contrato, termo ou registro', divisao: 'Não se aplica a esta criação' };
    const pend = (v, semAcordo = false) => {
      const p = projeto(), s = enviarVersao(p).snap.a1;
      s.v = { ...SEM_PEND, ...v }; s.semAcordo = semAcordo;
      return linhas(p).find(l => l.startsWith('  Pendências identificadas: ')).slice('  Pendências identificadas: '.length);
    };

    test('nenhuma', () => assert.equal(pend({}), 'nenhuma marcada na proposta'));

    const casos = [
      [{ divisao: PCT_NEG }, 'percentuais ainda não negociados'],
      [{ titularAtual: 'Não sei' }, 'titularidade atual a verificar'],
      [{ titularAtual: 'Ainda não sabemos' }, 'titularidade atual a verificar'],
      [{ origem: 'Não sei' }, 'origem a verificar'],
      [{ terceiros: 'Sim, autorização pendente' }, 'direitos de terceiros a verificar'],
      [{ terceiros: 'Ainda não sabemos' }, 'direitos de terceiros a verificar'],
      [{ audioDireitos: 'Autorização pendente' }, 'autorizações de áudio a verificar'],
      [{ audioDireitos: 'Ainda não sabemos' }, 'autorizações de áudio a verificar'],
      [{ marcaRegistro: 'Ainda precisa de busca ou registro' }, 'situação da marca a verificar'],
      [{ marcaRegistro: 'Há conflito ou uso de terceiro' }, 'situação da marca a verificar'],
      [{ invDivulgacao: 'Ainda não sabemos' }, 'condições de divulgação a definir'],
      [{ invDivulgacao: 'Avaliar proteção e confidencialidade antes' }, 'condições de divulgação a definir']
    ];
    for (const [v, txt] of casos) test(JSON.stringify(v) + ' → ' + txt, () => assert.equal(pend(v), txt));

    test('respostas que não geram pendência', () => {
      assert.equal(pend({ terceiros: 'Não identificamos', audioDireitos: 'Não se aplica', marcaRegistro: 'Sim, com evidência', invDivulgacao: 'Pode divulgar após decisão da equipe', titularAtual: 'Não, existe apenas um acordo verbal' }), 'nenhuma marcada na proposta');
    });

    test('sem acordo, e todas juntas na ordem fixa', () => {
      assert.equal(pend({ divisao: PCT_NEG, titularAtual: 'Não sei', origem: 'Não sei', terceiros: 'Ainda não sabemos', audioDireitos: 'Ainda não sabemos', marcaRegistro: 'Há conflito ou uso de terceiro', invDivulgacao: 'Ainda não sabemos' }, true),
        'decisão da criação ainda sem acordo; percentuais ainda não negociados; titularidade atual a verificar; origem a verificar; direitos de terceiros a verificar; autorizações de áudio a verificar; situação da marca a verificar; condições de divulgação a definir');
    });
  });

  test('confirmações da última proposta, só de quem é elegível', () => {
    const p = projeto();
    enviarVersao(p, { bruno: { v: 'no', comment: 'Ajustar', at: T } });
    addMembro(p, 'dani', { elig: false });
    enviarVersao(p, { ana: { v: 'ok', at: T }, bruno: { v: 'no', comment: 'Ainda não', at: T } });
    assert.deepEqual(bloco(linhas(p), 'CONFIRMAÇÕES DA PROPOSTA 2'), [
      'CONFIRMAÇÕES DA PROPOSTA 2',
      '- Ana: confirmou em ' + T_TXT,
      '- Bruno: recusou (Ainda não) em ' + T_TXT,
      '- Carla: ainda não se posicionou'
    ]);
  });

  test('recusas de todas as versões, inclusive a atual', () => {
    const p = projeto();
    enviarVersao(p, { bruno: { v: 'no', comment: 'Ajustar', at: T }, carla: { v: 'ok', at: T } });
    enviarVersao(p, { carla: { v: 'no', comment: 'Mudou', at: T } });
    assert.deepEqual(bloco(linhas(p), 'RECUSAS E AJUSTES ANTERIORES'), [
      'RECUSAS E AJUSTES ANTERIORES',
      '- Bruno recusou a proposta 1: Ajustar',
      '- Carla recusou a proposta 2: Mudou'
    ]);
  });

  test('sem recusas não há a seção; o texto de limites fecha o registro', () => {
    const L = linhas(base({ ana: { v: 'ok', at: T } }));
    assert.ok(!L.includes('RECUSAS E AJUSTES ANTERIORES'));
    assert.equal(L.at(-1), LIMITS);
    assert.equal(L.at(-2), '');
  });
});

describe('memorialText', () => {
  test('devolve o corpo guardado no registro', () => {
    assert.equal(memorialText({ body: 'texto do acordo', at: 1 }), 'texto do acordo');
  });
});
