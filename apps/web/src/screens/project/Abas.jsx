/* Abas Equipe, Criações, Sobre o projeto e Respostas depois que o projeto foi liberado.
   Não têm quadro no Figma: usam os componentes e o visual das telas de jornada. Textos, regras e ações são os que já existiam. */
import { useState } from 'react';
import { TYPES, SOBRE, sobreKeys, ansOf, approved, elig, fmt, mem, nm, qsFor, roleTxt, steps } from '@mip/domain';
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
  const memChip = m => (m.status === 'ativo' ? (m.elig ? <Chip>Participa</Chip> : <Chip tone="warn">Entrou depois das respostas</Chip>) : m.status === 'pendente' ? <Chip tone="warn">Convite pendente</Chip> : <Chip>Não responde</Chip>);
  return (
    <div className="jr-pj">
      <Titulo title="Equipe" sub="Quem participou do projeto." />
      <Panel>
        <PanelHead title="Integrantes" chip={<Chip tone="accent">{plural(elig(p).length, 'participa', 'participam')}</Chip>} />
        {p.members.map(m => (
          <Linha key={m.pid} className="jr-wrapline">
            <div className="jr-person-text jr-grow"><span className="type-app-body">{nm(p, m.pid)}</span><span className="jr-muted type-app-small">{roleTxt(p, m.pid)}{m.perfil?.funcao ? ' · ' + m.perfil.funcao : ''}{p.people[m.pid]?.email ? ' · ' + p.people[m.pid].email : ''}</span></div>
            <div className="jr-state">
              {memChip(m)}
              {org && m.pid !== p.org && m.status === 'ativo' && <TextButton onClick={() => act('naopart', { pid: m.pid })}>Tirar das respostas</TextButton>}
              {org && m.pid !== p.org && p.phase === 'coleta' && rm?.pid !== m.pid && <AppButton kind="danger" onClick={() => askRemove(m.pid)}>Remover</AppButton>}
            </div>
            {rm?.pid === m.pid && (
              <div className="jr-full"><Banner k="warn" action={<span className="jr-row jr-row--start"><AppButton kind="small" onClick={() => setRm(null)}>Cancelar</AppButton><AppButton kind="danger" onClick={doRemove}>Remover do projeto</AppButton></span>}>Remover {rm.name} do projeto?{rm.sent ? ' As respostas que ' + rm.name + ' já enviou serão apagadas.' : ''} Para voltar, será preciso adicionar de novo.</Banner></div>
            )}
            {m.status === 'naopart' && <p className="jr-full jr-muted type-app-small">Tirado das respostas por {nm(p, m.by)} em {fmt(m.at)}. Continua na lista e no registro do acordo, mas não conta como pendência.</p>}
          </Linha>
        ))}
        <Erro msg={err.np} />
      </Panel>
      {org && (
        <Panel>
          <PanelHead title="Adicionar pessoas" chip={<Chip tone={p.link.active ? 'ok' : 'neutral'}>{p.link.active ? 'Link ativo' : 'Link desativado'}</Chip>} />
          <p className="jr-muted type-app-small">Mande esta mensagem no grupo da equipe. Quem abrir o link entra no projeto.</p>
          <p className="jr-code type-app-small" onClick={e => window.getSelection()?.selectAllChildren(e.currentTarget)}>{inviteMsg}</p>
          <div className="jr-row jr-row--start jr-wraprow">
            <AppButton onClick={() => copyInvite(inviteMsg, 'Convite')} disabled={!p.link.active}>Copiar convite</AppButton>
            {canShare && <AppButton kind="secondary" onClick={() => navigator.share({ text: inviteMsg }).catch(() => {})} disabled={!p.link.active}>Compartilhar</AppButton>}
            <AppButton kind="secondary" onClick={() => act('toglink')}>{p.link.active ? 'Desativar link' : 'Ativar link'}</AppButton>
            {p.link.active && <TextButton onClick={() => copyInvite(inviteUrl, 'Link')}>Copiar só o link</TextButton>}
          </div>
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
      <Titulo title="Criações" sub="O que a equipe fez junto." />
      {!org && coleta && !approved(p).length && <Banner>Aguardando quem organiza cadastrar as criações. Você pode sugerir uma que considera importante.</Banner>}
      <Panel>
        <PanelHead title="Cadastradas" chip={<Chip tone="accent">{approved(p).length}</Chip>} />
        {!p.assets.length && <p className="jr-muted type-app-small">Nenhuma criação ainda.{coleta && ' Use o formulário abaixo para ' + (org ? 'cadastrar' : 'sugerir') + ' a primeira.'}</p>}
        {p.assets.map(a => (
          <Linha key={a.id} className="jr-wrapline">
            <div className="jr-person-text jr-grow">
              <span className="jr-row jr-row--start"><span className="type-app-title-3">{a.name}</span><Chip>{a.cat}</Chip></span>
              <span className="jr-muted type-app-small">{a.desc || 'Sem descrição'}</span>
              {a.link && <a className="jr-link type-app-small" href={a.link} target="_blank" rel="noopener noreferrer">{a.link}</a>}
              {a.st === 'sug' && <span className="type-app-small">Sugerida por {nm(p, a.by)}. Ainda não entra nas perguntas.</span>}
              {a.st === 'rec' && <span className="type-app-small">Recusada por {nm(p, p.org)}. Motivo: {a.reason}</span>}
            </div>
            <div className="jr-state">
              {a.st === 'sug' && <Chip tone="warn">Sugerida por {nm(p, a.by)}</Chip>}
              {a.st === 'rec' && <Chip tone="bad">Recusada</Chip>}
              {org && coleta && a.st === 'sug' && rec.aid !== a.id && <><AppButton kind="small" onClick={() => act('aprov', { aid: a.id })}>Aprovar</AppButton><AppButton kind="small" onClick={() => setRec({ aid: a.id, reason: '' })}>Recusar</AppButton></>}
              {org && coleta && a.st === 'ok' && <AppButton kind="danger" onClick={() => del(a.id, false)}>Excluir</AppButton>}
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
              <PanelHead title={org ? 'Cadastrar criação' : 'Sugerir uma criação que ficou de fora'} />
              <div className="jr-qblock" role="radiogroup" aria-labelledby="ft">
                <p id="ft" className="type-app-title-3">Tipo de criação</p>
                <div className="jr-opts">{TYPES.map(x => <RadioRow key={x.k} name="type" value={x.k} checked={f.type === x.k} onChange={set('type')} label={<><b>{x.n}</b> <span className="jr-muted">{x.ex}</span></>} />)}</div>
                <Erro msg={err.ft} />
              </div>
              <AuthField label="Nome" value={f.name} onChange={set('name')} onKeyDown={e => e.key === 'Enter' && submit()} placeholder={ty ? ty.ph : 'Ex.: Logo, Backend, Trilha sonora'} />
              <Erro msg={err.fn} />
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
  const { p, org, err, setErr, editSobre } = useProject(), s = p.sobre || {}, edit = org && p.phase === 'coleta';
  return (
    <div className="jr-pj">
      <Titulo title="Sobre o projeto" sub={edit ? 'Três perguntas sobre o projeto como um todo. Elas ajudam a equipe a saber de onde está partindo.' : 'O que quem organiza informou sobre o projeto.'} />
      {sobreKeys(s).map(k => {
        const q = SOBRE[k], v = s[k] || '';
        return (
          <Panel key={k}>
            <h3 className="type-app-title-3" id={'sb-' + k}>{q.label}</h3>
            {q.hint && <p className="jr-muted type-app-small">{q.hint}</p>}
            {!edit ? <p className="type-app-small">{v || <span className="jr-muted">Não informado</span>}</p>
              : q.kind === 'text'
                ? <input className="jr-input type-app-small" aria-label={q.label} value={v} onChange={e => { setErr({}); editSobre({ [k]: e.target.value }); }} placeholder={q.ph} />
                : <div className="jr-opts" role="radiogroup" aria-labelledby={'sb-' + k}>{q.opts.map(o => <RadioRow key={o} name={'sobre-' + k} label={o} checked={v === o} onChange={() => { setErr({}); editSobre({ [k]: o }); }} />)}</div>}
            <Erro msg={err['sobre:' + k]} />
          </Panel>
        );
      })}
      {edit && <p className="jr-muted type-app-small">As respostas são salvas sozinhas.</p>}
    </div>
  );
}

/* ===== Suas respostas (lista) ===== */
export function Respostas() {
  const { p, me, setUi, go } = useProject(), m = mem(p, me), as = approved(p), open = p.phase === 'coleta';
  const startAsset = a => { const an = ansOf(p, me, a.id); setUi({ qasset: a.id, qstep: an?.sent ? steps().length - 1 : an?.step || 0, flag: {} }); window.scrollTo(0, 0); };
  if (!m || m.status !== 'ativo' || !m.elig) return <div className="jr-pj"><Titulo title="Perguntas" /><Banner>Você não responde desta vez: entrou depois do fim das respostas ou foi tirado delas.</Banner></div>;
  if (!as.length) return <div className="jr-pj"><Titulo title="Perguntas" sub="Responda sobre cada criação. Não existe resposta certa." /><Panel><PanelHead title="Aguardando as criações" /><p className="jr-muted type-app-small">Quem organiza ainda vai cadastrar as criações. Você pode sugerir uma que ficou de fora.</p><div><AppButton onClick={() => go('ativos')}>Ver criações</AppButton></div></Panel></div>;
  const done = as.filter(a => ansOf(p, me, a.id)?.sent).length, next = as.find(a => !ansOf(p, me, a.id)?.sent), left = as.length - done;
  return (
    <div className="jr-pj">
      <Titulo title="Perguntas" sub="Responda sobre cada criação. Não existe resposta certa." />
      {!open && <Banner>As respostas foram encerradas. As suas ficam disponíveis para consulta, sem edição.</Banner>}
      <div className="jr-progress-box jr-progress-box--full">
        <div className="jr-row"><span className="type-app-title-3">{done} de {as.length} criações respondidas</span><span className="jr-muted type-app-small">Suas respostas são salvas sozinhas</span></div>
        <div className="jr-progress" role="progressbar" aria-valuemin="0" aria-valuemax={as.length} aria-valuenow={done}><span style={{ width: (100 * done / as.length) + '%' }} /></div>
      </div>
      <Panel>
        {as.map(a => {
          const an = ansOf(p, me, a.id), stopped = !an?.sent && an?.step;
          return (
            <Linha key={a.id}>
              <div className="jr-person-text jr-grow"><span className="type-app-title-3">{a.name}</span><span className="jr-muted type-app-small">{a.cat} · {stopped ? 'parou na parte ' + (an.step + 1) + ' de 3' : qsFor(a).length + ' perguntas'}</span></div>
              <div className="jr-state">{an?.sent ? <Chip tone="ok">Respondido</Chip> : <Chip tone="warn">A responder</Chip>}<AppButton kind="small" onClick={() => startAsset(a)}>{an?.sent ? (open ? 'Editar' : 'Ver') : stopped ? 'Continuar' : 'Responder'}</AppButton></div>
            </Linha>
          );
        })}
      </Panel>
      {open && next && <div className="jr-bar"><span className="jr-muted type-app-small">{done ? 'Falta' + (left > 1 ? 'm ' : ' ') + plural(left, 'criação', 'criações') + '.' : 'Comece pela primeira criação.'}</span><AppButton onClick={() => startAsset(next)}>Responder sobre {next.name}</AppButton></div>}
    </div>
  );
}
