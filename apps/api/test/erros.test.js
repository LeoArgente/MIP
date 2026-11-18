/* Nenhum pedido a /api fica sem resposta: falha inesperada no sessionUser vira 500 em JSON (por wrapMw e erroJson),
   e só o banco indisponível de verdade (erro do Prisma) responde 503, com a mesma mensagem de antes.
   Roda sem banco e sem servidor: monta um app Express com as peças reais (dist/auth.js e dist/http.js), na mesma
   ordem do server.ts, e um Prisma falso. Precisa do build da API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { sessionUser, COOKIE } from '../dist/auth.js';
import { erroJson } from '../dist/http.js';
import { Prisma, PrismaClient } from '@prisma/client';

/* findUnique faz o que `comportamento` mandar: devolver uma sessão ou rejeitar com qualquer valor.
   `prisma` troca o cliente falso por outro (o real, no teste do banco fora do ar). */
async function servidor(comportamento, prisma = { session: { findUnique: async () => comportamento() } }) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', sessionUser(prisma));
  app.get('/api/quem', (req, res) => res.json({ user: req.user?.id ?? null }));
  app.post('/api/eco', (req, res) => res.json(req.body));
  app.use('/api', (_req, res) => res.status(404).json({ err: { _: 'Rota não encontrada.' } }));
  app.use('/api', erroJson);
  const s = await new Promise(ok => { const x = app.listen(0, '127.0.0.1', () => ok(x)); });
  const base = 'http://127.0.0.1:' + s.address().port;
  const pedir = async (path, init = {}) => {
    /* Sem resposta em 3 s é o defeito que este teste guarda: o pedido pendurado. */
    const r = await fetch(base + path, { ...init, headers: { cookie: COOKIE + '=t', ...(init.headers || {}) }, signal: AbortSignal.timeout(3000) });
    return { status: r.status, tipo: r.headers.get('content-type') || '', cookies: r.headers.getSetCookie(), corpo: await r.json().catch(() => null) };
  };
  return { pedir, fechar: () => new Promise(ok => s.close(ok)) };
}

/* console.error e console.warn do sessionUser e do erroJson: silencia durante o teste e devolve o que foi registrado. */
async function semLog(fn) {
  const orig = { error: console.error, warn: console.warn }, linhas = [];
  console.error = (...a) => linhas.push(a);
  console.warn = (...a) => linhas.push(a);
  try { return await fn(linhas); } finally { Object.assign(console, orig); }
}

test('falha inesperada no sessionUser responde 500 em JSON, sem deixar o pedido pendurado', async () => {
  /* null e undefined não são erro do banco: o catch do sessionUser relança e wrapMw os transforma em Error. */
  for (const valor of [null, undefined]) {
    const { pedir, fechar } = await servidor(() => { throw valor; });
    try {
      await semLog(async linhas => {
        const r = await pedir('/api/quem');
        assert.equal(r.status, 500, 'rejeição com ' + String(valor));
        assert.match(r.tipo, /^application\/json/);
        assert.deepEqual(r.corpo, { err: { _: 'Algo deu errado do nosso lado. Tente de novo.' } });
        assert.ok(linhas.length > 0, 'o erro precisa ficar registrado');
      });
    } finally { await fechar(); }
  }
});

test('banco indisponível no sessionUser continua respondendo 503 com a mesma mensagem', async () => {
  /* O erro que o Prisma lança quando não alcança o PostgreSQL (o mesmo do teste com o cliente real, abaixo). */
  const { pedir, fechar } = await servidor(() => { throw new Prisma.PrismaClientInitializationError("Can't reach database server at `127.0.0.1:5432`", '6', 'P1001'); });
  try {
    await semLog(async () => {
      const r = await pedir('/api/quem');
      assert.equal(r.status, 503);
      assert.match(r.tipo, /^application\/json/);
      assert.deepEqual(r.corpo, { err: { _: 'Não foi possível falar com o banco de dados. Tente de novo em instantes.' } });
    });
  } finally { await fechar(); }
});

test('sessão válida e sessão vencida continuam como antes', async () => {
  let s = { expiresAt: new Date(Date.now() + 60e3), user: { id: 'u1' } };
  const { pedir, fechar } = await servidor(() => s);
  try {
    assert.deepEqual((await pedir('/api/quem')).corpo, { user: 'u1' });
    s = { expiresAt: new Date(Date.now() - 60e3), user: { id: 'u1' } };
    assert.deepEqual((await pedir('/api/quem')).corpo, { user: null });
  } finally { await fechar(); }
});

test('JSON malformado mantém o 400, agora em JSON', async () => {
  const { pedir, fechar } = await servidor(() => null);
  try {
    const r = await pedir('/api/eco', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } });
    assert.equal(r.status, 400);
    assert.match(r.tipo, /^application\/json/);
    assert.equal(typeof r.corpo?.err?._, 'string');
  } finally { await fechar(); }
});

/* O motor do Prisma 6 para Windows é só x64: no Node arm64 do Windows ele nem carrega (e o Prisma deixa uma rejeição
   solta ao tentar). Roda em qualquer outro lugar, inclusive na CI. */
const semMotor = process.platform === 'win32' && process.arch === 'arm64' && 'o motor do Prisma não carrega no Node arm64 do Windows';
test('banco fora do ar com o PrismaClient real (porta fechada) responde 503', { skip: semMotor }, async () => {
  const prisma = new PrismaClient({ datasourceUrl: 'postgresql://x:y@127.0.0.1:1/nada' });
  const { pedir, fechar } = await servidor(null, prisma);
  try {
    await semLog(async () => {
      const r = await pedir('/api/quem');
      assert.equal(r.status, 503);
      assert.deepEqual(r.corpo, { err: { _: 'Não foi possível falar com o banco de dados. Tente de novo em instantes.' } });
    });
  } finally { await fechar(); await prisma.$disconnect(); }
});

test('Error que não veio do banco responde 500, não 503', async () => {
  const erros = [new Error('defeito nosso'), new TypeError('x is not a function'), new Prisma.PrismaClientValidationError('consulta mal montada', { clientVersion: '6' })];
  for (const e of erros) {
    const { pedir, fechar } = await servidor(() => { throw e; });
    try {
      await semLog(async () => {
        const r = await pedir('/api/quem');
        assert.equal(r.status, 500, e.constructor.name);
        assert.deepEqual(r.corpo, { err: { _: 'Algo deu errado do nosso lado. Tente de novo.' } });
      });
    } finally { await fechar(); }
  }
});

test('cookie de sessão montado à mão (j:..., que o cookie-parser lê como JSON): sem sessão, aviso no log com o tipo, cookie limpo, banco não consultado', async () => {
  let consultou = false;
  const { pedir, fechar } = await servidor(() => { consultou = true; return null; });
  try {
    for (const [valor, tipo] of [['j:1', 'number'], ['j:{"segredo":1}', 'object'], ['j:[1]', 'array'], ['j:true', 'boolean']]) {
      await semLog(async linhas => {
        const r = await pedir('/api/quem', { headers: { cookie: COOKIE + '=' + encodeURIComponent(valor) } });
        assert.equal(r.status, 200, valor);
        assert.deepEqual(r.corpo, { user: null }, valor);
        /* O navegador recebe a ordem de apagar o cookie e para de mandá-lo no pedido seguinte. */
        assert.ok(r.cookies.some(c => c.startsWith(COOKIE + '=;') && /Expires=Thu, 01 Jan 1970/.test(c)), valor + ': ' + JSON.stringify(r.cookies));
        /* Uma linha no log, com o tipo e sem o valor (que vem do cliente). */
        assert.equal(linhas.length, 1, valor);
        const linha = linhas[0].join(' ');
        assert.match(linha, new RegExp('não é texto \\(' + tipo + '\\)'));
        assert.ok(!linha.includes(valor.slice(2)), valor + ': o valor apareceu no log');
      });
    }
    assert.equal(consultou, false);
    /* Cookie de texto (o que o servidor grava) segue consultando o banco. j:null, j:false e j:0 também são texto:
       o cookie-parser só troca o valor pelo JSON quando o resultado não é falso. */
    for (const valor of ['abc', 'j:null', 'j:false', 'j:0']) {
      consultou = false;
      const r = await pedir('/api/quem', { headers: { cookie: COOKIE + '=' + encodeURIComponent(valor) } });
      assert.deepEqual(r.corpo, { user: null }, valor);
      assert.deepEqual(r.cookies, [], valor + ': cookie de texto não é limpo aqui');
      assert.equal(consultou, true, valor);
    }
  } finally { await fechar(); }
});
