/* Telas do projeto, portadas do protótipo (vHub, vEquipe, vAtivos, vResp, vColeta, vDecidir, vConf, vMemorial). */
import { useEffect, useState } from 'react';
import {
  TYPES, SECTIONS, SCEN, QS, PCT_NEG, SOBRE, sobreKeys, sobreErrors, approved, elig, mem, nm, ansOf, lastV, qsFor, decQs, roleTxt, fmt, taskFor, secInfo,
  partOf, partTxt, pctTxt, fmtAns, propOf, decPts, dsteps, memorialText, steps, phaseName
} from '@mip/domain';
import { useProject, Page } from './Project.jsx';
import { ActionBar, Banner, Btn, Chip, Err, Head, Progress, copyText } from '../components/ui.jsx';
import { post } from '../api.js';
import { Satisfaction, markSeen } from '../components/Feedback.jsx';

export const TIPS = {
  equipe: 'Adicione quem participou do projeto. Cada pessoa responde em particular sobre cada criação.',
  ativos: 'Cadastre o que a equipe criou. O tipo da criação define uma das perguntas.',
  sobre: 'Perguntas sobre o projeto como um todo. Quem organiza responde, e todos da equipe podem ver.',
  resp: 'Uma tela por parte. Você pode sair e voltar de onde parou. Ninguém vê suas respostas até o fim; depois, a equipe vê o que cada pessoa escolheu.',
  coleta: 'Mostra quem já respondeu, sem revelar as respostas. Quem não responde nunca conta como concordância.',
  decidir: 'Aparecem só os pontos em que as respostas diferem, sem mostrar quem respondeu o quê. O que todos concordaram já entra na proposta.',
  conf: 'Cada pessoa confirma ou recusa a proposta. Uma recusa devolve a proposta para ajuste.',
  memorial: 'Reúne as decisões em um texto. O código de verificação mostra se o texto foi alterado depois.'
};

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const qposOf = (p, me) => Object.fromEntries(Object.entries(p.answers[me] || {}).map(([aid, an]) => [aid, an.step]));

/* ===== Apresentação (uma vez por pessoa) ===== */
export function Welcome({ onStart, name, askName = true }) {
  const [n, setN] = useState(name || ''), [e, setE] = useState('');
  const start = async () => { if (!n.trim()) { setE('Diga como a equipe conhece você'); return; } await onStart(n.trim()); };
  return (
    <div className="intro-card">
      <div className="intro-art" aria-hidden="true">✳</div>
      <div>
        <h3 className="h3">Como a MIP funciona</h3>
        <ol>
          <li><b>Cada pessoa responde em particular.</b> Ninguém vê suas respostas até o fim. Depois, a equipe vê o que cada pessoa escolheu, para decidir junto.</li>
          <li><b>A equipe decide só o que diverge.</b> O que todos concordaram já fica combinado.</li>
          <li><b>Todos confirmam.</b> As decisões ficam no registro do acordo.</li>
        </ol>
        <p className="muted small" style={{ marginTop: 16 }}>A MIP organiza as decisões da equipe. Ela não substitui contrato, advogado ou registro oficial.</p>
        {askName && <div className="field" style={{ marginTop: 16, maxWidth: 360 }}>
          <label htmlFor="wname">Como a equipe conhece você?</label>
          <input id="wname" type="text" autoComplete="name" value={n} onChange={x => { setN(x.target.value); setE(''); }} onKeyDown={x => x.key === 'Enter' && start()} />
          <Err msg={e} />
        </div>}
        <div className="row start" style={{ marginTop: 16 }}><Btn kind="pri" onClick={start}>Começar</Btn></div>
      </div>
    </div>
  );
}

/* ===== Equipe (status) e histórico, usados na lateral ===== */
function TeamCard() {
  const { p, me, org, act } = useProject(), E = elig(p), as = approved(p), open = p.phase === 'coleta';
  return (
    <section className="side-card">
      <div className="row"><h3>Equipe</h3><span className="muted small">{E.filter(x => as.length && as.every(a => ansOf(p, x, a.id)?.sent)).length} de {E.length} {E.length > 1 ? 'responderam' : 'respondeu'}</span></div>
      <div className="team">
        {p.members.filter(m => m.status !== 'pendente').map(m => {
          const isE = E.includes(m.pid), sent = as.filter(a => ansOf(p, m.pid, a.id)?.sent).length, done = as.length && sent === as.length;
          return (
            <div className="team-row" key={m.pid}>
              <span><b>{nm(p, m.pid)}</b>{m.pid === me && <span className="muted"> (você)</span>}</span>
              <span className="team-st">
                {!isE ? <Chip>Não responde</Chip> : done ? <Chip k="ok">Respondeu</Chip> : sent ? <Chip k="warn">Respondendo</Chip> : <Chip>Não começou</Chip>}
                {org && open && isE && !done && m.pid !== me && <button className="link" onClick={() => act('remind', { pid: m.pid }, `/api/projects/${p.id}/remind`)}>Lembrar</button>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function History() {
  const { p } = useProject();
  return (
    <section className="hub-history">
      <details className="more">
        <summary>Histórico do projeto ({p.history.length})</summary>
        <div className="list">
          {p.history.slice(0, 12).map((x, i) => <div className="li small" key={x.id || i}><span>{x.who === 'sistema' ? 'Sistema' : nm(p, x.who)} {x.text}</span><span className="mono muted">{fmt(x.at)}</span></div>)}
          {!p.history.length && <span className="muted">Sem registros.</span>}
        </div>
      </details>
    </section>
  );
}

/* ===== Página do projeto ===== */
/* Em que etapa o projeto está (índice em SECTIONS): as anteriores aparecem como feitas e as seguintes, esmaecidas. */
const stageOf = p => p.phase === 'coleta' ? ({ equipe: 0, ativos: 1, sobre: 2 }[p.setupStep] ?? 3) : { encerrada: 4, decisao: 4, confirmacao: 5, consolidado: 6 }[p.phase] ?? 3;
export function Hub() {
  const { p, me, org, go, setUi } = useProject(), t = taskFor(p, me, qposOf(p, me)), stage = stageOf(p), fase = phaseName(p);
  /* Como no protótipo: "Começar a responder" abre direto a primeira criação que falta. */
  const start = () => { if (t.tab === 'resp') { const nx = approved(p).find(a => !ansOf(p, me, a.id)?.sent); if (nx) setUi({ qasset: nx.id, qstep: ansOf(p, me, nx.id)?.step || 0 }); } go(t.tab); };
  return (
    <div className="hub">
      {/* A fase só aparece aqui quando o bloco "Agora" não diz a mesma coisa. */}
      <header className="proj"><h1>{p.name}</h1><span>{(org ? 'Você organiza' : 'Você participa') + (fase !== t.label ? ' · ' + fase : '')}</span></header>
      <section className="hub-now">
        <div><p className="label">Agora</p><h2>{t.label}</h2><p>{t.note}</p></div>
        {t.tab !== 'proj' && <Btn kind="pri" onClick={start}>{t.cta || 'Continuar'}</Btn>}
      </section>
      {p.phase === 'consolidado' && <Satisfaction projectId={p.id} where="hub" />}
      {/* Quem já respondeu só importa enquanto as respostas estão abertas. */}
      {p.phase === 'coleta' && p.setupStep === 'resp' && <TeamCard />}
      <section className="hub-sec" aria-labelledby="hub-etapas">
        <h2 id="hub-etapas">Etapas</h2>
        <div className="g-list">
          {SECTIONS.map(([k, n], ix) => {
            const i = secInfo(p, me, k), st = ix < stage ? 'done' : ix === stage ? 'now' : 'later';
            const inner = <span className="g-step"><span className="dot" aria-hidden="true">{st === 'done' ? '✓' : ''}</span><span className="g-l"><b><span className="sr">{st === 'done' ? 'Feita: ' : st === 'now' ? 'Agora: ' : ''}</span>{n}</b><span>{i.s}</span></span></span>;
            return i.on ? <button className={'g-row ' + st} key={k} onClick={() => go(k)}>{inner}<i aria-hidden="true">›</i></button> : <div className={'g-row off ' + st} key={k}>{inner}</div>;
          })}
        </div>
      </section>
      <History />
    </div>
  );
}

/* ===== Equipe ===== */
export function Equipe() {
  const { p, me, org, act, err, say } = useProject();
  const [rm, setRm] = useState(null);
  const askRemove = async pid => { const r = await act('remove', { pid }, `/api/projects/${p.id}/remove`); if (r?.confirmRemove) setRm(r.confirmRemove); };
  const doRemove = async () => { const r = await act('remove', { pid: rm.pid, confirm: true }, `/api/projects/${p.id}/remove`); if (r) setRm(null); };
  const copyInvite = async () => say(await copyText(inviteUrl) ? 'Link de convite para ' + p.name + ' copiado. Mande no grupo da equipe.' : 'Não foi possível copiar. Selecione o link e copie manualmente.', undefined);
  const setup = org && p.phase === 'coleta' && p.setupStep === 'equipe';
  const inviteUrl = p.link.code ? location.origin + '/convite/' + p.link.code : '';
  const memChip = m => m.status === 'ativo' ? (m.elig ? <Chip>Participa</Chip> : <Chip k="warn">Entrou depois das respostas</Chip>) : m.status === 'pendente' ? <Chip k="warn">Convite pendente</Chip> : <Chip>Não responde</Chip>;
  return (
    <Page bar={setup && <ActionBar note={elig(p).length > 1 ? '' : 'Você pode adicionar mais pessoas depois.'}><Btn kind="pri" onClick={() => act('setupnext')}>Continuar</Btn></ActionBar>}>
      <Head title="Equipe" sub={org && p.phase === 'coleta' ? 'Adicione quem participou do projeto. Cada pessoa responde em particular.' : 'Quem participa do projeto.'} />
      <div className="card">
        <div className="row"><h3>Integrantes</h3><Chip k="acc">{plural(elig(p).length, 'participa', 'participam')}</Chip></div>
        <div className="list">
          {p.members.map(m => (
            <div className="li" key={m.pid}>
              <div className="l"><b>{nm(p, m.pid)}</b><span className="muted small">{roleTxt(p, m.pid)}{m.perfil?.funcao ? ' · ' + m.perfil.funcao : ''}{p.people[m.pid]?.email ? ' · ' + p.people[m.pid].email : ''}</span></div>
              <div className="row start">
                {memChip(m)}
                {org && m.pid !== p.org && m.status === 'ativo' && <button className="link" onClick={() => act('naopart', { pid: m.pid })}>Tirar das respostas</button>}
                {org && m.pid !== p.org && p.phase === 'coleta' && rm?.pid !== m.pid && <Btn kind="sm bad" onClick={() => askRemove(m.pid)}>Remover</Btn>}
              </div>
              {rm?.pid === m.pid && (
                <div className="banner warn" style={{ width: '100%' }}>
                  <span>Remover {rm.name} do projeto?{rm.sent ? ' As respostas que ' + rm.name + ' já enviou serão apagadas.' : ''} Para voltar, será preciso adicionar de novo.</span>
                  <span className="row start"><Btn kind="sm" onClick={() => setRm(null)}>Cancelar</Btn><Btn kind="sm bad" onClick={doRemove}>Remover do projeto</Btn></span>
                </div>
              )}
              {m.status === 'naopart' && <div className="muted small" style={{ width: '100%' }}>Tirado das respostas por {nm(p, m.by)} em {fmt(m.at)}. Continua na lista e no registro do acordo, mas não conta como pendência.</div>}
            </div>
          ))}
        </div>
        <Err msg={err.np} />
      </div>
      {org && (
        <div className="card">
          <div className="row"><h3>Adicionar pessoas</h3><Chip k={p.link.active ? 'ok' : ''}>{p.link.active ? 'Link ativo' : 'Link desativado'}</Chip></div>
          <p className="muted small">Compartilhe o link de convite para {p.name}. Quem abrir o link entra na equipe. Mande no grupo do WhatsApp, por exemplo.</p>
          <div className="tok invite" onClick={e => window.getSelection()?.selectAllChildren(e.currentTarget)}>{inviteUrl}</div>
          <div className="row start">
            <Btn kind={p.link.active ? 'pri' : ''} onClick={copyInvite} disabled={!p.link.active}>Copiar link</Btn>
            <Btn onClick={() => act('toglink')}>{p.link.active ? 'Desativar link' : 'Ativar link'}</Btn>
          </div>
        </div>
      )}
    </Page>
  );
}

/* ===== Criações ===== */
export function Criacoes() {
  const { p, me, org, act, err, setErr, go } = useProject();
  const [f, setF] = useState({ type: '', name: '', desc: '', link: '' }), [open, setOpen] = useState(false), [confirmDel, setConfirmDel] = useState(null), [rec, setRec] = useState({ aid: null, reason: '' });
  const ty = TYPES.find(x => x.k === f.type), coleta = p.phase === 'coleta';
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({}); };
  const submit = async () => { const r = await act(org ? 'addasset' : 'sugasset', f); if (r) { setF({ type: '', name: '', desc: '', link: '' }); setOpen(false); } };
  const del = async (aid, confirm) => { const r = await act('del', { aid, confirm }); if (r?.confirmDelete) setConfirmDel(r.confirmDelete); else setConfirmDel(null); };
  const showForm = coleta && (!p.assets.length || open || err.fn || err.ft || err.fl);
  const bar = org && coleta && p.setupStep !== 'resp' && <ActionBar note={approved(p).length ? '' : 'Cadastre pelo menos 1 criação para continuar.'}>{approved(p).length > 0 && <Btn kind="pri" onClick={() => (p.setupStep === 'ativos' ? act('setupnext') : go('sobre'))}>Continuar</Btn>}</ActionBar>;
  return (
    <Page bar={bar}>
      <Head title="Criações" sub={org && coleta ? 'Diga o que a equipe criou: um app, um logo, uma música. Cada criação recebe perguntas sobre contribuição, donos e uso.' : 'O que a equipe criou.'} />
      {!org && coleta && !approved(p).length && <Banner>Aguardando quem organiza cadastrar as criações. Você pode sugerir uma que considera importante.</Banner>}
      <div className="card">
        <div className="row"><h3>Cadastradas</h3><Chip k="acc">{approved(p).length}</Chip></div>
        <div className="list">
          {!p.assets.length && <span className="muted">Nenhuma criação ainda.{coleta && ' Use o formulário abaixo para ' + (org ? 'cadastrar' : 'sugerir') + ' a primeira.'}</span>}
          {p.assets.map(a => (
            <div className="li" key={a.id}>
              <div className="l">
                <b>{a.name} <Chip>{a.cat}</Chip></b>
                <span className="muted small">{a.desc || 'Sem descrição'}</span>
                {a.link && <a className="small" href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a>}
                {a.st === 'sug' && <span className="small">Sugerida por {nm(p, a.by)}. Ainda não entra nas perguntas.</span>}
                {a.st === 'rec' && <span className="small">Recusada por {nm(p, p.org)}. Motivo: {a.reason}</span>}
              </div>
              <div className="row start">
                {a.st === 'sug' && <Chip k="warn">Sugerida por {nm(p, a.by)}</Chip>}
                {a.st === 'rec' && <Chip k="bad">Recusada</Chip>}
                {org && coleta && a.st === 'sug' && rec.aid !== a.id && <><Btn kind="sm pri" onClick={() => act('aprov', { aid: a.id })}>Aprovar</Btn><Btn kind="sm" onClick={() => setRec({ aid: a.id, reason: '' })}>Recusar</Btn></>}
                {org && coleta && a.st === 'ok' && <Btn kind="sm bad" onClick={() => del(a.id, false)}>Excluir</Btn>}
              </div>
              {confirmDel?.aid === a.id && (
                <div className="banner warn" style={{ width: '100%' }}>
                  <span>{plural(confirmDel.n, 'resposta será descartada', 'respostas serão descartadas')}. Deseja excluir “{a.name}”?</span>
                  <span className="row start"><Btn kind="sm bad" onClick={() => del(a.id, true)}>Confirmar exclusão</Btn><Btn kind="sm" onClick={() => setConfirmDel(null)}>Cancelar</Btn></span>
                </div>
              )}
              {rec.aid === a.id && (
                <div className="banner" style={{ width: '100%' }}>
                  <div className="field" style={{ flex: 1, minWidth: 200 }}><label htmlFor={'rs-' + a.id}>Motivo da recusa <span className="muted">(opcional)</span></label><input id={'rs-' + a.id} type="text" value={rec.reason} onChange={e => setRec({ ...rec, reason: e.target.value })} placeholder="Ex.: já está incluída no Backend" autoFocus /></div>
                  <span className="row start"><Btn kind="sm bad" onClick={async () => { await act('recusok', { aid: a.id, reason: rec.reason }); setRec({ aid: null, reason: '' }); }}>Recusar sugestão</Btn><Btn kind="sm" onClick={() => setRec({ aid: null, reason: '' })}>Cancelar</Btn></span>
                </div>
              )}
              {err['d' + a.id] && <div style={{ width: '100%' }}><Err msg={err['d' + a.id]} /></div>}
            </div>
          ))}
        </div>
      </div>
      {!coleta ? <Banner>A lista de criações não muda mais desde que as respostas foram encerradas.</Banner>
        : !showForm ? <div><Btn onClick={() => setOpen(true)}>{org ? '+ Cadastrar outra criação' : '+ Sugerir uma criação'}</Btn></div>
          : (
            <div className="card">
              <h3>{org ? 'Cadastrar criação' : 'Sugerir uma criação que ficou de fora'}</h3>
              <div className="field">
                <div className="q" id="ft">Tipo de criação</div>
                <div className="types" role="radiogroup" aria-labelledby="ft">
                  {TYPES.map(x => <label className="type" key={x.k}><input type="radio" name="type" value={x.k} checked={f.type === x.k} onChange={set('type')} /><b>{x.n}</b><span>{x.ex}</span></label>)}
                </div>
                <Err msg={err.ft} />
              </div>
              <div className="field"><label htmlFor="fn">Nome</label><input id="fn" type="text" value={f.name} onChange={set('name')} onKeyDown={e => e.key === 'Enter' && submit()} placeholder={ty ? ty.ph : 'Ex.: Logo, Backend, Trilha sonora'} /><Err msg={err.fn} /></div>
              <div className="field"><label htmlFor="fd">Descrição <span className="muted">(opcional)</span></label><input id="fd" type="text" value={f.desc} onChange={set('desc')} placeholder="Ex.: logo usado no app e no site" /></div>
              <div className="field"><label htmlFor="fl">Link <span className="muted">(opcional)</span></label><input id="fl" type="text" inputMode="url" value={f.link} onChange={set('link')} placeholder="Ex.: link do GitHub, Drive ou Figma" /><Err msg={err.fl} /></div>
              <div className="row start"><Btn kind={org && approved(p).length ? '' : 'pri'} onClick={submit}>{org ? 'Cadastrar criação' : 'Enviar sugestão'}</Btn>{p.assets.length > 0 && <Btn onClick={() => { setOpen(false); setErr({}); }}>Cancelar</Btn>}</div>
            </div>
          )}
    </Page>
  );
}

/* ===== Sobre o projeto (quem organiza responde) ===== */
export function Sobre() {
  const { p, org, act, err, setErr, editSobre } = useProject(), s = p.sobre || {}, edit = org && p.phase === 'coleta', setup = edit && p.setupStep !== 'resp';
  const keys = sobreKeys(s), done = !Object.keys(sobreErrors(s)).length;
  const bar = setup ? <ActionBar note={done ? 'Tudo pronto. Depois de liberar, cada pessoa responde em particular.' : 'Responda as 3 perguntas para continuar.'}><Btn kind="pri" onClick={() => act('setupassets')}>Liberar perguntas</Btn></ActionBar>
    : edit ? <ActionBar note="As respostas são salvas sozinhas." /> : null;
  return (
    <Page bar={bar}>
      <Head title="Sobre o projeto" sub={edit ? 'Três perguntas sobre o projeto como um todo. Elas ajudam a equipe a saber de onde está partindo.' : 'O que quem organiza informou sobre o projeto.'} />
      {keys.map(k => {
        const q = SOBRE[k], v = s[k] || '';
        return (
          <div className="card" key={k}>
            <h3 className="title">{q.label}</h3>
            {q.hint && <p className="muted small">{q.hint}</p>}
            {!edit ? <p>{v || <span className="muted">Não informado</span>}</p>
              : q.kind === 'text'
                ? <input type="text" value={v} onChange={e => { setErr({}); editSobre({ [k]: e.target.value }); }} placeholder={q.ph} aria-label={q.label} />
                : <div className="opts" role="radiogroup" aria-label={q.label}>{q.opts.map(o => <label className="opt" key={o}><input type="radio" name={'sobre-' + k} checked={v === o} onChange={() => { setErr({}); editSobre({ [k]: o }); }} />{o}</label>)}</div>}
            <Err msg={err['sobre:' + k]} />
          </div>
        );
      })}
    </Page>
  );
}

/* ===== Suas respostas (lista) ===== */
export function Respostas() {
  const { p, me, setUi, go } = useProject(), m = mem(p, me), as = approved(p), open = p.phase === 'coleta';
  const startAsset = a => { const an = ansOf(p, me, a.id); setUi({ qasset: a.id, qstep: an?.sent ? steps().length - 1 : an?.step || 0, flag: {} }); window.scrollTo(0, 0); };
  if (!m || m.status !== 'ativo' || !m.elig) return <Page><Head title="Perguntas" /><Banner>Você não responde desta vez: entrou depois do fim das respostas ou foi tirado delas.</Banner></Page>;
  if (!as.length) return <Page><Head title="Perguntas" sub="Responda sobre cada criação. Não existe resposta certa." /><div className="card"><h3>Aguardando as criações</h3><p className="muted">Quem organiza ainda vai cadastrar as criações. Você pode sugerir uma que ficou de fora.</p><div><Btn kind="pri" onClick={() => go('ativos')}>Ver criações</Btn></div></div></Page>;
  const done = as.filter(a => ansOf(p, me, a.id)?.sent).length, next = as.find(a => !ansOf(p, me, a.id)?.sent), left = as.length - done;
  return (
    <Page bar={open && next && <ActionBar note={done ? 'Falta' + (left > 1 ? 'm ' : ' ') + plural(left, 'criação', 'criações') + '.' : 'Comece pela primeira criação.'}><Btn kind="pri" onClick={() => startAsset(next)}>Responder sobre {next.name}</Btn></ActionBar>}>
      <Head title="Perguntas" sub="Responda sobre cada criação. Não existe resposta certa." />
      {!open && <Banner>As respostas foram encerradas. As suas ficam disponíveis para consulta, sem edição.</Banner>}
      <div>
        <div className="row"><b>{done} de {as.length} criações respondidas</b><span className="muted small">Suas respostas são salvas sozinhas</span></div>
        <div style={{ marginTop: 8 }}><Progress value={100 * done / as.length} /></div>
      </div>
      <div className="g-list">
        {as.map(a => {
          const an = ansOf(p, me, a.id), stopped = !an?.sent && an?.step;
          return (
            <div className="g-row" key={a.id}>
              <div className="g-l"><b>{a.name}</b><span>{a.cat} · {stopped ? 'parou na parte ' + (an.step + 1) + ' de 3' : qsFor(a).length + ' perguntas'}</span></div>
              <div className="g-r">{an?.sent ? <Chip k="ok">Respondido</Chip> : <Chip k="warn">A responder</Chip>}<Btn kind="sm" onClick={() => startAsset(a)}>{an?.sent ? (open ? 'Editar' : 'Ver') : stopped ? 'Continuar' : 'Responder'}</Btn></div>
            </div>
          );
        })}
      </div>
    </Page>
  );
}

/* ===== Andamento ===== */
export function Andamento() {
  const { p, org, act, go, ui, setUi, say } = useProject(), E = elig(p), as = approved(p);
  const miss = E.filter(pid => as.some(a => !ansOf(p, pid, a.id)?.sent));
  const [grp, setGrp] = useState('');
  let bar = null;
  if (org && p.phase === 'coleta' && as.length) {
    bar = ui.flag.close
      ? <ActionBar k="warn" note={miss.length ? miss.map(x => nm(p, x)).join(', ') + ' ficarão como “Sem resposta”, nunca como concordância. Depois de encerrar, ninguém edita respostas.' : 'Todas as pessoas responderam. Depois de encerrar, ninguém edita respostas.'}><Btn onClick={() => setUi({ flag: {} })}>Cancelar</Btn><Btn kind="pri" onClick={() => act('closeok')}>Encerrar agora</Btn></ActionBar>
      : <ActionBar note={miss.length ? 'Faltam respostas de ' + plural(miss.length, 'pessoa', 'pessoas') + '. Você pode encerrar mesmo assim.' : 'Todas as pessoas responderam.'}><Btn kind="pri" onClick={() => setUi({ flag: { close: true } })}>Encerrar respostas</Btn></ActionBar>;
  } else if (p.phase !== 'coleta') bar = <ActionBar><Btn kind="pri" onClick={() => go('decidir')}>Comparar respostas</Btn></ActionBar>;
  const copyGroup = async () => { const t = 'Pessoal, faltam respostas na MIP: ' + miss.map(x => nm(p, x)).join(', ') + '. Acesse ' + location.origin + '/p/' + p.id; setGrp(t); say(await copyText(t) ? 'Mensagem copiada. Cole no grupo da equipe.' : 'Selecione a mensagem abaixo e copie.'); };
  return (
    <Page bar={bar}>
      <Head title="Andamento" sub="Veja quem já respondeu. O conteúdo das respostas fica oculto até o fim." />
      {!org && p.phase === 'coleta' && <Banner>Quem organiza encerra as respostas explicitamente, mesmo quando todos já responderam.</Banner>}
      {p.phase !== 'coleta' && <Banner>Respostas encerradas. Agora é hora de decidir.</Banner>}
      <div className="card"><div className="list">
        {p.members.filter(m => m.status !== 'pendente').map(m => {
          const sent = as.filter(a => ansOf(p, m.pid, a.id)?.sent).length, isE = E.includes(m.pid);
          return <div className="li" key={m.pid}><div className="l"><b>{nm(p, m.pid)}</b><span className="muted small">{isE ? sent + ' de ' + as.length + ' criações respondidas' : m.status === 'naopart' ? 'Não responde' : 'Entrou depois das respostas'}</span></div>
            <div className="row start">{!isE ? <Chip>Não responde</Chip> : sent === as.length && as.length ? <Chip k="ok">Concluído</Chip> : sent ? <Chip k="warn">Em andamento</Chip> : <Chip>Não começou</Chip>}</div></div>;
        })}
      </div></div>
      {org && p.phase === 'coleta' && !as.length && <Banner k="warn" action={<Btn kind="sm" onClick={() => go('ativos')}>Ir para Criações</Btn>}>Cadastre ao menos uma criação antes de encerrar as respostas.</Banner>}
      {org && p.phase === 'coleta' && as.length > 0 && miss.length > 0 && (
        <div className="card">
          <h3>Lembrar quem falta</h3>
          <p className="muted">{miss.map(x => nm(p, x)).join(', ')}{miss.length > 1 ? ' ainda não terminaram.' : ' ainda não terminou.'}</p>
          <div className="row start">{miss.map(pid => <Btn kind="sm" key={pid} onClick={() => act('remind', { pid }, `/api/projects/${p.id}/remind`)}>Lembrar {nm(p, pid)}</Btn>)}<Btn kind="sm" onClick={copyGroup}>Copiar mensagem para o grupo</Btn></div>
          {grp && <div className="tok">{grp}</div>}
        </div>
      )}
    </Page>
  );
}

/* ===== Decisões (visão geral) ===== */
export function Decidir() {
  const { p, me, org, act, err, ui, setUi } = useProject(), as = approved(p), lv = lastV(p);
  if (p.phase === 'coleta') return <Page><Head title="Decisões" /><Banner>As decisões começam quando as respostas forem encerradas.</Banner></Page>;
  const edit = p.phase === 'decisao' && org;
  const ref = p.phase === 'decisao' && lv ? Object.keys(lv.conf).filter(k => lv.conf[k].v === 'no') : [];
  const done = as.filter(a => propOf(p, a.id).saved).length, left = as.filter(a => !propOf(p, a.id).saved);
  const semN = as.filter(a => propOf(p, a.id).saved && propOf(p, a.id).semAcordo), pctN = as.filter(a => propOf(p, a.id).saved && propOf(p, a.id).v.divisao === PCT_NEG);
  const startDecide = a => { setUi({ dq: a.id, dstep: propOf(p, a.id).saved ? dsteps(p, a).length - 1 : 0, dedit: null, flag: {} }); window.scrollTo(0, 0); };
  let bar = null;
  if (edit) bar = left.length
    ? <ActionBar note={done ? 'Falta' + (left.length > 1 ? 'm ' : ' ') + plural(left.length, 'criação', 'criações') + '.' : ''}><Btn kind="pri" onClick={() => startDecide(left[0])}>{propOf(p, left[0].id).ajuste ? 'Ajustar ' : 'Decidir '}{left[0].name}</Btn></ActionBar>
    : <ActionBar k={semN.length || pctN.length ? 'warn' : ''} note={semN.length ? semN.map(a => a.name).join(', ') + ' vai como sem acordo.' : pctN.length ? 'Percentuais de ' + pctN.map(a => a.name).join(', ') + ' ficam pendentes no registro do acordo.' : 'Todas as criações estão revisadas.'}><Btn kind="pri" onClick={() => act('sendv')}>Enviar proposta</Btn></ActionBar>;
  else if (p.phase === 'confirmacao' && org && ui.flag.edit) bar = <ActionBar k="warn" note={'Editar cria a proposta ' + (lv.n + 1) + ' e invalida as confirmações da proposta ' + lv.n + '.'}><Btn onClick={() => setUi({ flag: {} })}>Cancelar</Btn><Btn kind="pri" onClick={() => act('editok')}>Criar proposta {lv.n + 1}</Btn></ActionBar>;
  const shown = !edit && as.find(x => x.id === ui.dasset);
  return (
    <Page bar={bar}>
      <Head title="Decisões" sub="Mostra só os pontos em que as respostas diferem, sem dizer quem respondeu o quê." />
      {ref.length > 0 && <Banner k="bad">{ref.map(k => nm(p, k) + ' recusou a proposta ' + lv.n + ': "' + lv.conf[k].comment + '"').join(' ')}{org && ' Revise as criações com pedido de ajuste e envie a proposta ' + (lv.n + 1) + '.'}</Banner>}
      {p.phase === 'decisao' && !org && <Banner>{nm(p, p.org)} está registrando as decisões. Você pode ver os pontos e comentar; a confirmação vem depois.</Banner>}
      {(p.phase === 'confirmacao' || p.phase === 'consolidado') && <Banner action={org && p.phase === 'confirmacao' && <Btn kind="sm" onClick={() => setUi({ flag: { edit: true } })}>Editar proposta</Btn>}>{p.phase === 'consolidado' ? 'O acordo está fechado.' : 'A proposta foi enviada para confirmação. Editar cria uma nova proposta e invalida as confirmações já feitas.'}</Banner>}
      <div>
        <div className="row"><b>Criações revisadas: {done} de {as.length}</b>{semN.length > 0 && <span className="muted small">{semN.length} sem acordo</span>}</div>
        <div style={{ marginTop: 8 }}><Progress value={as.length ? 100 * done / as.length : 0} /></div>
      </div>
      <div className="g-list">
        {as.map(a => {
          const n = decPts(p, a).length, pr = propOf(p, a.id);
          const st = pr.ajuste && !pr.saved ? <Chip k="bad">Pedido de ajuste</Chip> : pr.semAcordo && pr.saved ? <Chip k="bad">Sem acordo</Chip> : pr.saved && pr.v.divisao === PCT_NEG ? <Chip k="warn">Percentuais pendentes</Chip> : pr.saved ? <Chip k="ok">Decidido</Chip> : n ? <Chip k="warn">A decidir</Chip> : <Chip>Pronto para conferir</Chip>;
          return (
            <div className="g-row" key={a.id}>
              <div className="g-l"><b>{a.name}</b><span>{a.cat} · {n ? plural(n, 'ponto com diferença', 'pontos com diferença') : 'todos concordaram'}</span>{pr.ajuste && !pr.saved && <span>{nm(p, pr.ajuste.by)}: “{pr.ajuste.comment}”</span>}</div>
              <div className="g-r">{st}{edit ? <Btn kind="sm" onClick={() => startDecide(a)}>{pr.saved || !n ? 'Revisar' : pr.ajuste ? 'Ajustar' : 'Decidir'}</Btn> : <Btn kind="sm" onClick={() => setUi({ dasset: ui.dasset === a.id ? null : a.id })}>{ui.dasset === a.id ? 'Fechar' : 'Ver'}</Btn>}</div>
            </div>
          );
        })}
      </div>
      {shown && <DecSummary a={shown} />}
      <Err msg={err.send} />
    </Page>
  );
}
function DecSummary({ a }) {
  const { p, me, act, err } = useProject(), pr = propOf(p, a.id), pts = decPts(p, a), qs = ['notas'].concat(decQs(a)), E = elig(p);
  const [t, setT] = useState('');
  const cs = p.comments.filter(c => c.aid === a.id);
  return (
    <div className="card">
      <div className="row"><h3>{a.name}</h3>{pr.semAcordo && pr.saved && <Chip k="bad">Sem acordo</Chip>}</div>
      <dl className="kv">
        {qs.map(q => <Frag key={q}><dt>{QS[q].short}</dt><dd>{q === 'notas' ? partTxt(p, partOf(p, a.id)) : pr.saved || !pts.includes(q) ? fmtAns(p, q, pr.v[q]) : 'A decidir'}</dd></Frag>)}
        {pr.externo && <><dt>Titular pretendido fora da equipe</dt><dd>{pr.externo}</dd></>}
        <dt>Percentuais acordados</dt><dd>{pctTxt(p, pr)}</dd>
      </dl>
      {pr.texto && <p><b>Explicações e pendências:</b> {pr.texto}</p>}
      {cs.length > 0 && <div className="list">{cs.map((c, i) => <div className="li small" key={c.id || i}><span><b>{nm(p, c.pid)}:</b> {c.text}</span><span className="mono muted">{fmt(c.at)}</span></div>)}</div>}
      {E.includes(me) && (p.phase === 'decisao' || p.phase === 'confirmacao') && (
        <>
          <div className="field"><label htmlFor={'cm-' + a.id}>Comentar sobre {a.name}</label><input id={'cm-' + a.id} type="text" value={t} onChange={e => setT(e.target.value)} placeholder="Escreva um comentário para a equipe" /><Err msg={err.cmt} /></div>
          <div><Btn kind="sm" onClick={async () => { if (await act('comment', { aid: a.id, text: t })) setT(''); }}>Enviar comentário</Btn></div>
        </>
      )}
    </div>
  );
}
const Frag = ({ children }) => <>{children}</>;

/* ===== Confirmação ===== */
function VerCard({ v, curr, children }) {
  const { p } = useProject(), E = elig(p), pv = curr && p.versions.find(x => x.n === v.n - 1);
  const chg = (aid, q) => {
    if (!pv) return false;
    const a = pv.snap[aid], b = v.snap[aid];
    if (!a) return true;
    if (q === 'semAcordo') return !!a.semAcordo !== !!b.semAcordo;
    if (q === 'pct') return pctTxt(p, a) !== pctTxt(p, b);
    if (q === 'externo') return (a.externo || '') !== (b.externo || '');
    return fmtAns(p, q, a.v[q]) !== fmtAns(p, q, b.v[q]);
  };
  const Mk = ({ x }) => (x ? <span className="chg">mudou</span> : null);
  const nChg = pv ? Object.keys(v.snap).reduce((t, aid) => t + (chg(aid, 'semAcordo') ? 1 : v.snap[aid].qs.filter(q => chg(aid, q)).length + (chg(aid, 'pct') ? 1 : 0) + (chg(aid, 'externo') ? 1 : 0)), 0) : 0;
  return (
    <div className="card">
      <div className="row"><h3>Proposta {v.n}</h3><div className="row start">{curr ? <Chip k="acc">Atual</Chip> : <Chip>Anterior</Chip>}<span className="mono muted">{fmt(v.at)}</span></div></div>
      {pv && <p className="muted small">{nChg ? plural(nChg, 'ponto mudou', 'pontos mudaram') + ' desde a proposta ' + pv.n + '.' : 'Nada mudou desde a proposta ' + pv.n + '.'}</p>}
      <div className="list">
        {Object.entries(v.snap).map(([aid, s]) => (
          <div className="li" key={aid}>
            <div className="l" style={{ width: '100%' }}>
              <b>{s.name} <Chip>{s.cat}</Chip></b>
              {s.semAcordo ? <span>Ainda sem acordo<Mk x={chg(aid, 'semAcordo')} /></span> : (
                <dl className="kv ver">
                  {s.part && <><dt>Participação percebida</dt><dd>{partTxt(p, s.part)}</dd></>}
                  {s.qs.map(q => <Frag key={q}><dt>{QS[q].short}</dt><dd>{fmtAns(p, q, s.v[q])}<Mk x={chg(aid, q)} /></dd></Frag>)}
                  {s.externo && <><dt>Titular pretendido fora da equipe</dt><dd>{s.externo}<Mk x={chg(aid, 'externo')} /></dd></>}
                  <dt>Percentuais acordados</dt><dd>{pctTxt(p, s)}<Mk x={chg(aid, 'pct')} /></dd>
                </dl>
              )}
              {s.texto && <span className="muted small">{s.texto}</span>}
            </div>
          </div>
        ))}
      </div>
      {!curr && <div className="list">{E.map(pid => { const c = v.conf[pid]; return <div className="li small" key={pid}><b>{nm(p, pid)}</b><span>{c ? (c.v === 'ok' ? 'Confirmou' : 'Recusou: ' + c.comment) + ' · ' + fmt(c.at) : 'Pendente'}</span></div>; })}<p className="muted small">Versão anterior, disponível apenas para consulta.</p></div>}
      {children}
    </div>
  );
}
export function Confirmacao() {
  const { p, me, org, act, err, setErr, ui, setUi, go } = useProject(), lv = lastV(p);
  const [ra, setRa] = useState([]), [why, setWhy] = useState('');
  if (!lv) return <Page><Head title="Confirmação" /><Banner>Ainda não há proposta para confirmar. Quem organiza registra as decisões primeiro.</Banner></Page>;
  const E = elig(p), c = lv.conf[me], allOk = E.every(x => lv.conf[x]?.v === 'ok'), sem = Object.values(lv.snap).filter(s => s.semAcordo).map(s => s.name);
  const can = p.phase === 'confirmacao' && E.includes(me) && !c;
  let bar = null;
  if (p.phase === 'consolidado') bar = <ActionBar><Btn kind="pri" onClick={() => go('memorial')}>Ver registro do acordo</Btn></ActionBar>;
  else if (ui.flag.edit && p.phase === 'confirmacao') bar = <ActionBar k="warn" note={'Editar cria a proposta ' + (lv.n + 1) + ' e invalida as confirmações já feitas.'}><Btn onClick={() => setUi({ flag: {} })}>Cancelar</Btn><Btn kind="pri" onClick={() => act('editok')}>Criar proposta {lv.n + 1}</Btn></ActionBar>;
  else if (can) bar = ui.flag.refusing
    ? <ActionBar><Btn onClick={() => { setUi({ flag: {} }); setRa([]); setWhy(''); setErr({}); }}>Cancelar</Btn><Btn kind="bad" onClick={() => act('refuse', { n: lv.n, assets: ra, comment: why })}>Enviar recusa</Btn></ActionBar>
    : <ActionBar>{org ? <Btn onClick={() => setUi({ flag: { edit: true } })}>Editar proposta</Btn> : <Btn onClick={() => setUi({ flag: { refusing: true } })}>Recusar</Btn>}<Btn kind="pri" onClick={() => act('conf', { n: lv.n })}>Confirmar proposta</Btn></ActionBar>;
  const side = (
    <section className="side-card">
      <div className="row"><h3>Confirmações</h3><span className="muted small">{E.filter(x => lv.conf[x]?.v === 'ok').length} de {E.length}</span></div>
      <div className="team">{E.map(pid => { const x = lv.conf[pid]; return <div className="team-row" key={pid}><span><b>{nm(p, pid)}</b>{pid === me && <span className="muted"> (você)</span>}{x?.comment && <span className="muted conf-note">{x.comment}</span>}</span><span className="team-st">{x ? (x.v === 'ok' ? <Chip k="ok">Confirmou</Chip> : <Chip k="bad">Recusou</Chip>) : <Chip>Pendente</Chip>}</span></div>; })}</div>
    </section>
  );
  return (
    <Page bar={bar} side={side}>
      <Head title="Confirmação" sub="Leia a versão atual antes de confirmar ou recusar. A decisão é individual e silêncio não conta como confirmação." />
      {p.phase === 'consolidado' && <Banner>Todas as pessoas confirmaram. O registro do acordo está disponível.</Banner>}
      {p.phase === 'confirmacao' && allOk && sem.length > 0 && <Banner k="warn" action={org && <Btn kind="sm" onClick={() => setUi({ flag: { edit: true } })}>Reabrir proposta</Btn>}>Todos confirmaram, mas {sem.join(', ')} ficou sem acordo. {org ? 'Quando a equipe decidir, reabra a proposta e registre a decisão.' : 'Quando a equipe decidir, ' + nm(p, p.org) + ' envia uma nova proposta.'}</Banner>}
      <VerCard v={lv} curr>
        {can && (
          <div className="field" style={{ borderTop: '1px solid var(--color-line)', paddingTop: 16 }}>
            <h3 className="title">{ui.flag.refusing ? 'Recusar a proposta ' + lv.n : 'Seu posicionamento'}</h3>
            {ui.flag.refusing ? (
              <>
                <div className="q" id="rfa">O que precisa mudar?</div>
                <p className="muted small">Marque as criações. Elas voltam para {nm(p, p.org)} revisar.</p>
                <div className="opts" role="group" aria-labelledby="rfa">{Object.entries(lv.snap).map(([aid, s]) => <label className="opt" key={aid}><input type="checkbox" checked={ra.includes(aid)} onChange={() => setRa(ra.includes(aid) ? ra.filter(x => x !== aid) : [...ra, aid])} />{s.name}</label>)}</div>
                <Err msg={err.refa} />
                <label htmlFor="rf" className="q">Por quê?</label>
                <textarea id="rf" value={why} onChange={e => setWhy(e.target.value)} placeholder="Ex.: Acho que a divisão do Backend deveria seguir a contribuição" autoFocus />
                <Err msg={err.refuse} />
                <p className="muted small">A equipe vê seu nome e o motivo. A proposta volta para ajuste e todos confirmam a nova versão.</p>
              </>
            ) : <p className="muted">{org ? 'Você montou esta proposta. Confirme se ela está certa, ou edite antes que todos se posicionem.' : 'Confirme se a proposta representa o que a equipe combinou. Se algo precisar mudar, recuse e diga o quê.'}</p>}
          </div>
        )}
      </VerCard>
      {p.phase === 'confirmacao' && !E.includes(me) && <Banner>Você não responde desta vez: entrou depois do fim das respostas ou foi tirado delas.</Banner>}
      {p.phase === 'confirmacao' && c && !allOk && <Banner>Sua confirmação foi registrada. Aguarde a posição das demais pessoas; ausência de resposta não significa concordância.</Banner>}
      {p.versions.length > 1 && <details className="more"><summary>Versões anteriores ({p.versions.length - 1})</summary><div className="page-main">{p.versions.slice(0, -1).reverse().map(v => <VerCard v={v} key={v.n} />)}</div></details>}
    </Page>
  );
}

/* ===== Registro do acordo ===== */
export function Memorial() {
  const { p, act, say } = useProject(), [text, setText] = useState(''), [res, setRes] = useState(null);
  /* Ver o registro libera o pedido de nota também na página do projeto. */
  const seen = !!p.memorials[0] && p.phase === 'consolidado';
  useEffect(() => { if (seen) markSeen(p.id); }, [seen, p.id]);
  if (!lastV(p)) return <Page><Head title="Registro do acordo" /><Banner>O registro do acordo fica disponível depois do envio da primeira proposta.</Banner></Page>;
  const m = p.memorials[0];
  const copy = async () => say(await copyText(memorialText(m)) ? 'Texto copiado.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.');
  const verify = async () => setRes(await post('/api/verify', { text }));
  return (
    <Page bar={m ? <ActionBar note={plural(p.memorials.length, 'cópia gerada', 'cópias geradas') + ' neste projeto.'}><Btn onClick={() => act('genmem')}>Gerar nova cópia</Btn><Btn kind="pri" onClick={copy}>Copiar texto</Btn></ActionBar> : <ActionBar><Btn kind="pri" onClick={() => act('genmem')}>Gerar registro do acordo</Btn></ActionBar>}>
      <Head title="Registro do acordo" sub="Reúne as decisões da equipe neste projeto." />
      <div className="card">
        <div className="row"><h3>{p.name}</h3>{p.phase === 'consolidado' ? <Chip k="ok">Proposta confirmada</Chip> : <Chip k="warn">Proposta em aberto</Chip>}</div>
        <p className="muted small">Registro preparatório das decisões da equipe. Não substitui contrato ou registro oficial.</p>
      </div>
      {m && <div className="paper">{memorialText(m)}</div>}
      {m && p.phase === 'consolidado' && <Satisfaction projectId={p.id} where="memorial" />}
      <details className="more">
        <summary>Verificar se um registro foi alterado</summary>
        <div className="page-main">
          <p className="muted small">Cole o texto do registro. A MIP confere o código com os registros que gerou.</p>
          <textarea value={text} onChange={e => setText(e.target.value)} style={{ minHeight: 110 }} aria-label="Texto do registro" />
          <div className="row start"><Btn kind="sm" onClick={verify}>Verificar</Btn></div>
          {res && <Banner k={res.ok ? '' : 'bad'}>{res.msg}</Banner>}
        </div>
      </details>
    </Page>
  );
}

export { SCEN };
