/* Nenhum pedido a /api fica sem resposta: falha inesperada no sessionUser vira 500 em JSON (por wrapMw e erroJson),
   e o banco indisponível continua respondendo 503 com a mesma mensagem.
   Roda sem banco e sem servidor: monta um app Express com as peças reais (dist/auth.js e dist/http.js), na mesma
   ordem do server.ts, e um Prisma falso. Precisa do build da API (apps/api/dist). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { sessionUser, COOKIE } from '../dist/auth.js';
import { erroJson } from '../dist/http.js';

/* findUnique faz o que `comportamento` mandar: devolver uma sessão ou rejeitar com qualquer valor. */
async function servidor(comportamento) {
  const prisma = { session: { findUnique: async () => comportamento() } };
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
    return { status: r.status, tipo: r.headers.get('content-type') || '', corpo: await r.json().catch(() => null) };
  };
  return { pedir, fechar: () => new Promise(ok => s.close(ok)) };
}

/* console.error do sessionUser e do erroJson: silencia durante o teste e devolve o que foi registrado. */
async function semLog(fn) {
  const orig = console.error, linhas = [];
  console.error = (...a) => linhas.push(a);
  try { return await fn(linhas); } finally { console.error = orig; }
}

test('falha inesperada no sessionUser responde 500 em JSON, sem deixar o pedido pendurado', async () => {
  /* Rejeitar com null ou undefined faz o catch do sessionUser lançar ao ler (e as Error).message. */
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
  const { pedir, fechar } = await servidor(() => { throw new Error("Can't reach database server"); });
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
