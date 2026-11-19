/* Verificação de mutação das regras de negócio.
   Aplica um mutante por vez em src/index.ts (inverte uma condição), recompila dist/ com tsc, roda a suíte
   inteira contra o compilado, anota se ela falhou ("morto") ou passou ("SOBREVIVEU") e restaura o original
   (recompilando no fim). Um sobrevivente indica uma condição que nenhum teste protege.
   Um mutante pode não passar na checagem de tipos; isso não conta, porque o tsc emite mesmo assim e o que
   se testa é o compilado.

   Rodar (a partir da raiz do repo):  node packages/domain/scripts/mutantes.mjs
   Sai com código 1 se algum mutante sobreviver ou se algum trecho não for encontrado exatamente uma vez. */
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dir = dirname(dirname(fileURLToPath(import.meta.url)));
const testDir = join(dir, 'test');
const src = join(dir, 'src', 'index.ts');
const compilado = join(dir, 'dist', 'index.js');
const ORIG = readFileSync(src, 'utf8');
const files = readdirSync(testDir).filter(f => f.endsWith('.test.js')).map(f => join('test', f));
const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin', 'tsc');
/* Apaga o compilado antes, para nunca testar a saída do mutante anterior. */
const compilar = () => { rmSync(compilado, { force: true }); spawnSync(process.execPath, [tsc, '-p', dir], { encoding: 'utf8' }); return existsSync(compilado); };

const M = [
  // [função, trecho original, trecho mutado]
  ['itemStatus (regra amplitude: > 2 → <= 2)', "Math.min(...xs) > 2; });", "Math.min(...xs) <= 2; });"],
  ['itemStatus (regra amplitude: > 2 → >= 2)', "Math.min(...xs) > 2; });", "Math.min(...xs) >= 2; });"],
  ['itemStatus (regra pendente, notas)', "(!vals.length || vals.length < E.length ? 'pend' : 'conv')", "(!vals.length || vals.length > E.length ? 'pend' : 'conv')"],
  ['itemStatus (regra pendente, opções)', "(vals.length === 0 || vals.length < E.length ? 'pend' : 'conv')", "(vals.length === 0 || vals.length > E.length ? 'pend' : 'conv')"],
  ['itemStatus (pendente quando ninguém elegível)', "(vals.length === 0 || vals.length < E.length", "(vals.length !== 0 && vals.length < E.length"],
  ['itemStatus (divergência)', "const status = set.size > 1 ?", "const status = set.size <= 1 ?"],
  ['itemStatus (externo só no titular)', "+ (q === 'titular' ? '|' + normExterno(x.ext)", "+ (q !== 'titular' ? '|' + normExterno(x.ext)"],
  ['itemStatus (p.stats)', "if (p.stats && p.stats[aid] && p.stats[aid][q])", "if (p.stats && p.stats[aid] && !p.stats[aid][q])"],
  ['norm', "(isP(q) ? [...(v || [])].sort().join('|') : v)", "(!isP(q) ? [...(v || [])].sort().join('|') : v)"],
  ['distRows (plural)', "(c[o] > 1 ? ' pessoas' : ' pessoa')", "(c[o] <= 1 ? ' pessoas' : ' pessoa')"],
  ['distRows (faixa de notas)', "lvName(lo) === lvName(hi) ?", "lvName(lo) !== lvName(hi) ?"],
  ['diffCount', "status !== 'conv').length, 0)", "status === 'conv').length, 0)"],
  ['decPts', "status !== 'conv');", "status === 'conv');"],
  ['shares (total zero)', "if (!tot) {", "if (tot) {"],
  ['shares (piso)', "o[k] = Math.floor(u(k) / 1e9)", "o[k] = Math.round(u(k) / 1e9)"],
  ['shares (falta para 100)', "const falta = 100 -", "const falta = 99 -"],
  ['shares (só os pontos que faltam)', ".slice(0, falta)", ".slice(0, falta + 1)"],
  ['shares (maior resto primeiro)', "resto(b) - resto(a) ||", "resto(a) - resto(b) ||"],
  ['shares (empate: valor maior)', "|| val(b) - val(a) ||", "|| val(a) - val(b) ||"],
  ['shares (empate: menor id)', "(a < b ? -1 : a > b ? 1 : 0)).slice(0, falta)", "(a > b ? -1 : a < b ? 1 : 0)).slice(0, falta)"],
  ['shares (ruído do ponto flutuante)', "Math.round(1e11 * val(k) / tot)", "1e11 * val(k) / tot"],
  ['partOf', "xs.length ? xs.reduce", "!xs.length ? xs.reduce"],
  ['partTxt', "filter(k => pt.avg[k] > 0)", "filter(k => pt.avg[k] <= 0)"],
  ['pctTxt', "s.v?.divisao === PCT_SIM ?", "s.v?.divisao !== PCT_SIM ?"],
  ['contribOf', "filter(k => notaNum(notasOf(d)[k]) > 0)", "filter(k => notaNum(notasOf(d)[k]) <= 0)"],
  ['notaNum (não-número vira 0)', "return isNaN(n) ? 0 : n; };", "return isNaN(n) ? n : n; };"],
  ['notaNum (número fica como está)', "return isNaN(n) ? 0 : n; };", "return isNaN(n) ? 0 : 0; };"],
  ['sendErrors (nota gravada como número)', "o[pid] = notaNum(n[pid]);", "o[pid] = n[pid] as number;"],
  ['notasOf', "(d && d.notas) || {}", "(d && !d.notas) || {}"],
  ['hasNota', "n[pid] !== undefined && n[pid] !== ''", "n[pid] === undefined && n[pid] !== ''"],
  ['propError (sem acordo)', "if (!pr.semAcordo && miss.length)", "if (pr.semAcordo && miss.length)"],
  ['propError (soma 100)', "- 100) > 0.001)", "- 100) < 0.001)"],
  ['propError (externo supre titular)', "!(q === 'titular' && normExterno(pr.externo))", "(q === 'titular' && normExterno(pr.externo))"],
  ['propError (externo normalizado: soma 100)', "concat(normExterno(pr.externo) ? ['__externo__'] : []), vals", "concat(pr.externo ? ['__externo__'] : []), vals"],
  ['propError (externo normalizado: sem acordo)', "concat(normExterno(pr.externo) ? ['__externo__'] : []);", "concat(pr.externo ? ['__externo__'] : []);"],
  ['pctTxt (externo normalizado)', "const ext = normExterno(s.externo);", "const ext = s.externo;"],
  ['snapshot (externo normalizado)', "externo: normExterno(pr.externo), percentual:", "externo: pr.externo || '', percentual:"],
  ['snapshot (relato: externo normalizado)', "titularExterno: normExterno(x?.titularExterno) }", "titularExterno: x?.titularExterno || '' }"],
  ['memorialBody (relato: externo vazio some)', "if (normExterno(r.titularExterno)) L.push", "if (r.titularExterno) L.push"],
  ['memorialBody (relato: externo sem pontas)', "segundo esta pessoa: ' + normExterno(r.titularExterno)", "segundo esta pessoa: ' + r.titularExterno"],
  ['memorialBody (externo vazio some)', "if (normExterno(x.externo)) L.push", "if (x.externo) L.push"],
  ['memorialBody (externo sem pontas)', "fora da equipe: ' + normExterno(x.externo)", "fora da equipe: ' + x.externo"],
  ['memorialBody (pendência: externo normalizado)', "concat(normExterno(x.externo) ? ['__externo__'] : []); if (!ps.length", "concat(x.externo ? ['__externo__'] : []); if (!ps.length"],
  ['normExterno', "string => (s || '').trim();", "string => (s || '');"],
  ['propDefault (externo normalizado)', "normExterno(own.vals[0].ext)", "own.vals[0].ext"],
  ['itemStatus (externo normalizado)', "normExterno(x.ext).toLowerCase()", "x.ext.toLowerCase()"],
  ['stepErrors (externo normalizado)', "!(x === 'titular' && normExterno(d.titularExterno))", "!(x === 'titular' && d.titularExterno)"],
  ['sendErrors (externo normalizado)', "!(q === 'titular' && normExterno(d.titularExterno))", "!(q === 'titular' && d.titularExterno)"],
  ['stepErrors (mensagem só do titular)', "err[k + x] = x === 'titular' ?", "err[k + x] = x !== 'titular' ?"],
  ['stepErrors', "if (notaNum(notasOf(d)[me]) > 0 &&", "if (notaNum(notasOf(d)[me]) <= 0 &&"],
  ['sendErrors', "if (contribOf(d).includes(me) &&", "if (!contribOf(d).includes(me) &&"],
  ['sobreErrors', "if (!SOBRE[k].optional &&", "if (SOBRE[k].optional &&"],
  ['perfilErrors', "PERFIL[k].kind === 'text' ? 'Escreva sua função'", "PERFIL[k].kind !== 'text' ? 'Escreva sua função'"],
  ['perfilDone', "=> !Object.keys(perfilErrors(", "=> !!Object.keys(perfilErrors("],
  ['propDefault (regra: só convergente)', "v[q] = r.status === 'conv' && r.vals.length", "v[q] = r.status !== 'conv' && r.vals.length"],
  ['propDefault (regra: externo convergente)', "externo: own.status === 'conv' && own.vals.length", "externo: own.status !== 'conv' && own.vals.length"],
  ['propOf', "p.proposal[aid] || propDefault(p, aid)", "p.proposal[aid] && propDefault(p, aid)"],
  ['dsteps', "['notas'].concat(decQs(a), 'review')", "['notas'].concat(decQs(a))"],
  ['decPick', "(isP(q) ? (pr.v[q] || []).map", "(!isP(q) ? (pr.v[q] || []).map"],
  ['lastV', "p.versions[p.versions.length - 1]", "p.versions[0]"],
  ['taskFor (regra: fase decisão)', "if (p.phase === 'decisao') {", "if (p.phase !== 'decisao') {"],
  ['taskFor (regra: quem organiza)', "if (org) return { tab: 'decidir', label: 'Ajustar a proposta'", "if (!org) return { tab: 'decidir', label: 'Ajustar a proposta'"],
  ['taskFor (regra: quem recusou)', "if (rf.includes(pid))", "if (!rf.includes(pid))"],
  ['taskFor (regra: assets na nota)', "(ats ? ' e pediu ajuste em ' + ats : '')", "(!ats ? ' e pediu ajuste em ' + ats : '')"],
  ['taskFor (recusas: ordem de chegada)', "lv.conf[a].at - lv.conf[b].at ||", "lv.conf[b].at - lv.conf[a].at ||"],
  ['taskFor (recusas: desempate pelo id)', "lv.conf[a].at - lv.conf[b].at || (a < b ? -1 : a > b ? 1 : 0)", "lv.conf[a].at - lv.conf[b].at || (a > b ? -1 : a < b ? 1 : 0)"],
  ['taskFor (várias recusas)', "varias = rf.length > 1", "varias = rf.length > 2"],
  ['taskFor (criações de cada recusa)', "(criacoes(k) ? ' pediu ajuste em '", "(!criacoes(k) ? ' pediu ajuste em '"],
  ['taskFor (todas as recusas para as demais pessoas)', "(varias ? rf.length + ' pessoas recusaram. '", "(!varias ? rf.length + ' pessoas recusaram. '"],
  ['taskFor (continuar respondendo)', "left.some(a => qpos[a.id]) ?", "!left.some(a => qpos[a.id]) ?"],
  ['taskFor (sem acordo)', "if (sem.length && eligNaVersao(v).every", "if (!sem.length && eligNaVersao(v).every"],
  ['secInfo', "d === n ? 'Respondido'", "d !== n ? 'Respondido'"],
  ['phaseName', "(p.phase === 'coleta' && ['equipe'", "(p.phase !== 'coleta' && ['equipe'"],
  ['stepOf', "GROUPS[g].includes(q))", "!GROUPS[g].includes(q))"],
  ['steps', "['contrib', 'donos', 'uso', 'review']", "['contrib', 'donos', 'uso']"],
  ['snapshot', "semAcordo: !!pr.semAcordo", "semAcordo: !pr.semAcordo"],
  ['memorialBody (situação)', "(allOk ? 'confirmada por todos'", "(!allOk ? 'confirmada por todos'"],
  ['memorialBody (pendência percentuais)', "if (x.v.divisao === PCT_NEG)", "if (x.v.divisao !== PCT_NEG)"],
  ['memorialBody (só recusas anteriores)', "p.versions.slice(0, -1).forEach", "p.versions.forEach"],
  ['memorialBody (criações que saíram: por nome)', "cmpTexto(v.snap[a].name, v.snap[b].name) ||", "cmpTexto(v.snap[b].name, v.snap[a].name) ||"],
  ['memorialBody (criações que saíram: desempate pelo id)', "v.snap[b].name) || cmpTexto(a, b)", "v.snap[b].name) || cmpTexto(b, a)"],
  ['memorialBody (anteriores: ordem de chegada)', "x.conf[a].at - x.conf[b].at ||", "x.conf[b].at - x.conf[a].at ||"],
  ['memorialBody (anteriores: desempate pelo id)', "x.conf[a].at - x.conf[b].at || cmpTexto(a, b)", "x.conf[a].at - x.conf[b].at || cmpTexto(b, a)"],
  ['memorialBody (anteriores: ordenadas)', "Object.keys(x.conf).sort((a, b) => x.conf[a].at - x.conf[b].at || cmpTexto(a, b))", "Object.keys(x.conf)"],
  ['naOrdemDaEquipe (ordem da equipe)', "pos(a) - pos(b) ||", "pos(b) - pos(a) ||"],
  ['naOrdemDaEquipe (fora da equipe vem depois)', "i === -1 ? p.members.length : i", "i === -1 ? -1 : i"],
  ['naOrdemDaEquipe (desempate pelo id)', "pos(a) - pos(b) || cmpTexto(a, b)", "pos(a) - pos(b) || cmpTexto(b, a)"],
  ['cmpTexto', "number => (a < b ? -1 : a > b ? 1 : 0);", "number => (a > b ? -1 : a < b ? 1 : 0);"],
  ['partTxt (ordem da equipe)', "naOrdemDaEquipe(p, Object.keys(pt.avg))", "Object.keys(pt.avg)"],
  ['fmtAns (notas na ordem da equipe)', "naOrdemDaEquipe(p, Object.keys(v || {}))", "Object.keys(v || {})"],
  ['memorialBody (criações que saíram: ordenadas)', ".sort((a, b) => cmpTexto(v.snap[a].name, v.snap[b].name) || cmpTexto(a, b))", ""],
  ['memorialBody (respondido)', "if (r.respondido) {", "if (!r.respondido) {"],
  ['memorialText', "=> m.body", "=> m.text"],
  ['elig', "export const elig = (p: Projeto): Pid[] => p.members.filter(m => m.status === 'ativo' && m.elig)", "export const elig = (p: Projeto): Pid[] => p.members.filter(m => m.status === 'ativo' && !m.elig)"],
  ['eligNaVersao (membros: elegível)', "v.membros.filter(m => m.status === 'ativo' && m.elig)", "v.membros.filter(m => m.status === 'ativo' && !m.elig)"],
  ['eligNaVersao (membros: ativo)', "v.membros.filter(m => m.status === 'ativo' && m.elig)", "v.membros.filter(m => m.status !== 'ativo' && m.elig)"],
  ['eligNaVersao (sem membros: relatos)', "(x.relatos || []).map(r => r.pid)", "(x.relatos || []).filter(r => r.respondido).map(r => r.pid)"],
  ['taskFor (confirmação: quem é da versão)', "c || !eligNaVersao(v).includes(pid)", "c || eligNaVersao(v).includes(pid)"],
  ['approved', "a.st === 'ok'", "a.st !== 'ok'"],
  ['mem', "p.members.find(m => m.pid === pid)", "p.members.find(m => m.pid !== pid)"],
  ['ansOf', "p.answers[pid] && p.answers[pid][aid]", "!p.answers[pid] && p.answers[pid][aid]"],
  ['validLink', "=> /^https?:", "=> !/^https?:"],
  ['roleTxt', "(p.org === pid ? 'Quem organiza'", "(p.org !== pid ? 'Quem organiza'"],
  ['fmt', "timeZone: 'America/Sao_Paulo'", "timeZone: 'UTC'"],
  ['fmt (meia-noite é 00, não 24)', "hourCycle: 'h23'", "hourCycle: 'h24'"],
  ['fmt (data inválida)', "if (isNaN(d.getTime())) return 'Invalid Date';", "if (!isNaN(d.getTime())) return 'Invalid Date';"],
  ['fmt (dois dígitos: abaixo de 10)', "(n < 10 ? '0' + n : '' + n)", "(n <= 10 ? '0' + n : '' + n)"],
  ['fmt (dois dígitos: zero à esquerda)', "(n < 10 ? '0' + n : '' + n)", "(n >= 10 ? '0' + n : '' + n)"],
  ['nm', "p.people && p.people[pid] ? p.people[pid].name : pid", "p.people && !p.people[pid] ? p.people[pid].name : pid"],
  ['fmtAns', ": isP(q) ? (", ": !isP(q) ? ("],
  ['lvOf (mais próximo)', "Math.abs(x[0] - n) < Math.abs(b[0] - n)", "Math.abs(x[0] - n) > Math.abs(b[0] - n)"],
  ['lvOf (empate)', "Math.abs(x[0] - n) < Math.abs(b[0] - n)", "Math.abs(x[0] - n) <= Math.abs(b[0] - n)"],
  ['lvName', "LV.find(x => x[0] === lvOf(+n))", "LV.find(x => x[0] !== lvOf(+n))"],
  ['typeOf', "TYPES.find(t => t.k === (a && a.type))", "TYPES.find(t => t.k !== (a && a.type))"],
  ['qsFor', "t && t.extra ? QBASE.concat", "t && !t.extra ? QBASE.concat"],
  ['decQs', "filter(q => QS[q].dec)", "filter(q => !QS[q].dec)"],
  ['isP', "QS[q].kind === 'people'", "QS[q].kind !== 'people'"],
  ['clone', "(o === undefined ? undefined", "(o !== undefined ? undefined"],
  ['sobreKeys', "filter(k => !SOBRE[k].when || SOBRE[k].when(s || {}))", "filter(k => !(!SOBRE[k].when || SOBRE[k].when(s || {})))"],
  ['GRP', "GRP = (q: CampoTela): string => [", "GRP = (q: CampoTela): string => !["]
];

const out = [];
try {
  for (const [nome, de, para] of M) {
    const n = ORIG.split(de).length - 1;
    if (n !== 1) { out.push(['ERRO', nome, `trecho aparece ${n} vezes`]); continue; }
    writeFileSync(src, ORIG.replace(de, para));
    if (!compilar()) { out.push(['ERRO', nome, 'tsc não gerou dist/index.js']); continue; }
    const r = spawnSync(process.execPath, ['--test', ...files], { cwd: dir, encoding: 'utf8' });
    const falhas = (r.stdout.match(/^ℹ fail (\d+)/m) || [])[1];
    out.push([r.status === 0 ? 'SOBREVIVEU' : 'morto', nome, falhas ? falhas + ' teste(s) falharam' : 'erro ao carregar']);
  }
} finally {
  writeFileSync(src, ORIG);
  if (!compilar()) out.push(['ERRO', 'original', 'tsc não regerou dist/index.js']);
}
for (const [s, n, d] of out) console.log(s.padEnd(11), n.padEnd(48), d);
const vivos = out.filter(x => x[0] !== 'morto').length;
console.log(`\n${out.length} mutantes, ${out.length - vivos} mortos, ${vivos} sobreviventes/erros`);
process.exitCode = vivos ? 1 : 0;
