/* Grupo 3 — Validações: propError, stepErrors, sendErrors, sobreErrors, perfilErrors, perfilDone. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { propError, propDefault, stepErrors, sendErrors, sobreErrors, perfilErrors, perfilDone, PCT_SIM, PCT_NEG } from '../src/index.js';
import { projeto, addMembro, BASE } from './fixtures.js';

const MSG_PCT = 'Informe percentuais válidos para todos os titulares pretendidos, somando 100%.';
/* Projeto com uma proposta salva para a1, partindo da padrão (tudo convergente) e com as mudanças dadas. */
function comProposta(mod = {}, v = {}) {
  const p = projeto(), pr = propDefault(p, 'a1');
  p.proposal.a1 = { ...pr, ...mod, v: { ...pr.v, ...v } };
  return p;
}

describe('propError', () => {
  test('sem proposta salva, valida a padrão; tudo convergente não tem erro', () => {
    assert.equal(propError(projeto(), 'a1'), null);
  });

  test('lista o que falta, com o nome curto e na ordem das perguntas', () => {
    const p = comProposta({}, { uso: '', titular: [] });
    assert.equal(propError(p, 'a1'), 'Falta preencher: Titularidade pretendida, Uso após a saída. Ou marque que ainda não há acordo.');
  });

  test('titular externo preenchido supre a titularidade sem ninguém da equipe', () => {
    assert.equal(propError(comProposta({ externo: 'Empresa X' }, { titular: [] }), 'a1'), null);
    assert.match(propError(comProposta({ externo: '   ' }, { titular: [] }), 'a1'), /Titularidade pretendida/);
  });

  test('"sem acordo" dispensa campos e percentuais', () => {
    assert.equal(propError(comProposta({ semAcordo: true }, { uso: '', titular: [] }), 'a1'), null);
    assert.equal(propError(comProposta({ semAcordo: true, percentual: { ana: 1 } }, { divisao: PCT_SIM }), 'a1'), null);
  });

  test('sem percentuais combinados, os percentuais não são validados', () => {
    assert.equal(propError(comProposta({ percentual: { ana: 'lixo' } }, { divisao: PCT_NEG }), 'a1'), null);
  });

  test('percentuais combinados: soma 100 passa, inclusive vindo como texto', () => {
    const v = { divisao: PCT_SIM, titular: ['ana', 'carla'] };
    assert.equal(propError(comProposta({ percentual: { ana: 60, carla: 40 } }, v), 'a1'), null);
    assert.equal(propError(comProposta({ percentual: { ana: '60', carla: '40' } }, v), 'a1'), null);
  });

  test('percentuais combinados: tolera erro de arredondamento de até 0,001', () => {
    const v = { divisao: PCT_SIM, titular: ['ana', 'bruno', 'carla'] };
    assert.equal(propError(comProposta({ percentual: { ana: 33.3333, bruno: 33.3333, carla: 33.3334 } }, v), 'a1'), null);
    assert.equal(propError(comProposta({ percentual: { ana: 33.3, bruno: 33.3, carla: 33.3 } }, v), 'a1'), MSG_PCT);
  });

  test('percentuais combinados: falta, vazio, não numérico ou fora de 0..100 é erro', () => {
    const v = { divisao: PCT_SIM, titular: ['ana', 'carla'] };
    for (const percentual of [{ ana: 100 }, { ana: 100, carla: '' }, { ana: 100, carla: 'x' }, { ana: 120, carla: -20 }, {}]) {
      assert.equal(propError(comProposta({ percentual }, v), 'a1'), MSG_PCT, JSON.stringify(percentual));
    }
  });

  test('percentuais combinados: o titular externo entra na soma', () => {
    const v = { divisao: PCT_SIM, titular: ['ana'] };
    assert.equal(propError(comProposta({ externo: 'Empresa X', percentual: { ana: 80 } }, v), 'a1'), MSG_PCT);
    assert.equal(propError(comProposta({ externo: 'Empresa X', percentual: { ana: 80, __externo__: 20 } }, v), 'a1'), null);
  });
});

const CONTRIB_OK = () => ({ notas: { ana: 10, bruno: 0, carla: 6 }, desc: 'fiz', origem: BASE.origem, titularAtual: BASE.titularAtual, link: '' });

describe('stepErrors', () => {
  const a = { id: 'a1', type: 'marca' };

  test('contrib: tudo preenchido não tem erro', () => {
    assert.deepEqual(stepErrors(projeto(), 'ana', a, CONTRIB_OK(), 'contrib'), {});
  });

  test('contrib: falta nota para alguém elegível', () => {
    const d = { ...CONTRIB_OK(), notas: { ana: 10, bruno: 0 } };
    assert.deepEqual(stepErrors(projeto(), 'ana', a, d, 'contrib'), { 'a1:notas': 'Escolha quanto cada pessoa fez' });
  });

  test('contrib: quem não é elegível não precisa de nota', () => {
    const p = addMembro(projeto(), 'dani', { elig: false });
    assert.deepEqual(stepErrors(p, 'ana', a, CONTRIB_OK(), 'contrib'), {});
  });

  test('contrib: descrição só é exigida de quem deu nota maior que zero a si mesmo', () => {
    const d = { ...CONTRIB_OK(), desc: '  ' };
    assert.deepEqual(stepErrors(projeto(), 'ana', a, d, 'contrib'), { 'a1:desc': 'Conte em uma frase o que você fez' });
    assert.deepEqual(stepErrors(projeto(), 'bruno', a, d, 'contrib'), {});
  });

  test('contrib: origem e documento de titularidade obrigatórios', () => {
    const d = { ...CONTRIB_OK(), origem: '', titularAtual: undefined };
    assert.deepEqual(stepErrors(projeto(), 'ana', a, d, 'contrib'), {
      'a1:origem': 'Informe a origem',
      'a1:titularAtual': 'Diga se já existe um documento'
    });
  });

  test('contrib: link é opcional, mas se vier precisa ser http(s)', () => {
    const msg = { 'a1:link': 'Informe um link válido, começando com http' };
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { ...CONTRIB_OK(), link: 'www.x.com' }, 'contrib'), msg);
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { ...CONTRIB_OK(), link: 'https://x.com' }, 'contrib'), {});
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { ...CONTRIB_OK(), link: '   ' }, 'contrib'), {});
  });

  test('donos: titular e divisão obrigatórios; titular externo supre a titularidade', () => {
    const msg = 'Escolha uma opção ou informe titular fora da equipe';
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { titular: [], divisao: '' }, 'donos'), { 'a1:titular': msg, 'a1:divisao': msg });
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { titular: [], titularExterno: 'Empresa X', divisao: PCT_NEG }, 'donos'), {});
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { titular: [], titularExterno: '  ', divisao: PCT_NEG }, 'donos'), { 'a1:titular': msg });
    assert.deepEqual(stepErrors(projeto(), 'ana', a, { titular: ['bruno'], divisao: PCT_NEG }, 'donos'), {});
  });

  test('uso: só as perguntas do tipo da criação são exigidas', () => {
    const d = { uso: 'a', materiais: 'b', comercial: 'c', portfolio: 'd' };
    // Marca exige marcaRegistro; licenca (de código) não é exigida.
    assert.deepEqual(Object.keys(stepErrors(projeto(), 'ana', a, d, 'uso')), ['a1:marcaRegistro']);
    assert.deepEqual(Object.keys(stepErrors(projeto(), 'ana', { id: 'a1', type: 'codigo' }, d, 'uso')), ['a1:licenca']);
    assert.deepEqual(stepErrors(projeto(), 'ana', { id: 'a1', type: 'outro' }, d, 'uso'), {});
  });

  test('comportamento atual: a mensagem de uso também fala em "titular fora da equipe"', () => {
    assert.equal(stepErrors(projeto(), 'ana', a, {}, 'uso')['a1:uso'], 'Escolha uma opção ou informe titular fora da equipe');
  });

  test('review não valida nada', () => {
    assert.deepEqual(stepErrors(projeto(), 'ana', a, {}, 'review'), {});
  });
});

const ENVIO_OK = () => ({ ...BASE, notas: { ana: 10, bruno: 0, carla: 6 }, titular: ['ana'] });

describe('sendErrors', () => {
  const a = { id: 'a1', type: 'marca' };

  test('rascunho completo não tem erro', () => {
    assert.deepEqual(sendErrors(projeto(), 'ana', a, ENVIO_OK()), {});
  });

  test('limpa as notas: só elegíveis, só valores válidos, convertidos para número', () => {
    const d = { ...ENVIO_OK(), notas: { ana: '10', bruno: 0, carla: '6', dani: 3, eva: '' } };
    sendErrors(projeto(), 'ana', a, d);
    assert.deepEqual(d.notas, { ana: 10, bruno: 0, carla: 6 });
  });

  test('falta nota para alguém elegível', () => {
    const d = { ...ENVIO_OK(), notas: { ana: 10, bruno: 0, carla: '' } };
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d), { 'a1:notas': 'Escolha a participação percebida de cada pessoa' });
  });

  test('remove do titular quem não é elegível, e exige alguém ou um externo', () => {
    const d1 = { ...ENVIO_OK(), titular: ['ana', 'dani'] };
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d1), {});
    assert.deepEqual(d1.titular, ['ana']);

    const d2 = { ...ENVIO_OK(), titular: ['dani'] };
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d2), { 'a1:titular': 'Responda esta pergunta para enviar' });

    const d3 = { ...ENVIO_OK(), titular: [], titularExterno: 'Empresa X' };
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d3), {});
  });

  test('toda pergunta do tipo da criação é obrigatória', () => {
    const d = { ...ENVIO_OK(), marcaRegistro: '', origem: undefined };
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d), {
      'a1:origem': 'Responda esta pergunta para enviar',
      'a1:marcaRegistro': 'Responda esta pergunta para enviar'
    });
  });

  test('descrição só é exigida de quem se deu nota maior que zero', () => {
    const d = () => ({ ...ENVIO_OK(), desc: ' ' });
    assert.deepEqual(sendErrors(projeto(), 'ana', a, d()), { 'a1:desc': 'Conte em uma frase o que você fez' });
    assert.deepEqual(sendErrors(projeto(), 'bruno', a, d()), {});
  });

  test('link opcional, mas válido se vier', () => {
    assert.deepEqual(sendErrors(projeto(), 'ana', a, { ...ENVIO_OK(), link: 'x.com' }), { 'a1:link': 'Informe um link válido, começando com http' });
    assert.deepEqual(sendErrors(projeto(), 'ana', a, { ...ENVIO_OK(), link: 'http://x.com' }), {});
  });
});

describe('sobreErrors', () => {
  test('sem respostas: erro em cada pergunta obrigatória, com a mensagem do tipo', () => {
    assert.deepEqual(sobreErrors(undefined), {
      'sobre:contas': 'Responda esta pergunta',
      'sobre:acordo': 'Escolha uma opção',
      'sobre:edital': 'Escolha uma opção'
    });
  });

  test('completo não tem erro; "qual documento" é opcional mesmo com edital Sim', () => {
    assert.deepEqual(sobreErrors({ contas: 'GitHub da Ana', acordo: 'Nenhum', edital: 'Não' }), {});
    assert.deepEqual(sobreErrors({ contas: 'GitHub da Ana', acordo: 'Nenhum', edital: 'Sim' }), {});
  });

  test('só espaços conta como vazio', () => {
    assert.deepEqual(sobreErrors({ contas: '   ', acordo: 'Nenhum', edital: 'Não' }), { 'sobre:contas': 'Responda esta pergunta' });
  });
});

describe('perfilErrors', () => {
  test('sem respostas', () => {
    assert.deepEqual(perfilErrors(undefined), { 'perfil:funcao': 'Escreva sua função', 'perfil:investiu': 'Escolha uma opção' });
  });

  test('completo e só espaços', () => {
    assert.deepEqual(perfilErrors({ funcao: 'design', investiu: 'Não' }), {});
    assert.deepEqual(perfilErrors({ funcao: '  ', investiu: 'Sim' }), { 'perfil:funcao': 'Escreva sua função' });
  });
});

describe('perfilDone', () => {
  test('verdadeiro só com o perfil completo do próprio membro', () => {
    const p = projeto();
    p.members[0].perfil = { funcao: 'gestão', investiu: 'Sim' };
    p.members[1].perfil = { funcao: 'dev' };
    assert.equal(perfilDone(p, 'ana'), true);
    assert.equal(perfilDone(p, 'bruno'), false);
    assert.equal(perfilDone(p, 'carla'), false);
    assert.equal(perfilDone(p, 'ninguem'), false);
  });
});
