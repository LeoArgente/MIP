/* Registro do acordo determinístico: o corpo é hasheado (sha256 em apps/api/src/modules/memorial) e o hash tem índice
   no banco, então os mesmos fatos precisam dar o mesmo texto byte a byte. Objetos não têm ordem de chaves garantida:
   em memória é a de inserção; depois de ir e voltar do Postgres (jsonb) é a canônica, por tamanho e depois por byte.
   Invariante: a ordem das chaves da entrada não muda a saída. Os testes remontam o MESMO projeto com as chaves de
   todos os objetos (em qualquer profundidade) em outra ordem e exigem texto e hash idênticos. Arrays mantêm a
   ordem: são fatos ordenados, e o jsonb os guarda como vieram. */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { memorialBody, membrosCongelados, fmtAns, partTxt } from '@mip/domain';
import { projeto, responder, addMembro, enviarVersao, T } from './fixtures.js';

const sha256 = t => createHash('sha256').update(t, 'utf8').digest('hex');

/* Ordens de chaves. jsonb: por tamanho em bytes e, no empate, por byte (memcmp do UTF-8). */
const bytes = k => Buffer.from(k, 'utf8');
const jsonb = ks => [...ks].sort((a, b) => bytes(a).length - bytes(b).length || Buffer.compare(bytes(a), bytes(b)));
/* Embaralhamento com semente (mulberry32 + Fisher-Yates): aleatório, mas reproduzível. */
const embaralhar = semente => ks => {
  let s = semente >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = [...ks];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const ORDENS = [
  ['inversa', ks => [...ks].reverse()],
  ['canônica do jsonb', jsonb],
  ['rotação', ks => ks.slice(1).concat(ks.slice(0, 1))],
  ...Array.from({ length: 12 }, (_, i) => ['embaralhada, semente ' + (i + 1), embaralhar(i + 1)])
];
/* Remonta o valor com as chaves de todo objeto na ordem dada; arrays e valores simples ficam como estão. */
const remontar = (x, ordem) => Array.isArray(x) ? x.map(y => remontar(y, ordem))
  : x && typeof x === 'object' ? Object.fromEntries(ordem(Object.keys(x)).map(k => [k, remontar(x[k], ordem)]))
  : x;

/* Projeto com tudo o que o registro percorre: pessoas com ids de tamanhos diferentes (a ordem do jsonb difere da de
   inserção), participação de várias pessoas, criações que saíram do projeto depois do envio, várias recusas numa
   versão anterior e posições variadas na versão impressa. */
function cenario({ congelada }) {
  const p = projeto();
  addMembro(p, 'dani', { elig: true });
  p.people.dani = { name: 'Dani' };
  p.assets.push({ id: 'a2', name: 'Backend', type: 'codigo', cat: 'Código', st: 'ok' },
    { id: 'velho-zeta', name: 'Zeta', type: 'outro', cat: 'Outro', st: 'ok' },
    { id: 'vy', name: 'Alfa', type: 'outro', cat: 'Outro B', st: 'ok' },
    { id: 'vx', name: 'Alfa', type: 'outro', cat: 'Outro', st: 'ok' });
  for (const aid of ['a1', 'a2', 'velho-zeta', 'vy', 'vx']) {
    responder(p, 'ana', { notas: { ana: 10, bruno: 3, carla: 6, dani: 6 } }, aid);
    responder(p, 'bruno', { notas: { ana: 6, bruno: 6, carla: 3, dani: 10 } }, aid);
    responder(p, 'carla', { notas: { ana: 10, bruno: 3, carla: 10, dani: 3 } }, aid);
    responder(p, 'dani', { notas: { ana: 3, bruno: 6, carla: 6, dani: 10 } }, aid);
  }
  enviarVersao(p, { dani: { v: 'no', comment: 'D', at: 7 }, bruno: { v: 'no', comment: 'B', at: 5 }, carla: { v: 'no', comment: 'C', at: 5 }, ana: { v: 'ok', at: 2 } });
  const v = enviarVersao(p, { dani: { v: 'ok', at: 9 }, carla: { v: 'no', comment: 'Ainda não', at: 8 }, ana: { v: 'ok', at: 8 } });
  if (congelada) v.membros = membrosCongelados(p);
  /* Três criações saem do projeto depois do envio (duas com o mesmo nome): no registro, vêm no fim. */
  p.assets = p.assets.filter(a => a.id === 'a1' || a.id === 'a2');
  return p;
}

describe('registro do acordo: a ordem das chaves da entrada não muda o texto nem o hash', () => {
  test('as ordens usadas permutam de verdade (não são a de inserção)', () => {
    const ks = ['ana', 'bruno', 'carla', 'dani'];
    assert.deepEqual(jsonb(ks), ['ana', 'dani', 'bruno', 'carla']);
    for (const [nome, ordem] of ORDENS) assert.notDeepEqual(ordem(ks), ks, nome);
    const p = cenario({ congelada: true });
    for (const [nome, ordem] of ORDENS) assert.notDeepEqual(Object.keys(remontar(p, ordem).versions[1].snap), Object.keys(p.versions[1].snap), nome);
  });

  for (const congelada of [true, false]) {
    test(congelada ? 'versão com a equipe congelada no envio' : 'versão antiga, sem a equipe congelada', () => {
      const p = cenario({ congelada }), base = memorialBody(p, T);
      for (const [nome, ordem] of ORDENS) {
        const outro = memorialBody(remontar(p, ordem), T);
        assert.equal(outro, base, 'ordem ' + nome);
        assert.equal(sha256(outro), sha256(base), 'ordem ' + nome);
      }
    });
  }

  test('o texto segue a ordem que faz sentido para quem lê', () => {
    const L = memorialBody(remontar(cenario({ congelada: false }), jsonb), T).split('\n');
    const de = (inicio, filtro) => { const i = L.indexOf(inicio); return L.slice(i, L.indexOf('', i + 1) === -1 ? undefined : L.indexOf('', i + 1)).filter(filtro); };
    // Criações: as do projeto na ordem do cadastro; as que saíram, por nome e, no mesmo nome, pelo id (vx antes de vy).
    assert.deepEqual(L.filter(l => / \((Marca|Código|Outro|Outro B)\)$/.test(l)), ['Logo (Marca)', 'Backend (Código)', 'Alfa (Outro)', 'Alfa (Outro B)', 'Zeta (Outro)']);
    // Participação percebida: pessoas na ordem da equipe.
    assert.equal(L.find(l => l.startsWith('  Participação percebida: ')), '  Participação percebida: Ana: parte · Bruno: pouco · Carla: parte · Dani: parte. Não define titularidade ou quotas.');
    // Confirmações (versão antiga): pessoas na ordem da equipe no envio.
    assert.deepEqual(de('CONFIRMAÇÕES DA PROPOSTA 2', l => l.startsWith('- ')).map(l => l.split(':')[0]), ['- Ana', '- Bruno', '- Carla', '- Dani']);
    // Recusas anteriores: por momento da recusa; no empate, pelo id.
    assert.deepEqual(de('RECUSAS E AJUSTES ANTERIORES', l => l.startsWith('- ')), ['- Bruno recusou a proposta 1: B', '- Carla recusou a proposta 1: C', '- Dani recusou a proposta 1: D']);
  });
});

describe('o que o registro usa para escrever pessoas não depende da ordem das chaves', () => {
  const p = addMembro(projeto(), 'dani', { elig: true });
  p.people.dani = { name: 'Dani' };

  test('partTxt: pessoas na ordem da equipe; quem não está na equipe vem depois, pelo id', () => {
    const avg = { zeca: 3, dani: 10, ana: 6, bruno: 0, al: 6 };
    for (const [nome, ordem] of ORDENS) assert.equal(partTxt(p, { avg: remontar(avg, ordem), share: {} }), 'Ana: parte · Dani: muito · al: parte · zeca: pouco', nome);
  });

  test('fmtAns das notas: pessoas na ordem da equipe; quem não está na equipe vem depois, pelo id', () => {
    const notas = { zeca: 3, dani: 10, carla: 0, ana: 6, al: 6 };
    for (const [nome, ordem] of ORDENS) assert.equal(fmtAns(p, 'notas', remontar(notas, ordem)), 'Ana: parte · Carla: nada · Dani: muito · al: parte · zeca: pouco', nome);
  });
});
