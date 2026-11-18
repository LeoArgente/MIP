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
  ['itemStatus (externo só no titular)', "+ (q === 'titular' ? '|' + x.ext", "+ (q !== 'titular' ? '|' + x.ext"],
  ['itemStatus (p.stats)', "if (p.stats && p.stats[aid] && p.stats[aid][q])", "if (p.stats && p.stats[aid] && !p.stats[aid][q])"],
  ['norm', "(isP(q) ? [...(v || [])].sort().join('|') : v)", "(!isP(q) ? [...(v || [])].sort().join('|') : v)"],
  ['distRows (plural)', "(c[o] > 1 ? ' pessoas' : ' pessoa')", "(c[o] <= 1 ? ' pessoas' : ' pessoa')"],
  ['distRows (faixa de notas)', "lvName(lo) === lvName(hi) ?", "lvName(lo) !== lvName(hi) ?"],
  ['diffCount', "status !== 'conv').length, 0)", "status === 'conv').length, 0)"],
  ['decPts', "status !== 'conv');", "status === 'conv');"],
  ['shares', "tot ? Math.round", "!tot ? Math.round"],
  ['partOf', "xs.length ? xs.reduce", "!xs.length ? xs.reduce"],
  ['partTxt', "filter(k => pt.avg[k] > 0)", "filter(k => pt.avg[k] <= 0)"],
  ['pctTxt', "s.v?.divisao === PCT_SIM ?", "s.v?.divisao !== PCT_SIM ?"],
  ['contribOf', "filter(k => +notasOf(d)[k] > 0)", "filter(k => +notasOf(d)[k] <= 0)"],
  ['notasOf', "(d && d.notas) || {}", "(d && !d.notas) || {}"],
  ['hasNota', "n[pid] !== undefined && n[pid] !== ''", "n[pid] === undefined && n[pid] !== ''"],
  ['propError (sem acordo)', "if (!pr.semAcordo && miss.length)", "if (pr.semAcordo && miss.length)"],
  ['propError (soma 100)', "- 100) > 0.001)", "- 100) < 0.001)"],
  ['propError (externo supre titular)', "!(q === 'titular' && pr.externo?.trim())", "(q === 'titular' && pr.externo?.trim())"],
  ['stepErrors', "if (+notasOf(d)[me] > 0 &&", "if (+notasOf(d)[me] <= 0 &&"],
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
  ['taskFor (continuar respondendo)', "left.some(a => qpos[a.id]) ?", "!left.some(a => qpos[a.id]) ?"],
  ['taskFor (sem acordo)', "if (sem.length && eligNaVersao(v).every", "if (!sem.length && eligNaVersao(v).every"],
  ['secInfo', "d === n ? 'Respondido'", "d !== n ? 'Respondido'"],
  ['phaseName', "(p.phase === 'coleta' && ['equipe'", "(p.phase !== 'coleta' && ['equipe'"],
  ['stepOf', "GROUPS[g].includes(q))", "!GROUPS[g].includes(q))"],
  ['steps', "['contrib', 'donos', 'uso', 'review']", "['contrib', 'donos', 'uso']"],
  ['snapshot', "semAcordo: !!pr.semAcordo", "semAcordo: !pr.semAcordo"],
  ['memorialBody (situação)', "(allOk ? 'confirmada por todos'", "(!allOk ? 'confirmada por todos'"],
  ['memorialBody (pendência percentuais)', "if (x.v.divisao === PCT_NEG)", "if (x.v.divisao !== PCT_NEG)"],
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
