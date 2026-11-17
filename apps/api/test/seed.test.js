/* Guarda do cenário de demonstração: tudo o que prisma/seed.js grava precisa estar no formato que o domínio
   conhece. Com a validação da entrada (modules/shared.ts), a tela reenvia o rascunho inteiro, e um valor inválido
   no seed faz o salvamento automático daquela criação ser recusado sem motivo aparente.
   Roda sem banco e sem servidor: o seed recebe um cliente falso que só anota o que seria gravado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QS, SOBRE, PERFIL, isP } from '@mip/domain';
import { seed } from '../prisma/seed.js';

/* Cliente do Prisma falso: qualquer prisma.<modelo>.<método>(args) anota args.data e devolve um registro com id. */
function clienteFalso() {
  const gravados = [];
  let n = 0;
  const modelo = nome => new Proxy({}, { get: (_, metodo) => async (args = {}) => {
    gravados.push({ onde: nome + '.' + String(metodo), data: args.data });
    return { id: nome + '-' + (++n), ...(args.data && !Array.isArray(args.data) ? args.data : {}) };
  } });
  const prisma = new Proxy({}, { get: (_, nome) => (String(nome).startsWith('$') ? async () => {} : modelo(String(nome))) });
  return { prisma, gravados };
}

/* Perguntas com opções fixas, de todas as tabelas do domínio (os nomes não se repetem entre elas). */
const OPCOES = new Map([QS, SOBRE, PERFIL].flatMap(t => Object.entries(t).filter(([, q]) => q.opts).map(([k, q]) => [k, q.opts])));

/* Percorre o que foi gravado, em qualquer profundidade (rascunho, envio, perfil, sobre...), e devolve cada campo
   que é pergunta do domínio, com o caminho para a mensagem. */
function perguntasGravadas(valor, caminho, achados = []) {
  if (Array.isArray(valor)) valor.forEach((x, i) => perguntasGravadas(x, caminho + '[' + i + ']', achados));
  else if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    for (const [k, v] of Object.entries(valor)) {
      if (OPCOES.has(k) || Object.hasOwn(QS, k)) achados.push({ caminho: caminho + '.' + k, campo: k, v });
      perguntasGravadas(v, caminho + '.' + k, achados);
    }
  }
  return achados;
}

/* Mesmo critério da validação da API: opção da lista ('' = sem resposta), lista de ids, notas numéricas. */
function invalido({ campo, v }) {
  if (OPCOES.has(campo)) return !(v === '' || OPCOES.get(campo).includes(v));
  if (isP(campo)) return !(Array.isArray(v) && v.every(x => typeof x === 'string' && x));
  if (campo === 'notas') return !(v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(n => typeof n === 'number' && Number.isFinite(n)));
  return false;
}

test('tudo o que o seed grava nas perguntas do domínio está no formato e nas opções do domínio', async () => {
  const { prisma, gravados } = clienteFalso();
  await seed(prisma);
  const achados = gravados.flatMap((g, i) => perguntasGravadas(g.data, g.onde + '#' + i));

  /* Se o seed mudar de forma e o percurso não achar nada, o teste não pode passar vazio. */
  assert.ok(gravados.some(g => g.onde === 'answer.create'), 'o cliente falso precisa receber as respostas do cenário');
  assert.ok(achados.some(a => OPCOES.has(a.campo)), 'o percurso precisa achar perguntas de opção no que o seed grava');

  const ruins = achados.filter(invalido).map(a => a.caminho + ' = ' + JSON.stringify(a.v));
  assert.deepEqual(ruins, [], 'valores do seed fora do que o domínio aceita:\n' + ruins.join('\n'));
});
