/* Grupo 1 — Comparação das respostas: itemStatus, norm, distRows, diffCount, decPts. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { itemStatus, norm, distRows, diffCount, decPts } from '@mip/domain';
import { projeto, responder, semResposta, addMembro, resposta } from './fixtures.js';

describe('itemStatus', () => {
  test('respostas iguais de todas as pessoas elegíveis convergem', () => {
    const p = projeto();
    const r = itemStatus(p, 'a1', 'uso');
    assert.equal(r.status, 'conv');
    assert.deepEqual(r.vals.map(x => x.pid), ['ana', 'bruno', 'carla']);
    assert.deepEqual(r.missing, []);
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
  });

  test('uma resposta diferente basta para divergir', () => {
    const p = responder(projeto(), 'carla', { uso: 'Qualquer pessoa que participou' });
    assert.equal(itemStatus(p, 'a1', 'uso').status, 'div');
    assert.equal(itemStatus(p, 'a1', 'comercial').status, 'conv');
  });

  test('regra: nota com amplitude maior que 2 entre as pessoas conta como divergente (caso notas)', () => {
    // Carla recebe 6, 3 e 6: amplitude 3 > 2.
    const p = responder(projeto(), 'bruno', { notas: { ana: 10, bruno: 0, carla: 3 } });
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'div');
  });

  test('regra (limite): nota com amplitude exatamente 2 ainda converge', () => {
    // Carla recebe 6, 4 e 6: amplitude 2, não é maior que 2.
    const p = responder(projeto(), 'bruno', { notas: { ana: 10, bruno: 0, carla: 4 } });
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
  });

  test('notas: a amplitude é medida por pessoa avaliada, não entre pessoas diferentes', () => {
    // Ana recebe 10, Bruno 0: notas muito diferentes entre si, mas cada um recebeu sempre a mesma.
    const p = projeto();
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
  });

  test('notas: valores vazios ou nulos não entram na amplitude', () => {
    const p = projeto();
    responder(p, 'ana', { notas: { ana: 10, bruno: 0, carla: '' } });
    responder(p, 'bruno', { notas: { ana: 10, bruno: 0, carla: null } });
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
  });

  describe('regra: quem não respondeu uma pergunta conta como pendente, nunca como concordância', () => {
    test('notas: quem não enviou deixa a pergunta pendente, mesmo com os demais iguais', () => {
      const p = semResposta(projeto(), 'carla');
      const r = itemStatus(p, 'a1', 'notas');
      assert.equal(r.status, 'pend');
      assert.deepEqual(r.missing, ['carla']);
      assert.equal(r.vals.length, 2);
    });

    test('opção: quem não enviou deixa a pergunta pendente, mesmo com os demais iguais', () => {
      const p = semResposta(projeto(), 'carla');
      const r = itemStatus(p, 'a1', 'uso');
      assert.equal(r.status, 'pend');
      assert.deepEqual(r.missing, ['carla']);
    });

    test('rascunho sem envio não conta como resposta', () => {
      const p = projeto();
      p.answers.carla.a1 = { draft: resposta().draft };
      assert.equal(itemStatus(p, 'a1', 'uso').status, 'pend');
      assert.equal(itemStatus(p, 'a1', 'notas').status, 'pend');
    });

    test('pergunta ausente ou vazia no envio (enviado antes de ela existir) é pendente', () => {
      const p = projeto();
      delete p.answers.bruno.a1.sent.materiais;
      p.answers.carla.a1.sent.comercial = '';
      assert.equal(itemStatus(p, 'a1', 'materiais').status, 'pend');
      assert.deepEqual(itemStatus(p, 'a1', 'materiais').missing, ['bruno']);
      assert.equal(itemStatus(p, 'a1', 'comercial').status, 'pend');
    });

    test('ninguém elegível respondeu: pendente, não convergente por vacuidade', () => {
      const p = projeto();
      p.members.forEach(m => { m.elig = false; });
      assert.equal(itemStatus(p, 'a1', 'uso').status, 'pend');
      assert.equal(itemStatus(p, 'a1', 'notas').status, 'pend');
    });
  });

  test('divergência prevalece sobre pendência', () => {
    const p = semResposta(responder(projeto(), 'bruno', { uso: 'Qualquer pessoa que participou', notas: { ana: 10, bruno: 0, carla: 0 } }), 'carla');
    assert.equal(itemStatus(p, 'a1', 'uso').status, 'div');
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'div');
  });

  test('respostas de quem não é elegível (entrou depois ou saiu) são ignoradas', () => {
    const p = projeto();
    addMembro(p, 'dani', { elig: false });
    addMembro(p, 'eva', { status: 'saiu', elig: true });
    responder(p, 'dani', { uso: 'Qualquer pessoa que participou', notas: { ana: 0, bruno: 10, carla: 0 } });
    responder(p, 'eva', { uso: 'Ninguém, sem um novo acordo da equipe' });
    assert.equal(itemStatus(p, 'a1', 'uso').status, 'conv');
    assert.equal(itemStatus(p, 'a1', 'notas').status, 'conv');
    assert.deepEqual(itemStatus(p, 'a1', 'uso').vals.map(x => x.pid), ['ana', 'bruno', 'carla']);
  });

  test('titular: a ordem das pessoas marcadas não importa', () => {
    const p = projeto();
    responder(p, 'ana', { titular: ['ana', 'carla'] });
    responder(p, 'bruno', { titular: ['carla', 'ana'] });
    responder(p, 'carla', { titular: ['ana', 'carla'] });
    assert.equal(itemStatus(p, 'a1', 'titular').status, 'conv');
  });

  test('titular: lista vazia conta como resposta (ninguém da equipe)', () => {
    const p = projeto();
    ['ana', 'bruno', 'carla'].forEach(pid => responder(p, pid, { titular: [], titularExterno: 'Empresa X' }));
    const r = itemStatus(p, 'a1', 'titular');
    assert.equal(r.status, 'conv');
    assert.equal(r.vals.length, 3);
  });

  test('titular: o titular externo faz parte da comparação', () => {
    const p = responder(projeto(), 'carla', { titularExterno: 'Empresa X' });
    assert.equal(itemStatus(p, 'a1', 'titular').status, 'div');
  });

  test('titular: o titular externo é comparado sem diferenciar maiúsculas e espaços', () => {
    const p = projeto();
    responder(p, 'ana', { titularExterno: 'Empresa X' });
    responder(p, 'bruno', { titularExterno: '  empresa x ' });
    responder(p, 'carla', { titularExterno: 'EMPRESA X' });
    const r = itemStatus(p, 'a1', 'titular');
    assert.equal(r.status, 'conv');
    assert.equal(r.vals[1].ext, '  empresa x ');
  });

  test('o titular externo só pesa na pergunta titular', () => {
    const p = responder(projeto(), 'carla', { titularExterno: 'Empresa X' });
    const r = itemStatus(p, 'a1', 'uso');
    assert.equal(r.status, 'conv');
    assert.ok(r.vals.every(x => x.ext === ''));
  });

  test('usa p.stats quando o servidor já mandou o resultado calculado', () => {
    const p = responder(projeto(), 'carla', { uso: 'Qualquer pessoa que participou' });
    const pronto = { status: 'conv', vals: [], missing: [] };
    p.stats = { a1: { uso: pronto } };
    assert.equal(itemStatus(p, 'a1', 'uso'), pronto);
    // Pergunta sem stats: calcula localmente.
    responder(p, 'carla', { comercial: 'Não' });
    assert.equal(itemStatus(p, 'a1', 'comercial').status, 'div');
  });
});

describe('norm', () => {
  test('pergunta de pessoas: ordena e junta com |', () => {
    assert.equal(norm(['carla', 'ana'], 'titular'), 'ana|carla');
    assert.equal(norm([], 'titular'), '');
    assert.equal(norm(undefined, 'titular'), '');
  });

  test('não altera o array original', () => {
    const v = ['carla', 'ana'];
    norm(v, 'titular');
    assert.deepEqual(v, ['carla', 'ana']);
  });

  test('pergunta de opção: devolve o valor como veio', () => {
    assert.equal(norm('Sim', 'comercial'), 'Sim');
    const v = ['b', 'a'];
    assert.equal(norm(v, 'uso'), v);
  });
});

describe('distRows', () => {
  test('notas: nível de cada pessoa quando todos concordam', () => {
    assert.deepEqual(distRows(projeto(), 'a1', 'notas'), [['Ana', 'Muito'], ['Bruno', 'Nada'], ['Carla', 'Parte']]);
  });

  test('notas: faixa "de X a Y" quando os níveis diferem', () => {
    const p = responder(projeto(), 'bruno', { notas: { ana: 10, bruno: 0, carla: 3 } });
    assert.deepEqual(distRows(p, 'a1', 'notas')[2], ['Carla', 'de pouco a parte']);
  });

  test('notas: valores diferentes no mesmo nível aparecem como um nível só', () => {
    const p = responder(projeto(), 'bruno', { notas: { ana: 10, bruno: 0, carla: 5 } });
    assert.deepEqual(distRows(p, 'a1', 'notas')[2], ['Carla', 'Parte']);
  });

  test('notas: pessoa que ninguém avaliou fica "sem respostas"', () => {
    const p = projeto();
    ['ana', 'bruno', 'carla'].forEach(pid => responder(p, pid, { notas: { bruno: 0, carla: 6 } }));
    assert.deepEqual(distRows(p, 'a1', 'notas')[0], ['Ana', 'sem respostas']);
  });

  test('titular: quantas pessoas marcaram cada uma, e o externo indicado', () => {
    const p = responder(projeto(), 'carla', { titular: ['ana', 'carla'], titularExterno: 'Empresa X' });
    assert.deepEqual(distRows(p, 'a1', 'titular'), [
      ['Ana', '3 de 3 marcaram'],
      ['Bruno', '0 de 3 marcaram'],
      ['Carla', '1 de 3 marcaram'],
      ['Titular fora da equipe indicado', 'Empresa X']
    ]);
  });

  test('titular: o total considera só quem respondeu', () => {
    const p = semResposta(projeto(), 'carla');
    assert.deepEqual(distRows(p, 'a1', 'titular')[0], ['Ana', '2 de 2 marcaram']);
  });

  test('opção: contagem por resposta, no singular e no plural', () => {
    const p = responder(projeto(), 'carla', { uso: 'Qualquer pessoa que participou' });
    assert.deepEqual(distRows(p, 'a1', 'uso'), [['Só quem for dono', '2 pessoas'], ['Qualquer pessoa que participou', '1 pessoa']]);
  });
});

describe('diffCount', () => {
  test('zero quando todos concordam em tudo', () => {
    assert.equal(diffCount(projeto()), 0);
  });

  test('conta cada pergunta divergente, inclusive notas', () => {
    const p = responder(projeto(), 'carla', { titular: ['carla'] });
    assert.equal(diffCount(p), 1);
    responder(p, 'carla', { titular: ['carla'], uso: 'Qualquer pessoa que participou', notas: { ana: 0, bruno: 0, carla: 6 } });
    assert.equal(diffCount(p), 3);
  });

  test('pendência também conta como diferença; só criações aprovadas entram', () => {
    const p = projeto();
    p.assets.push({ id: 'a2', name: 'App', type: 'codigo', cat: 'Código', st: 'sug' });
    assert.equal(diffCount(p), 0);
    p.assets[1].st = 'ok';
    // notas + 9 perguntas de decisão de código (8 base + licenca), todas pendentes.
    assert.equal(diffCount(p), 10);
  });
});

describe('decPts', () => {
  test('vazio quando todos concordam', () => {
    const p = projeto();
    assert.deepEqual(decPts(p, p.assets[0]), []);
  });

  test('inclui notas quando a participação diverge', () => {
    const p = responder(projeto(), 'bruno', { notas: { ana: 3, bruno: 0, carla: 6 } });
    assert.deepEqual(decPts(p, p.assets[0]), ['notas']);
  });

  test('pendentes entram, na ordem das perguntas', () => {
    const p = semResposta(projeto(), 'carla');
    assert.deepEqual(decPts(p, p.assets[0]), ['notas', 'origem', 'titularAtual', 'titular', 'divisao', 'uso', 'materiais', 'comercial', 'portfolio', 'marcaRegistro']);
  });
});
