/* Regras da MIP compartilhadas entre o servidor e o navegador.
   Portadas do protótipo (Protótipo MIP V1.html). O projeto `p` tem o mesmo formato do protótipo:
   { id, name, context, org, phase, setupStep, people, members, link, assets, answers, proposal,
     comments, versions, history, memorials }.
   No navegador, as respostas das outras pessoas não chegam: o servidor manda `p.stats` e `p.parts`
   já calculados, e as funções abaixo usam esses valores quando existem. */

/* ===== Perguntas ===== */
/* kind 'people' = escolher pessoas da equipe; senão, uma opção de opts. dec = entra na proposta. */
export const QS = {
  notas: { label: 'Como você percebe a participação de cada pessoa?', hint: 'É uma percepção, não um cálculo de propriedade.', kind: 'scores', short: 'Participação percebida' },
  origem: { label: 'Qual é a origem desta criação?', opts: ['Criada neste projeto', 'Criada antes do projeto', 'Inclui material de terceiros', 'Origem mista', 'Não sei'], short: 'Origem', dec: true },
  titularAtual: { label: 'Já existe algum documento dizendo quem é dono desta criação?', hint: 'Por exemplo, um contrato, um termo de cessão ou um registro no INPI.', opts: ['Sim, há contrato, termo ou registro', 'Não, só combinamos de boca', 'Não sei'], short: 'Documento de titularidade', dec: true },
  titular: { label: 'Quem deve ser dono?', hint: 'É uma intenção: não comprova quem é dono hoje nem transfere direitos.', kind: 'people', short: 'Titularidade pretendida', dec: true },
  divisao: { label: 'A equipe já combinou quanto cada dono tem?', opts: ['Sim, a equipe combinou percentuais', 'Ainda não, precisamos negociar', 'Não se aplica a esta criação'], short: 'Percentuais combinados', dec: true },
  uso: { label: 'Quem sair do projeto pode continuar usando esta criação?', hint: 'Pense em alguém que deixa a equipe depois.', opts: ['Qualquer pessoa que participou', 'Só quem for dono', 'Ninguém, sem um novo acordo da equipe'], short: 'Uso após a saída', dec: true },
  materiais: { label: 'Quem sair do projeto pode levar os arquivos e dados desta criação?', hint: 'Por exemplo: código, arquivos de design, planilhas e contatos.', opts: ['Sim, tudo o que precisar', 'Só o que a própria pessoa fez', 'Não, ficam com a equipe'], short: 'Arquivos e dados na saída', dec: true },
  comercial: { label: 'Pode ser vendido ou gerar dinheiro?', opts: ['Sim', 'Só com acordo de todos os donos', 'Não'], short: 'Uso comercial', dec: true },
  portfolio: { label: 'Quem pode mostrar no portfólio?', opts: ['Todos que criaram', 'Toda a equipe', 'Só com autorização dos donos'], short: 'Portfólio', dec: true },
  licenca: { label: 'Em que condição o código pode ser publicado?', opts: ['Após revisar dependências e licenças', 'Somente com autorização dos titulares', 'Não publicar por enquanto'], short: 'Publicação do código', dec: true },
  marcaRegistro: { label: 'O nome ou a marca já foi verificado para uso?', opts: ['Sim, com evidência', 'Ainda precisa de busca ou registro', 'Há conflito ou uso de terceiro'], short: 'Situação da marca', dec: true },
  terceiros: { label: 'Há conteúdo de terceiros que exige autorização?', opts: ['Não identificamos', 'Sim, autorização documentada', 'Sim, autorização pendente', 'Ainda não sabemos'], short: 'Direitos de terceiros', dec: true },
  audioDireitos: { label: 'Vozes, samples e gravações têm autorização?', opts: ['Não se aplica', 'Sim, com autorização documentada', 'Autorização pendente', 'Ainda não sabemos'], short: 'Autorizações de áudio', dec: true },
  invDivulgacao: { label: 'Há alguma condição antes de divulgar a invenção?', opts: ['Pode divulgar após decisão da equipe', 'Avaliar proteção e confidencialidade antes', 'Há obrigação com terceiro', 'Ainda não sabemos'], short: 'Divulgação da invenção', dec: true },
  remix: { label: 'Outras pessoas podem adaptar esta criação?', hint: 'Ex.: editar, remixar ou criar novas versões a partir dele.', opts: ['Sim, livremente', 'Só com autorização dos donos', 'Não'], short: 'Adaptações', dec: true }
};
export const QBASE = ['notas', 'origem', 'titularAtual', 'titular', 'divisao', 'uso', 'materiais', 'comercial', 'portfolio'];
/* Tipos de criação: cada um pode acrescentar uma pergunta própria (extra). */
export const TYPES = [
  { k: 'codigo', n: 'Código', ex: 'App, site, script', ph: 'Ex.: Backend, App do aluno', extra: 'licenca' },
  { k: 'marca', n: 'Marca', ex: 'Nome, logo, slogan', ph: 'Ex.: Logo, Nome do app', extra: 'marcaRegistro' },
  { k: 'design', n: 'Design', ex: 'Telas, ilustrações, layout', ph: 'Ex.: Telas do app', extra: 'terceiros' },
  { k: 'conteudo', n: 'Texto ou mídia', ex: 'Textos, vídeos, fotos', ph: 'Ex.: Roteiro, Fotos do evento', extra: 'terceiros' },
  { k: 'audio', n: 'Música e áudio', ex: 'Trilha, efeitos, voz', ph: 'Ex.: Trilha sonora', extra: 'audioDireitos' },
  { k: 'invencao', n: 'Invenção', ex: 'Produto, protótipo, processo', ph: 'Ex.: Sensor de umidade', extra: 'invDivulgacao' },
  { k: 'outro', n: 'Outro', ex: 'Qualquer outra criação', ph: 'Ex.: Planilha de dados', extra: null }
];
export const typeOf = a => TYPES.find(t => t.k === (a && a.type));
export const qsFor = a => { const t = typeOf(a); return t && t.extra ? QBASE.concat(t.extra) : QBASE; };
export const decQs = a => qsFor(a).filter(q => QS[q].dec);
export const isP = q => QS[q].kind === 'people';
export const GRP = q => ['notas', 'desc', 'origem', 'titularAtual'].includes(q) ? 'Origem e situação atual' : ['titular', 'divisao'].includes(q) ? 'Titularidade pretendida' : 'Uso e condições';
/* Respostas em 3 telas por criação. */
export const GROUPS = { contrib: ['notas', 'desc', 'origem', 'titularAtual'], donos: ['titular', 'divisao'], uso: ['uso', 'materiais', 'comercial', 'portfolio', 'licenca', 'remix', 'marcaRegistro', 'terceiros', 'audioDireitos', 'invDivulgacao'] };
export const GNAME = { contrib: 'Contribuição e origem', donos: 'Titularidade pretendida', uso: 'Uso e condições' };
export const stepOf = q => Object.keys(GROUPS).find(g => GROUPS[g].includes(q));
export const steps = () => ['contrib', 'donos', 'uso', 'review'];
/* Participação percebida: 4 níveis (a conta usa os valores). */
export const LV = [[0, 'Nada'], [3, 'Pouco'], [6, 'Parte'], [10, 'Muito']];
export const lvOf = n => LV.reduce((b, x) => Math.abs(x[0] - n) < Math.abs(b[0] - n) ? x : b)[0];
export const lvName = n => LV.find(x => x[0] === lvOf(+n))[1];
export const PHN = { coleta: 'Respondendo', encerrada: 'Respostas encerradas', decisao: 'Decidindo', confirmacao: 'Em confirmação', consolidado: 'Acordo confirmado' };
/* Nome da fase para a tela: antes de liberar as perguntas, o projeto ainda está sendo preparado. */
export const phaseName = p => (p.phase === 'coleta' && ['equipe', 'ativos', 'sobre'].includes(p.setupStep) ? 'Preparando' : PHN[p.phase]);
export const SCEN = {
  notas: [['Comparar percepções', 'As respostas ajudam a identificar divergências sobre a participação. Não geram percentuais.'], ['Registrar evidências', 'Converse sobre relatos e links antes de decidir a titularidade pretendida.']],
  titular: [['Titularidade pretendida', 'Registre quem a equipe pretende indicar e o fundamento.'], ['Situação atual separada', 'Confira documentos e possíveis direitos de terceiros antes de formalizar.'], ['Ponto em aberto', 'Marque a criação como sem acordo e descreva a pendência.']],
  uso: [['Qualquer pessoa que participou', 'Quem sai continua podendo usar a criação, mesmo sem ser dono.'], ['Só quem for dono', 'Quem sai sem ser dono deixa de usar a criação.'], ['Ninguém, sem um novo acordo', 'Depois da saída, qualquer uso exige um novo acordo da equipe.']]
};
/* Sobre o projeto: quem organiza responde uma vez. */
export const SOBRE = {
  contas: { label: 'Em nome de quem estão o domínio, as contas, o repositório e a marca?', hint: 'Por exemplo: o domínio está com a Ana, o GitHub com o Bruno e o Instagram com a Carla.', kind: 'text', short: 'Domínio, contas, repositório e marca', ph: 'Escreva o nome de quem é dono de cada um' },
  acordo: { label: 'Já existe algum acordo sobre participação ou saída de integrantes?', opts: ['Nenhum', 'Verbal', 'Escrito'], short: 'Acordo existente' },
  edital: { label: 'Existe contrato, regulamento ou edital que dê direitos sobre o que vocês criam?', hint: 'Da faculdade, de um programa, de uma incubadora ou de um empregador.', opts: ['Sim', 'Não', 'Não sei'], short: 'Contrato, regulamento ou edital' },
  editalQual: { label: 'Qual documento? (opcional)', kind: 'text', short: 'Qual documento', ph: 'Ex.: regulamento da disciplina, edital do programa', when: s => s.edital === 'Sim', optional: true }
};
export const sobreKeys = s => Object.keys(SOBRE).filter(k => !SOBRE[k].when || SOBRE[k].when(s || {}));
export const sobreErrors = s => { const e = {}; sobreKeys(s).forEach(k => { if (!SOBRE[k].optional && !String((s || {})[k] || '').trim()) e['sobre:' + k] = SOBRE[k].kind === 'text' ? 'Responda esta pergunta' : 'Escolha uma opção'; }); return e; };
/* Sobre você: cada pessoa responde uma vez por projeto. */
export const PERFIL = {
  funcao: { label: 'Qual é a sua função na equipe?', kind: 'text', short: 'Função', ph: 'Ex.: desenvolvimento, design, pesquisa, gestão' },
  investiu: { label: 'Você investiu dinheiro no projeto?', hint: 'Por exemplo: domínio, hospedagem, ferramentas ou materiais.', opts: ['Sim', 'Não'], short: 'Investiu dinheiro' }
};
export const perfilErrors = f => { const e = {}; Object.keys(PERFIL).forEach(k => { if (!String((f || {})[k] || '').trim()) e['perfil:' + k] = PERFIL[k].kind === 'text' ? 'Escreva sua função' : 'Escolha uma opção'; }); return e; };
export const perfilDone = (p, pid) => !Object.keys(perfilErrors(mem(p, pid)?.perfil)).length;

export const LIMITS = 'Este registro reúne as decisões da equipe para uma formalização futura. Ele não substitui contrato, advogado ou registro oficial.';
export const SECTIONS = [['equipe', 'Equipe'], ['ativos', 'Criações'], ['sobre', 'Sobre o projeto'], ['resp', 'Perguntas'], ['decidir', 'Decisões'], ['conf', 'Confirmação'], ['memorial', 'Registro do acordo']];
export const PCT_SIM = 'Sim, a equipe combinou percentuais';
export const PCT_NEG = 'Ainda não, precisamos negociar';

/* ===== Utilidades ===== */
export const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
export const fmt = t => new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }).replace(', ', ' às ');
export const nm = (p, pid) => (p.people && p.people[pid] ? p.people[pid].name : pid);
export const mem = (p, pid) => p.members.find(m => m.pid === pid);
export const elig = p => p.members.filter(m => m.status === 'ativo' && m.elig).map(m => m.pid);
export const approved = p => p.assets.filter(a => a.st === 'ok');
export const ansOf = (p, pid, aid) => p.answers[pid] && p.answers[pid][aid];
export const lastV = p => p.versions[p.versions.length - 1];
export const roleTxt = (p, pid) => (p.org === pid ? 'Quem organiza' : 'Integrante');
export const validLink = s => /^https?:\/\/\S+$/i.test((s || '').trim());

/* ===== Participação percebida ===== */
export const notasOf = d => (d && d.notas) || {};
export const hasNota = (n, pid) => n[pid] !== undefined && n[pid] !== '' && n[pid] !== null && !isNaN(+n[pid]);
export const contribOf = d => Object.keys(notasOf(d)).filter(k => +notasOf(d)[k] > 0);
export const shares = n => { const ks = Object.keys(n), tot = ks.reduce((s, k) => s + (+n[k] || 0), 0), o = {}; ks.forEach(k => { o[k] = tot ? Math.round(100 * (+n[k] || 0) / tot) : 0; }); return o; };
export function partOf(p, aid) {
  if (p.parts && p.parts[aid]) return p.parts[aid];
  const E = elig(p), avg = {};
  E.forEach(t => {
    const xs = E.map(pid => notasOf(ansOf(p, pid, aid)?.sent)[t]).filter(x => x !== undefined && x !== '' && x !== null).map(Number);
    avg[t] = xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  });
  return { avg, share: shares(avg) };
}
export const partTxt = (p, pt) => Object.keys(pt.avg).filter(k => pt.avg[k] > 0).map(k => nm(p, k) + ': ' + lvName(pt.avg[k]).toLowerCase()).join(' · ') || 'Sem participação informada';
export const pctTxt = (p, s) => s.v?.divisao === PCT_SIM ? (s.v.titular || []).concat(s.externo ? ['__externo__'] : []).map(pid => (pid === '__externo__' ? s.externo : nm(p, pid)) + ': ' + (s.percentual || {})[pid] + '%').join(' · ') : 'Não acordados';
export const fmtAns = (p, q, v) => q === 'notas'
  ? (Object.keys(v || {}).filter(k => hasNota(v, k)).map(k => nm(p, k) + ': ' + lvName(v[k]).toLowerCase()).join(' · ') || 'Sem respostas')
  : isP(q) ? ((v || []).map(x => nm(p, x)).join(', ') || 'Ninguém marcado') : (v || 'Não respondida');

/* ===== Comparação das respostas (HU-15) ===== */
export const norm = (v, q) => (isP(q) ? [...(v || [])].sort().join('|') : v);
/* vals leva o autor (pid); o servidor só manda vals depois do encerramento das respostas. */
export function itemStatus(p, aid, q) {
  if (p.stats && p.stats[aid] && p.stats[aid][q]) return p.stats[aid][q];
  const E = elig(p);
  if (q === 'notas') {
    const vals = [];
    E.forEach(pid => { const a = ansOf(p, pid, aid); if (a && a.sent) vals.push({ pid, v: notasOf(a.sent) }); });
    const spread = E.some(t => { const xs = vals.filter(x => hasNota(x.v, t)).map(x => +x.v[t]); return xs.length > 1 && Math.max(...xs) - Math.min(...xs) > 2; });
    return { status: spread ? 'div' : (!vals.length || vals.length < E.length ? 'pend' : 'conv'), vals, missing: E.filter(pid => !vals.find(x => x.pid === pid)) };
  }
  const vals = [];
  /* Quem não respondeu esta pergunta (por exemplo, enviou antes de ela existir) conta como pendente, nunca como concordância. */
  E.forEach(pid => { const a = ansOf(p, pid, aid); if (a && a.sent && a.sent[q] !== undefined && a.sent[q] !== '') vals.push({ pid, v: a.sent[q], ext: q === 'titular' ? (a.sent.titularExterno || '') : '' }); });
  const set = new Set(vals.map(x => norm(x.v, q) + (q === 'titular' ? '|' + x.ext.trim().toLowerCase() : '')));
  const status = set.size > 1 ? 'div' : (vals.length === 0 || vals.length < E.length ? 'pend' : 'conv');
  return { status, vals, missing: E.filter(pid => !vals.find(x => x.pid === pid)) };
}
/* Distribuição das respostas por opção. */
export function distRows(p, aid, q) {
  const r = itemStatus(p, aid, q), n = r.vals.length;
  if (q === 'notas') return elig(p).map(t => { const xs = r.vals.filter(x => hasNota(x.v, t)).map(x => +x.v[t]); if (!xs.length) return [nm(p, t), 'sem respostas']; const lo = Math.min(...xs), hi = Math.max(...xs); return [nm(p, t), lvName(lo) === lvName(hi) ? lvName(lo) : 'de ' + lvName(lo).toLowerCase() + ' a ' + lvName(hi).toLowerCase()]; });
  if (isP(q)) return elig(p).map(t => [nm(p, t), r.vals.filter(x => (x.v || []).includes(t)).length + ' de ' + n + ' marcaram']).concat(q === 'titular' ? r.vals.filter(x => x.ext).map(x => ['Titular fora da equipe indicado', x.ext]) : []);
  const c = {}; r.vals.forEach(x => { if (x.v) c[x.v] = (c[x.v] || 0) + 1; });
  return Object.keys(c).map(o => [o, c[o] + (c[o] > 1 ? ' pessoas' : ' pessoa')]);
}
/* Proposta inicial de uma criação: o que todos responderam igual já entra preenchido. */
export function propDefault(p, aid) {
  const a = p.assets.find(x => x.id === aid), v = {};
  decQs(a).forEach(q => { const r = itemStatus(p, aid, q); v[q] = r.status === 'conv' && r.vals.length ? clone(r.vals[0].v) : (isP(q) ? [] : ''); });
  const own = itemStatus(p, aid, 'titular');
  return { v, externo: own.status === 'conv' && own.vals.length ? own.vals[0].ext : '', percentual: {}, texto: '', semAcordo: false, saved: false };
}
export const propOf = (p, aid) => p.proposal[aid] || propDefault(p, aid);
export const decPts = (p, a) => ['notas'].concat(decQs(a)).filter(q => itemStatus(p, a.id, q).status !== 'conv');
/* Passo a passo da decisão: todos os pontos, na ordem das perguntas, depois a revisão. Os pontos em que todos
   concordaram também aparecem (já preenchidos e marcados como sem divergência), para que nada surja na proposta
   sem ter passado pela tela. */
export const dsteps = (p, a) => ['notas'].concat(decQs(a), 'review');
export const decPick = (p, q, pr) => (isP(q) ? (pr.v[q] || []).map(x => nm(p, x)).join(', ') : pr.v[q] || '');
export const diffCount = p => approved(p).reduce((s, a) => s + ['notas'].concat(decQs(a)).filter(q => itemStatus(p, a.id, q).status !== 'conv').length, 0);
/* Validação da proposta de uma criação (null quando está tudo certo). */
export function propError(p, aid) {
  const pr = propOf(p, aid), a = p.assets.find(x => x.id === aid);
  const miss = decQs(a).filter(q => isP(q) ? !(pr.v[q] || []).length && !(q === 'titular' && pr.externo?.trim()) : !pr.v[q]);
  if (!pr.semAcordo && miss.length) return 'Falta preencher: ' + miss.map(q => QS[q].short).join(', ') + '. Ou marque que ainda não há acordo.';
  if (!pr.semAcordo && pr.v.divisao === PCT_SIM) {
    const ps = (pr.v.titular || []).concat(pr.externo?.trim() ? ['__externo__'] : []), vals = ps.map(pid => Number((pr.percentual || {})[pid]));
    if (!ps.length || ps.some(pid => (pr.percentual || {})[pid] === '' || (pr.percentual || {})[pid] === undefined) || vals.some(n => !Number.isFinite(n) || n < 0 || n > 100) || Math.abs(vals.reduce((x, y) => x + y, 0) - 100) > 0.001) return 'Informe percentuais válidos para todos os titulares pretendidos, somando 100%.';
  }
  return null;
}

/* ===== Respostas: validação por tela e no envio ===== */
export function stepErrors(p, me, a, d, g) {
  const err = {}, k = a.id + ':';
  if (g === 'contrib') {
    if (!elig(p).every(pid => hasNota(notasOf(d), pid))) err[k + 'notas'] = 'Escolha quanto cada pessoa fez';
    if (+notasOf(d)[me] > 0 && !(d.desc || '').trim()) err[k + 'desc'] = 'Conte em uma frase o que você fez';
    if (!d.origem) err[k + 'origem'] = 'Informe a origem';
    if (!d.titularAtual) err[k + 'titularAtual'] = 'Diga se já existe um documento';
    if ((d.link || '').trim() && !validLink(d.link)) err[k + 'link'] = 'Informe um link válido, começando com http';
  } else if (g !== 'review') {
    GROUPS[g].filter(x => qsFor(a).includes(x)).forEach(x => {
      if (isP(x) ? !(d[x] || []).length && !(x === 'titular' && (d.titularExterno || '').trim()) : !d[x]) err[k + x] = 'Escolha uma opção ou informe titular fora da equipe';
    });
  }
  return err;
}
/* Limpa o rascunho e devolve os erros que impedem o envio. */
export function sendErrors(p, me, a, d) {
  const E = elig(p), err = {};
  qsFor(a).forEach(q => {
    if (q === 'notas') { const n = notasOf(d), o = {}; E.forEach(pid => { if (hasNota(n, pid)) o[pid] = +n[pid]; }); d.notas = o; if (!E.every(pid => hasNota(o, pid))) err[a.id + ':notas'] = 'Escolha a participação percebida de cada pessoa'; return; }
    if (isP(q)) d[q] = (d[q] || []).filter(x => E.includes(x));
    if (isP(q) ? !d[q].length && !(q === 'titular' && (d.titularExterno || '').trim()) : !d[q]) err[a.id + ':' + q] = 'Responda esta pergunta para enviar';
  });
  if (contribOf(d).includes(me) && !(d.desc || '').trim()) err[a.id + ':desc'] = 'Conte em uma frase o que você fez';
  if ((d.link || '').trim() && !validLink(d.link)) err[a.id + ':link'] = 'Informe um link válido, começando com http';
  return err;
}

/* ===== Próxima tarefa de cada pessoa ===== */
export function taskFor(p, pid, qpos = {}) {
  const m = mem(p, pid), org = p.org === pid, as = approved(p);
  if (!m || m.status === 'pendente') return { tab: 'proj', label: 'Aceitar convite', note: 'Entre no projeto para ver suas tarefas.' };
  if (p.phase === 'coleta') {
    if (org && p.setupStep !== 'resp' && (['equipe', 'ativos', 'sobre'].includes(p.setupStep) || !as.length)) return p.setupStep === 'equipe'
      ? { tab: 'equipe', label: 'Adicionar a equipe', note: 'Passo 1 de 3. Adicione quem participou do projeto.', cta: 'Adicionar pessoas' }
      : p.setupStep === 'sobre' && as.length
        ? { tab: 'sobre', label: 'Contar sobre o projeto', note: 'Passo 3 de 3. Três perguntas rápidas sobre contas, acordos e regras. Depois, libere as perguntas.', cta: 'Responder' }
        : { tab: 'ativos', label: 'Cadastrar as criações', note: 'Passo 2 de 3. Cadastre o que a equipe criou.', cta: 'Cadastrar criações' };
    if (!as.length) return { tab: 'ativos', label: 'Aguardando as criações', note: 'Quem organiza está cadastrando o que a equipe criou. Você pode sugerir uma criação.', cta: 'Ver criações' };
    if (!m.elig) return { tab: 'coleta', label: 'Acompanhar a equipe', note: 'Você entrou depois do início e não responde desta vez.', cta: 'Ver andamento' };
    const left = as.filter(a => !ansOf(p, pid, a.id)?.sent);
    if (left.length) return { tab: 'resp', label: 'Responder as perguntas', note: left.length + (left.length > 1 ? ' criações' : ' criação') + ' para responder. Você pode parar e continuar depois.', cta: left.some(a => qpos[a.id]) ? 'Continuar respondendo' : 'Começar a responder' };
    if (org) { const miss = elig(p).filter(x => as.some(a => !ansOf(p, x, a.id)?.sent)); return { tab: 'coleta', label: miss.length ? 'Aguardando a equipe' : 'Todos responderam', note: miss.length ? 'Faltam respostas de ' + miss.length + ' pessoa' + (miss.length > 1 ? 's' : '') + '. Você pode lembrar ou encerrar mesmo assim.' : 'Encerre as respostas para decidir com a equipe.', cta: miss.length ? 'Ver andamento' : 'Encerrar respostas' }; }
    return { tab: 'proj', label: 'Você está em dia', note: 'Suas respostas foram enviadas. Avisaremos quando a proposta estiver pronta.' };
  }
  if (p.phase === 'decisao') {
    const lv = lastV(p), rf = lv ? Object.keys(lv.conf).filter(k => lv.conf[k].v === 'no') : [];
    if (rf.length) {
      const r = lv.conf[rf[0]], who = nm(p, rf[0]), ats = (r.assets || []).map(x => lv.snap[x]?.name).filter(Boolean).join(', ');
      if (org) return { tab: 'decidir', label: 'Ajustar a proposta', note: who + ' recusou a proposta ' + lv.n + (ats ? ' e pediu ajuste em ' + ats : '') + ': "' + r.comment + '"', cta: 'Ajustar proposta' };
      if (rf.includes(pid)) return { tab: 'proj', label: 'Sua recusa foi enviada', note: nm(p, p.org) + ' vai ajustar a proposta. Você confirma a nova versão quando ela chegar.' };
      return { tab: 'proj', label: 'A proposta voltou para ajuste', note: who + ' recusou: "' + r.comment + '". Quando a nova versão chegar, todos confirmam de novo.' };
    }
  }
  if (p.phase === 'encerrada' || p.phase === 'decisao') return org
    ? { tab: 'decidir', label: 'Decidir com a equipe', note: 'Veja onde as respostas diferem e registre o que vale para cada criação.', cta: 'Abrir decisões' }
    : { tab: 'proj', label: 'Você está em dia', note: 'Quem organiza está registrando as decisões. Você pode acompanhar e comentar em Decisões.' };
  if (p.phase === 'confirmacao') {
    const v = lastV(p), c = v && v.conf[pid], sem = Object.values(v.snap).filter(s => s.semAcordo).map(s => s.name);
    if (sem.length && elig(p).every(x => v.conf[x] && v.conf[x].v === 'ok')) return org
      ? { tab: 'conf', label: 'Falta acordo em ' + sem.join(', '), note: 'Todos confirmaram o resto. Quando a equipe decidir, reabra a proposta e registre a decisão.', cta: 'Reabrir proposta' }
      : { tab: 'proj', label: 'Falta acordo em ' + sem.join(', '), note: 'Todos confirmaram o resto. Quando a equipe decidir, ' + nm(p, p.org) + ' envia uma nova proposta.' };
    return c || !m.elig
      ? { tab: 'proj', label: 'Você está em dia', note: 'Sua posição foi registrada. Aguarde as demais pessoas.' }
      : { tab: 'conf', label: 'Confirmar a proposta', note: 'Leia a proposta e diga se ela representa o que a equipe combinou.', cta: 'Ler proposta' };
  }
  return { tab: 'memorial', label: 'Acordo confirmado', note: 'Todas as pessoas confirmaram. O registro do acordo está pronto.', cta: 'Ver registro do acordo' };
}
/* Resumo de cada parte do projeto na página do projeto. */
export function secInfo(p, me, k) {
  const m = mem(p, me), as = approved(p), E = elig(p), lv = lastV(p);
  if (k === 'equipe') { const n = p.members.filter(x => x.status === 'ativo').length; return { on: true, s: n + (n === 1 ? ' pessoa' : ' pessoas') }; }
  if (k === 'ativos') { const sg = p.assets.filter(a => a.st === 'sug').length; return { on: true, s: as.length + (as.length === 1 ? ' criação' : ' criações') + (sg ? ' · ' + sg + (sg > 1 ? ' sugestões' : ' sugestão') + ' para avaliar' : '') }; }
  if (k === 'sobre') { const n = sobreKeys(p.sobre).filter(x => !SOBRE[x].optional).length, d = n - Object.keys(sobreErrors(p.sobre)).length; return { on: true, s: d === n ? 'Respondido' : d + ' de ' + n + ' respondidas' }; }
  if (k === 'resp') { if (!m.elig) return { on: false, s: 'Você não responde desta vez' }; if (!as.length) return { on: false, s: 'Depois do cadastro das criações' }; const d = as.filter(a => ansOf(p, me, a.id)?.sent).length; return { on: true, s: d === as.length ? 'Respondidas' : d + ' de ' + as.length + ' criações respondidas' }; }
  if (k === 'coleta') { const done = E.filter(x => as.length && as.every(a => ansOf(p, x, a.id)?.sent)).length; return { on: true, s: p.phase === 'coleta' ? done + ' de ' + E.length + ' pessoas concluíram' : 'Respostas encerradas' }; }
  if (k === 'decidir') { if (p.phase === 'coleta') return { on: false, s: 'Abre após o encerramento da coleta' }; const n = diffCount(p); return { on: true, s: n ? n + (n > 1 ? ' pontos com diferença' : ' ponto com diferença') : 'Todos concordaram' }; }
  if (k === 'conf') { if (!lv) return { on: false, s: 'Quando a proposta for enviada' }; return { on: true, s: Object.values(lv.conf).filter(c => c.v === 'ok').length + ' de ' + E.length + ' confirmaram' }; }
  return lv ? { on: true, s: p.phase === 'consolidado' ? 'Pronto' : 'Prévia disponível' } : { on: false, s: 'Quando a proposta for enviada' };
}

/* ===== Proposta enviada (versão) ===== */
export function snapshot(p) {
  const snap = {};
  approved(p).forEach(a => {
    const pr = propOf(p, a.id);
    snap[a.id] = {
      name: a.name, cat: a.cat, desc: a.desc || '', link: a.link || '', part: partOf(p, a.id), qs: decQs(a), v: clone(pr.v),
      externo: pr.externo || '', percentual: clone(pr.percentual || {}), texto: pr.texto || '', semAcordo: !!pr.semAcordo,
      relatos: elig(p).map(pid => { const x = ansOf(p, pid, a.id)?.sent; return { pid, respondido: !!x, desc: x?.desc || '', evidencia: x?.link || '', origem: x?.origem || '', titularAtual: x?.titularAtual || '', titularAtualNome: x?.titularAtualNome || '', titularAtualBase: x?.titularAtualBase || '', titularExterno: x?.titularExterno || '' }; })
    };
  });
  return snap;
}

/* ===== Registro do acordo (HU-24) ===== */
export function memorialBody(p, at) {
  const v = lastV(p), L = [], E = elig(p), allOk = E.every(pid => v.conf[pid]?.v === 'ok');
  const n = pid => nm(p, pid), fa = (q, x) => fmtAns(p, q, x);
  L.push('REGISTRO DO ACORDO');
  L.push('Projeto: ' + p.name + ' (' + (p.context || 'sem contexto') + ')');
  L.push('Situação da proposta ' + v.n + ': ' + (allOk ? 'confirmada por todos' : 'em confirmação'));
  L.push('Gerado em: ' + fmt(at)); L.push('');
  L.push('SOBRE O PROJETO');
  sobreKeys(p.sobre).forEach(k => L.push('- ' + SOBRE[k].short + ': ' + ((p.sobre || {})[k] || 'não informado')));
  L.push('');
  L.push('PARTICIPANTES');
  p.members.forEach(m => {
    L.push('- ' + n(m.pid) + ', ' + roleTxt(p, m.pid).toLowerCase() + (m.status === 'naopart' ? ' (não respondeu)' : m.status === 'pendente' ? ' (convite pendente)' : !m.elig ? ' (entrou depois das respostas)' : ''));
    if (m.perfil && (m.perfil.funcao || m.perfil.investiu)) L.push('  Função declarada: ' + (m.perfil.funcao || 'não informada') + ' · Investiu dinheiro: ' + (m.perfil.investiu || 'não informado'));
  });
  L.push(''); L.push('SITUAÇÃO POR CRIAÇÃO');
  approved(p).forEach(a => {
    const x = v.snap[a.id]; if (!x) return;
    L.push(''); L.push(a.name + ' (' + (a.cat || 'criação') + ')');
    if (x.desc) L.push('  Descrição: ' + x.desc);
    if (x.link) L.push('  Link da criação: ' + x.link);
    L.push('  Estado da decisão: ' + (x.semAcordo ? 'SEM ACORDO' : 'proposta registrada'));
    L.push('  Participação percebida: ' + (x.part ? partTxt(p, x.part) : 'não informada') + '. Não define titularidade ou quotas.');
    L.push('  Relatos individuais sobre origem e titularidade atual:');
    (x.relatos || []).forEach(r => {
      L.push('  - ' + n(r.pid) + ': ' + (r.respondido ? 'respondeu' : 'não respondeu'));
      if (r.respondido) {
        L.push('    Origem declarada: ' + (r.origem || 'não informada'));
        L.push('    Documento de titularidade: ' + (r.titularAtual || 'não informada'));
        L.push('    Titular indicado hoje: ' + (r.titularAtualNome || 'não informado'));
        if (r.titularExterno) L.push('    Titular pretendido fora da equipe, segundo esta pessoa: ' + r.titularExterno);
        L.push('    Base ou documento: ' + (r.titularAtualBase || 'não informado'));
        L.push('    Contribuição descrita: ' + (r.desc || 'não descrita'));
        L.push('    Evidência: ' + (r.evidencia || 'não informada'));
      }
    });
    L.push('  Decisões e condições propostas:');
    (x.qs || []).forEach(q => L.push('  - ' + QS[q].short + ': ' + fa(q, x.v[q])));
    if (x.externo) L.push('  - Titular pretendido fora da equipe: ' + x.externo);
    L.push('  Percentuais de titularidade combinados: ' + pctTxt(p, x));
    if (x.texto) L.push('  Explicações e pendências anotadas: ' + x.texto);
    const pend = [];
    if (x.semAcordo) pend.push('decisão da criação ainda sem acordo');
    if (x.v.divisao === PCT_NEG) pend.push('percentuais ainda não negociados');
    if (x.v.titularAtual === 'Não sei' || x.v.titularAtual === 'Ainda não sabemos') pend.push('titularidade atual a verificar');
    if (x.v.origem === 'Não sei') pend.push('origem a verificar');
    if (x.v.terceiros === 'Sim, autorização pendente' || x.v.terceiros === 'Ainda não sabemos') pend.push('direitos de terceiros a verificar');
    if (x.v.audioDireitos === 'Autorização pendente' || x.v.audioDireitos === 'Ainda não sabemos') pend.push('autorizações de áudio a verificar');
    if (x.v.marcaRegistro === 'Ainda precisa de busca ou registro' || x.v.marcaRegistro === 'Há conflito ou uso de terceiro') pend.push('situação da marca a verificar');
    if (x.v.invDivulgacao === 'Ainda não sabemos' || x.v.invDivulgacao === 'Avaliar proteção e confidencialidade antes') pend.push('condições de divulgação a definir');
    L.push('  Pendências identificadas: ' + (pend.join('; ') || 'nenhuma marcada na proposta'));
  });
  L.push(''); L.push('CONFIRMAÇÕES DA PROPOSTA ' + v.n);
  E.forEach(pid => { const c = v.conf[pid]; L.push('- ' + n(pid) + ': ' + (c ? (c.v === 'ok' ? 'confirmou' : 'recusou (' + c.comment + ')') + ' em ' + fmt(c.at) : 'ainda não se posicionou')); });
  const ref = []; p.versions.forEach(x => Object.keys(x.conf).forEach(k => { if (x.conf[k].v === 'no') ref.push('- ' + n(k) + ' recusou a proposta ' + x.n + ': ' + x.conf[k].comment); }));
  if (ref.length) { L.push(''); L.push('RECUSAS E AJUSTES ANTERIORES'); ref.forEach(r => L.push(r)); }
  L.push(''); L.push(LIMITS);
  return L.join('\n');
}
export const memorialText = m => m.body;
