/* Abas Equipe, Criações, Sobre o projeto e Respostas depois que o projeto foi liberado.
   Não têm quadro no Figma: usam os componentes e o visual das telas de jornada. Textos, regras e ações são os que já existiam. */
import { useState } from 'react';
import { TYPES, SOBRE, sobreKeys, ansOf, approved, fmt, mem, nm, perfilDone, qsFor, roleTxt, steps } from '@mip/domain';
import { AppButton, AuthField, Chip, RadioRow } from '../../components/ds/index.js';
import { Panel, PanelHead, TextButton } from '../../components/journey/Shell.jsx';
import { Banner, copyText } from '../../components/ui.jsx';
import { useProject } from '../Project.jsx';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const Titulo = ({ title, sub }) => <header className="jr-head"><h2 className="type-app-title">{title}</h2>{sub && <p className="jr-sub type-v2-body">{sub}</p>}</header>;
const Erro = ({ msg }) => (msg ? <p className="jr-err type-app-small" role="alert">{msg}</p> : null);
const Linha = ({ children, className = '' }) => <div className={'jr-prop-item ' + className}>{children}</div>;

/* ===== Equipe ===== */
export function Equipe() {
  const { p, org, act, err, say } = useProject();
  const [rm, setRm] = useState(null);
  const askRemove = async pid => { const r = await act('remove', { pid }, `/api/projects/${p.id}/remove`); if (r?.confirmRemove) setRm(r.confirmRemove); };
  const doRemove = async () => { const r = await act('remove', { pid: rm.pid, confirm: true }, `/api/projects/${p.id}/remove`); if (r) setRm(null); };
  const inviteUrl = p.link.code ? location.origin + '/convite/' + p.link.code : '';
  /* Mensagem pronta para o grupo: quem recebe entende o que é antes de abrir o link. */
  const inviteMsg = 'Vamos combinar na MIP quem é dono do que criamos no ' + p.name + '? Entre pelo link: ' + inviteUrl;
  const copyInvite = async (t, what) => say(await copyText(t) ? what + ' copiado. Mande no grupo da equipe.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.');
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const as = approved(p);
  const resp = m => { if (!m.elig || m.status !== 'ativo') return null; const n = as.filter(a => ansOf(p, m.pid, a.id)?.sent).length; return n && n === as.length ? <Chip tone="ok">Respondeu</Chip> : n ? <Chip tone="warn">Respondendo</Chip> : <Chip>Não começou</Chip>; };
  const memChip = m => (m.status === 'ativo' ? (m.elig ? <Chip>Participa</Chip> : <Chip tone="warn">Entrou depois das respostas</Chip>) : m.status === 'pendente' ? <Chip tone="warn">Convite pendente</Chip> : <Chip>Não responde</Chip>);
  return (
    <div className="jr-pj">
      <Titulo title="Equipe" sub="Quem participa do projeto e o que cada pessoa já respondeu." />
      <Panel>
        <PanelHead title={'Integrantes · ' + p.members.length} />
        {p.members.map(m => (
          <Linha key={m.pid} className="jr-wrapline">
            <div className="jr-person-text jr-grow"><span className="type-app-body">{nm(p, m.pid)}</span><span className="jr-muted type-app-small">{roleTxt(p, m.pid)}{m.perfil?.funcao ? ' · ' + m.perfil.funcao : ''}{p.people[m.pid]?.email ? ' · ' + p.people[m.pid].email : ''}</span></div>
            <div className="jr-state">
              {m.pid === p.org ? <Chip tone="accent">Organiza</Chip> : m.status === 'ativo' && m.elig ? <Chip>Integrante</Chip> : memChip(m)}
              {resp(m)}
              {org && m.pid !== p.org && m.status === 'ativo' && <TextButton onClick={() => act('naopart', { pid: m.pid })}>Tirar das respostas</TextButton>}
              {org && m.pid !== p.org && p.phase === 'coleta' && rm?.pid !== m.pid && <TextButton className="jr-danger" onClick={() => askRemove(m.pid)}>Remover</TextButton>}
            </div>
            {rm?.pid === m.pid && (
              <div className="jr-full"><Banner k="warn" action={<span className="jr-row jr-row--start"><AppButton kind="small" onClick={() => setRm(null)}>Cancelar</AppButton><AppButton kind="danger" onClick={doRemove}>Remover do projeto</AppButton></span>}>Remover {rm.name} do projeto?{rm.sent ? ' As respostas que ' + rm.name + ' já enviou serão apagadas.' : ''} Para voltar, será preciso adicionar de novo.</Banner></div>
            )}
            {m.status === 'naopart' && <p className="jr-full jr-muted type-app-small">Tirado das respostas por {nm(p, m.by)} em {fmt(m.at)}. Continua na lista e no registro do acordo, mas não conta como pendência.</p>}
          </Linha>
        ))}
        <Erro msg={err.np} />
      </Panel>
      {org && <p className="jr-note type-app-small">Tirar das respostas remove as respostas da pessoa da comparação, sem tirá-la do projeto. Remover tira a pessoa do projeto.</p>}
      {org && (
        <Panel>
          <PanelHead title="Link de convite" />
          {!p.link.active && <div><Chip tone="warn">Link desativado</Chip></div>}
          <p className="jr-muted type-app-small">Quem abrir o link entra no projeto como integrante.</p>
          <div className="jr-row jr-row--start jr-wraprow">
            <input className="jr-input type-app-small jr-grow" readOnly aria-label="Link de convite" value={inviteUrl} onClick={e => e.currentTarget.select()} />
            <AppButton kind="secondary" onClick={() => copyInvite(inviteUrl, 'Link')} disabled={!p.link.active}>Copiar link</AppButton>
            <AppButton kind="secondary" onClick={() => copyInvite(inviteMsg, 'Convite')} disabled={!p.link.active}>Copiar convite</AppButton>
            {canShare && <AppButton kind="secondary" onClick={() => navigator.share({ text: inviteMsg }).catch(() => {})} disabled={!p.link.active}>Compartilhar</AppButton>}
            <AppButton kind={p.link.active ? 'secondary' : 'primary'} onClick={() => act('toglink')}>{p.link.active ? 'Desativar link' : 'Ativar link'}</AppButton>
          </div>
          {!p.link.active && <p className="jr-muted type-app-small">Ninguém novo consegue entrar enquanto o link estiver desativado. Quem já entrou continua no projeto.</p>}
        </Panel>
      )}
    </div>
  );
}

/* ===== Criações ===== */
export function Criacoes() {
  const { p, org, act, err, setErr } = useProject();
  const vazio = { type: '', name: '', desc: '', link: '' };
  const [f, setF] = useState(vazio), [open, setOpen] = useState(false), [confirmDel, setConfirmDel] = useState(null), [rec, setRec] = useState({ aid: null, reason: '' });
  const ty = TYPES.find(x => x.k === f.type), coleta = p.phase === 'coleta';
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({}); };
  const submit = async () => { const r = await act(org ? 'addasset' : 'sugasset', f); if (r) { setF(vazio); setOpen(false); } };
  const del = async (aid, confirm) => { const r = await act('del', { aid, confirm }); setConfirmDel(r?.confirmDelete || null); };
  const showForm = coleta && (!p.assets.length || open || err.fn || err.ft || err.fl);
  return (
    <div className="jr-pj">
      <Titulo title="Criações" sub="O que a equipe criou e quer organizar. Integrantes sugerem, quem organiza aprova." />
      {!org && coleta && !approved(p).length && <Banner>Aguardando quem organiza cadastrar as criações. Você pode sugerir uma que considera importante.</Banner>}
      <Panel>
        <PanelHead title={'Criações do projeto · ' + p.assets.length} />
        {!p.assets.length && <p className="jr-muted type-app-small">Nenhuma criação ainda.{coleta && ' Use o formulário abaixo para ' + (org ? 'cadastrar' : 'sugerir') + ' a primeira.'}</p>}
        {p.assets.map(a => (
          <Linha key={a.id} className="jr-wrapline">
            <div className="jr-person-text jr-grow">
              <span className="type-app-body">{a.name}</span>
              <span className="jr-muted type-app-small">{a.cat}{a.st === 'sug' ? ' · sugerida por ' + nm(p, a.by) : a.st === 'rec' ? ' · recusada por ' + nm(p, p.org) : ''}{a.desc ? ' · ' + a.desc : ''}</span>
              {a.link && <a className="jr-link type-app-small" href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a>}
              {a.st === 'sug' && <span className="jr-muted type-app-small">Ainda não entra nas perguntas.</span>}
              {a.st === 'rec' && a.reason && <span className="jr-muted type-app-small">Motivo: {a.reason}</span>}
            </div>
            <div className="jr-state">
              {a.st === 'ok' && <Chip tone="ok">Aprovada</Chip>}
              {a.st === 'sug' && <Chip tone="warn">Sugerida</Chip>}
              {a.st === 'rec' && <Chip tone="bad">Recusada</Chip>}
              {org && coleta && a.st === 'sug' && rec.aid !== a.id && <><AppButton kind="small" onClick={() => act('aprov', { aid: a.id })}>Aprovar</AppButton><AppButton kind="small" onClick={() => setRec({ aid: a.id, reason: '' })}>Recusar</AppButton></>}
              {org && coleta && a.st === 'ok' && <TextButton className="jr-danger" onClick={() => del(a.id, false)}>Excluir</TextButton>}
            </div>
            {confirmDel?.aid === a.id && (
              <div className="jr-full"><Banner k="warn" action={<span className="jr-row jr-row--start"><AppButton kind="danger" onClick={() => del(a.id, true)}>Confirmar exclusão</AppButton><AppButton kind="small" onClick={() => setConfirmDel(null)}>Cancelar</AppButton></span>}>{plural(confirmDel.n, 'resposta será descartada', 'respostas serão descartadas')}. Deseja excluir “{a.name}”?</Banner></div>
            )}
            {rec.aid === a.id && (
              <div className="jr-full jr-fields">
                <AuthField label="Motivo da recusa (opcional)" value={rec.reason} onChange={e => setRec({ ...rec, reason: e.target.value })} placeholder="Ex.: já está incluída no Backend" autoFocus />
                <div className="jr-row jr-row--start"><AppButton kind="danger" onClick={async () => { await act('recusok', { aid: a.id, reason: rec.reason }); setRec({ aid: null, reason: '' }); }}>Recusar sugestão</AppButton><AppButton kind="small" onClick={() => setRec({ aid: null, reason: '' })}>Cancelar</AppButton></div>
              </div>
            )}
            {err['d' + a.id] && <div className="jr-full"><Erro msg={err['d' + a.id]} /></div>}
          </Linha>
        ))}
      </Panel>
      {!coleta ? <Banner>A lista de criações não muda mais desde que as respostas foram encerradas.</Banner>
        : !showForm ? <div><AppButton kind="secondary" onClick={() => setOpen(true)}>{org ? '+ Cadastrar outra criação' : '+ Sugerir uma criação'}</AppButton></div>
          : (
            <Panel>
              <PanelHead title={org ? 'Cadastrar criação' : 'Sugerir uma criação'} />
              <p className="jr-muted type-app-small">{org ? 'Se você organiza o projeto, ela entra aprovada. Integrantes enviam como sugestão.' : 'Quem organiza decide se ela entra nas perguntas.'}</p>
              <AuthField label="Nome da criação" value={f.name} onChange={set('name')} onKeyDown={e => e.key === 'Enter' && submit()} placeholder={ty ? ty.ph : 'Ex.: Landing page'} />
              <Erro msg={err.fn} />
              <div className="jr-qblock" role="group" aria-labelledby="ft">
                <p id="ft" className="jr-muted type-app-small">Tipo</p>
                <div className="jr-wrap">{TYPES.map(x => <button key={x.k} type="button" className={'jr-pill type-app-small' + (f.type === x.k ? ' is-on' : '')} aria-pressed={f.type === x.k} title={x.ex} onClick={() => { setF({ ...f, type: f.type === x.k ? '' : x.k }); setErr({}); }}>{x.n}</button>)}</div>
                <Erro msg={err.ft} />
              </div>
              <AuthField label="Descrição (opcional)" value={f.desc} onChange={set('desc')} placeholder="Ex.: logo usado no app e no site" />
              <AuthField label="Link (opcional)" inputMode="url" value={f.link} onChange={set('link')} placeholder="Ex.: link do GitHub, Drive ou Figma" />
              <Erro msg={err.fl} />
              <div className="jr-row jr-row--start"><AppButton onClick={submit}>{org ? 'Cadastrar criação' : 'Enviar sugestão'}</AppButton>{p.assets.length > 0 && <AppButton kind="secondary" onClick={() => { setOpen(false); setErr({}); }}>Cancelar</AppButton>}</div>
            </Panel>
          )}
    </div>
  );
}

/* ===== Sobre o projeto (quem organiza responde) ===== */
export function Sobre() {
  const { p, org, go, err, setErr, editSobre, flush } = useProject(), s = p.sobre || {}, pode = org && p.phase === 'coleta';
  const [edit, setEdit] = useState(false), [antes, setAntes] = useState(null);
  const pend = sobreKeys(s).filter(k => s[k] === 'Não sei');
  const abrir = () => { setAntes({ ...s }); setEdit(true); };
  const cancelar = () => { if (antes) editSobre(antes); setEdit(false); setErr({}); };
  const salvar = async () => { await flush(); setEdit(false); };
  const Ler = ({ k, v }) => <div className="jr-person-text"><span className="jr-muted type-app-small">{k}</span><span className="type-app-body">{v || 'Não informado'}</span></div>;
  return (
    <div className="jr-pj">
      <div><TextButton onClick={() => go('proj')}>← Resumo</TextButton></div>
      <Titulo title="Sobre o projeto" sub={edit ? 'Altere o que mudou. As respostas já enviadas continuam salvas.' : 'O que a equipe informou sobre o projeto.'} />
      {!edit && pend.length > 0 && <Banner k="warn" title={'Falta ' + plural(pend.length, 'resposta', 'respostas') + ' em Sobre o projeto'} action={pode && <AppButton kind="small" onClick={abrir}>Editar informações</AppButton>}>{pend.length === 1 ? 'A pergunta sobre ' + SOBRE[pend[0]].short.toLowerCase() + ' ainda está como “Ainda não verifiquei”.' : 'Há perguntas ainda como “Ainda não verifiquei”.'}</Banner>}
      {edit && err._ && <Banner k="bad" title="Não foi possível salvar as alterações" action={<AppButton kind="small" onClick={salvar}>Tentar de novo</AppButton>}>Suas alterações continuam na tela. Tente de novo.</Banner>}
      <Panel>
        <PanelHead title="Informações do projeto" />
        <Ler k="Nome do projeto" v={p.name} />
        {p.context && <Ler k="O que a equipe está criando" v={p.context} />}
        {sobreKeys(s).map(k => {
          const q = SOBRE[k], v = s[k] || '';
          if (!edit) return <Ler key={k} k={q.label} v={v === 'Não sei' ? 'Ainda não verifiquei' : v} />;
          return (
            <div key={k} className="jr-qblock">
              <p className="type-app-title-3" id={'sb-' + k}>{q.label}</p>
              {q.hint && <p className="jr-muted type-app-small">{q.hint}</p>}
              {q.kind === 'text'
                ? <input className="jr-input type-app-small" aria-label={q.label} value={v} onChange={e => { setErr({}); editSobre({ [k]: e.target.value }); }} placeholder={q.ph} />
                : <div className="jr-opts" role="radiogroup" aria-labelledby={'sb-' + k}>{q.opts.map(o => <RadioRow key={o} name={'sobre-' + k} label={o} checked={v === o} onChange={() => { setErr({}); editSobre({ [k]: o }); }} />)}</div>}
              <Erro msg={err['sobre:' + k]} />
            </div>
          );
        })}
        {pode && !edit && <div><AppButton kind="secondary" onClick={abrir}>Editar informações</AppButton></div>}
        {edit && <div className="jr-modal-actions"><AppButton kind="secondary" onClick={cancelar}>Cancelar</AppButton><AppButton onClick={salvar}>Salvar alterações</AppButton></div>}
      </Panel>
    </div>
  );
}

/* ===== Suas respostas (lista) ===== */
export function Respostas() {
  const { p, me, setUi, go } = useProject(), m = mem(p, me), as = approved(p), open = p.phase === 'coleta';
  const startAsset = a => { const an = ansOf(p, me, a.id); setUi({ qasset: a.id, qstep: an?.sent ? steps().length - 1 : an?.step || 0, flag: {} }); window.scrollTo(0, 0); };
  if (!m || m.status !== 'ativo' || !m.elig) return <div className="jr-pj"><Titulo title="Perguntas" /><Banner>Você não responde desta vez: entrou depois do fim das respostas ou foi tirado delas.</Banner></div>;
  if (!as.length) return <div className="jr-pj"><Titulo title="Perguntas" sub="Responda sobre cada criação. Não existe resposta certa." /><Panel><PanelHead title="Aguardando as criações" /><p className="jr-muted type-app-small">Quem organiza ainda vai cadastrar as criações. Você pode sugerir uma que ficou de fora.</p><div><AppButton onClick={() => go('ativos')}>Ver criações</AppButton></div></Panel></div>;
  const done = as.filter(a => ansOf(p, me, a.id)?.sent).length, next = as.find(a => !ansOf(p, me, a.id)?.sent);
  return (
    <div className="jr-pj">
      <Titulo title="Suas respostas" sub={(done + (perfilDone(p, me) ? 1 : 0)) + ' de ' + (as.length + 1) + ' etapas enviadas. Você pode parar e continuar depois.'} />
      {!open && <Banner>As respostas foram encerradas. As suas ficam disponíveis para consulta, sem edição.</Banner>}
      <Panel>
        <PanelHead title="Etapas" />
        <Linha>
          <div className="jr-person-text jr-grow"><span className="type-app-body">Sobre você</span><span className="jr-muted type-app-small">Uma vez por projeto</span></div>
          <div className="jr-state">{perfilDone(p, me) ? <Chip tone="ok">Enviada</Chip> : <Chip>Não começou</Chip>}<AppButton kind={perfilDone(p, me) ? 'small' : 'primary'} onClick={() => startAsset(as[0])}>{perfilDone(p, me) ? (open ? 'Editar' : 'Ver') : 'Continuar'}</AppButton></div>
        </Linha>
        {as.map(a => {
          const an = ansOf(p, me, a.id), stopped = !an?.sent && an?.step;
          return (
            <Linha key={a.id}>
              <div className="jr-person-text jr-grow"><span className="type-app-body">{a.name}</span><span className="jr-muted type-app-small">{a.cat} · {stopped ? 'parou na parte ' + (an.step + 1) + ' de 3' : qsFor(a).length + ' perguntas'}</span></div>
              <div className="jr-state">{an?.sent ? <Chip tone="ok">Enviada</Chip> : stopped ? <Chip tone="warn">Em andamento</Chip> : <Chip>Não começou</Chip>}<AppButton kind={next?.id === a.id ? 'primary' : 'small'} onClick={() => startAsset(a)}>{an?.sent ? (open ? 'Editar' : 'Ver') : 'Continuar'}</AppButton></div>
            </Linha>
          );
        })}
      </Panel>
      <p className="jr-muted type-app-small">Enquanto quem organiza não encerrar a coleta, você pode editar o que já enviou. Depois, só ver.</p>
    </div>
  );
}
