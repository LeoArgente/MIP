/* Grupo 7 — Elegibilidade e acesso: elig, approved, mem, ansOf, validLink, roleTxt. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { elig, approved, mem, ansOf, validLink, roleTxt } from '../src/index.js';
import { projeto } from './fixtures.js';

describe('elig', () => {
  test('só membros ativos E elegíveis, na ordem de entrada', () => {
    const p = { members: [
      { pid: 'ana', status: 'ativo', elig: true },
      { pid: 'bruno', status: 'ativo', elig: false },
      { pid: 'carla', status: 'saiu', elig: true },
      { pid: 'dani', status: 'pendente', elig: true },
      { pid: 'eva', status: 'ativo', elig: true }
    ] };
    assert.deepEqual(elig(p), ['ana', 'eva']);
  });
});

describe('approved', () => {
  test('só criações com st "ok"', () => {
    const p = { assets: [{ id: 'a1', st: 'ok' }, { id: 'a2', st: 'sug' }, { id: 'a3', st: 'rej' }, { id: 'a4', st: 'ok' }] };
    assert.deepEqual(approved(p).map(a => a.id), ['a1', 'a4']);
  });
});

describe('mem', () => {
  test('o registro de membro da pessoa, ou undefined', () => {
    const p = projeto();
    assert.equal(mem(p, 'bruno'), p.members[1]);
    assert.equal(mem(p, 'ninguem'), undefined);
  });
});

describe('ansOf', () => {
  test('a resposta da pessoa para a criação, ou undefined', () => {
    const p = projeto();
    assert.equal(ansOf(p, 'ana', 'a1'), p.answers.ana.a1);
    assert.equal(ansOf(p, 'ana', 'a9'), undefined);
    assert.equal(ansOf(p, 'ninguem', 'a1'), undefined);
  });
});

describe('validLink', () => {
  test('aceita http e https, sem diferenciar maiúsculas, ignorando espaços nas pontas', () => {
    for (const s of ['https://x.com', 'http://x.com/a?b=1', 'HTTPS://X.COM', '  http://x.com  ']) assert.equal(validLink(s), true, s);
  });

  test('recusa sem protocolo, outros protocolos, espaços no meio e vazios', () => {
    for (const s of ['x.com', 'www.x.com', 'ftp://x.com', 'http://x .com', 'http://', '', '   ', undefined, null]) assert.equal(validLink(s), false, String(s));
  });
});

describe('roleTxt', () => {
  test('quem organiza ou integrante', () => {
    const p = projeto();
    assert.equal(roleTxt(p, 'ana'), 'Quem organiza');
    assert.equal(roleTxt(p, 'bruno'), 'Integrante');
  });
});
