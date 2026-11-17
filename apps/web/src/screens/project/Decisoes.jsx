/* Decisões (Figma C10, C11 e C12): visão geral dos pontos a conversar, decidir um ponto e revisar a proposta antes de enviar.
   Quais pontos divergem, os votos e as regras de salvar vêm de @mip/domain e da API, como antes. */
import { useEffect, useRef, useState } from 'react';
import { QS, GRP, PCT_SIM, PCT_NEG, decQs, approved, elig, nm, isP, propOf, decPick, partOf, partTxt, pctTxt, fmtAns } from '@mip/domain';
import { AppButton, AuthField, Avatar, Chip, RadioRow } from '../../components/ds/index.js';
import { AppFrame, Panel, PanelHead, TextButton } from '../../components/journey/Shell.jsx';
import { Banner } from '../../components/ui.jsx';
import { usePlace } from '../../components/Feedback.jsx';
import { useProject } from '../Project.jsx';
import { Fases } from './Painel.jsx';
import { Confirmacao } from './Confirmacao.jsx';
import { keyOf, lista, ptsOf, votesOf } from './pontos.js';
import checkOk from '../../assets/icons/check-ok.svg';
import checkBox from '../../assets/icons/checkbox-check.svg';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const votosTxt = n => plural(n, 'voto', 'votos');

/* Dados de todas as criações: o que diverge, o que falta decidir. */
function useDados() {
  const { p } = useProject(), as = approved(p);
  const rows = as.map(a => ({ a, pr: propOf(p, a.id), pts: ptsOf(p, a) }));
  const total = as.reduce((n, a) => n + decQs(a).length, 0), div = rows.reduce((n, r) => n + r.pts.length, 0);
  const open = rows.filter(r => !r.pr.saved).flatMap(r => r.pts.map(q => ({ a: r.a, q })));
  return { rows, total, div, open, left: rows.filter(r => !r.pr.saved).map(r => r.a) };
}

const Votos = ({ a, q }) => {
  const { p } = useProject(), v = votesOf(p, a, q);
  return <div className="jr-votes">{v.list.map(g => <div key={g.key} className="jr-vote"><span className="type-app-small">{g.txt}</span><span className="jr-muted type-app-caption">{votosTxt(g.who.length)}</span></div>)}</div>;
};

/* C10 e C12 */
export function Decidir() {
  const { p, org, act, err, setUi } = useProject();
  const { rows, total, div, open, left } = useDados();
  const [todos, setTodos] = useState(false);
  if (p.phase === 'coleta') return <Banner>As decisões começam quando as respostas forem encerradas.</Banner>;
  if (p.phase === 'confirmacao' || p.phase === 'consolidado') return <Confirmacao />;
  const edit = org && p.phase === 'decisao', pronto = edit && !left.length && rows.length > 0;
  const start = (a, q) => { const pts = ptsOf(p, a), i = q ? pts.indexOf(q) : propOf(p, a.id).saved || !pts.length ? pts.length : 0; setUi({ dq: a.id, dstep: Math.max(0, i), dedit: null, flag: {} }); window.scrollTo(0, 0); };
  const semN = rows.filter(r => r.pr.saved && r.pr.semAcordo).map(r => r.a.name), pctN = rows.filter(r => r.pr.saved && r.pr.v.divisao === PCT_NEG).map(r => r.a.name);
  const agree = total - div, pct = total ? 100 * agree / total : 0;
  const fim = rows.filter(r => r.pr.saved && r.pts.length);

  return (
    <div className="jr-pj">
      <Fases />
      {p.phase === 'decisao' && !org && <Banner>{nm(p, p.org)} está registrando as decisões. Você pode ver os pontos e comentar; a confirmação vem depois.</Banner>}
      {pronto ? (
        <>
          <section className="jr-next" aria-labelledby="dec-t">
            <div className="jr-next-text">
              <p className="jr-eyebrow type-v2-eyebrow">Último passo desta fase</p>
              <h2 id="dec-t" className="type-app-title">Confira a proposta antes de enviar à equipe</h2>
              <p className="jr-sub type-v2-body">Cada pessoa vai poder confirmar ou pedir ajuste em cada ponto. Nada vira acordo até todos confirmarem.</p>
            </div>
            <div className="jr-next-actions"><AppButton onClick={() => act('sendv')}>Enviar proposta para a equipe</AppButton></div>
          </section>
          {(semN.length > 0 || pctN.length > 0) && <Banner k="warn">{semN.length ? semN.join(', ') + ' vai como sem acordo.' : 'Percentuais de ' + pctN.join(', ') + ' ficam pendentes no registro do acordo.'}</Banner>}
          {err.send && <p className="jr-err type-app-small" role="alert">{err.send}</p>}
          {fim.length > 0 && (
            <Panel>
              <PanelHead title={`Sua proposta · ${plural(div, 'ponto que divergia', 'pontos que divergiam')}`} chip={<TextButton onClick={() => start(fim[0].a, fim[0].pts[0])}>Editar</TextButton>} />
              {fim.flatMap(r => r.pts.map(q => {
                const v = votesOf(p, r.a, q), mine = r.pr.semAcordo ? null : v.list.find(g => g.key === keyOf(q, r.pr.v[q]));
                return (
                  <div key={r.a.id + q} className="jr-prop-item">
                    <div className="jr-person-text jr-grow"><span className="jr-muted type-app-small">{QS[q].short} · {r.a.name}</span><span className="type-app-title-3">{r.pr.semAcordo ? 'Sem acordo' : decPick(p, q, r.pr) || 'Falta decidir'}</span></div>
                    {mine && <Chip>{mine.who.length} de {v.n} votaram assim</Chip>}
                  </div>
                );
              }))}
            </Panel>
          )}
        </>
      ) : (
        <>
          <div className="jr-summary">
            <div className="jr-person-text">
              <h2 className="type-app-title">Boa notícia: vocês concordam em {agree} de {total} pontos</h2>
              <p className="jr-sub type-v2-body">{open.length ? `Só falta decidir ${open.length === 1 ? 'o ponto abaixo' : `os ${open.length} pontos abaixo`}. ` : ''}O restante já está de acordo e vai direto para o registro.</p>
            </div>
            <div className="jr-progress-box"><p className="type-app-small jr-sec">{agree} em acordo · {open.length} para conversar</p><div className="jr-progress jr-progress--ok" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(pct)}><span style={{ width: pct + '%' }} /></div></div>
          </div>
          {open.length > 0 && <p className="jr-eyebrow type-v2-eyebrow">Para conversar · {plural(open.length, 'ponto', 'pontos')}</p>}
          {open.map(({ a, q }) => (
            <div key={a.id + q} className="jr-point">
              <div className="jr-point-q">
                <div className="jr-row jr-row--start"><Chip tone="warn">Divergência</Chip><span className="jr-muted type-app-small">{a.name} · {GRP(q).toLowerCase()}</span></div>
                <h3 className="type-app-title-3">{QS[q].label}</h3>
              </div>
              <div className="jr-point-votes"><Votos a={a} q={q} /></div>
              <div className="jr-point-act">{edit && <><AppButton onClick={() => start(a, q)}>{propOf(p, a.id).ajuste ? 'Ajustar' : 'Decidir'}</AppButton>{!decPick(p, q, propOf(p, a.id)) && <span className="jr-muted type-app-caption">Você ainda não votou</span>}</>}</div>
            </div>
          ))}
        </>
      )}
      <EmAcordo rows={rows} agree={agree} edit={edit} start={start} forceOpen={todos || (edit && !pronto && !open.length && left.length > 0)} onToggle={() => setTodos(v => !v)} />
    </div>
  );
}

/* "N pontos já estão de acordo" + lista das criações (revisar, decidir ou ver). */
function EmAcordo({ rows, agree, edit, start, forceOpen, onToggle }) {
  const { p, ui, setUi } = useProject();
  return (
    <>
      <div className="jr-agree">
        <div className="jr-sumitem"><span className="jr-tick"><img src={checkOk} alt="" width="12" height="12" /></span><h3 className="type-app-title-3">{plural(agree, 'ponto já está', 'pontos já estão')} de acordo</h3></div>
        <TextButton onClick={onToggle} aria-expanded={forceOpen}>{forceOpen ? 'Ocultar' : 'Ver todos'}</TextButton>
      </div>
      {forceOpen && (
        <Panel>
          {rows.map(({ a, pr, pts }) => {
            const st = pr.ajuste && !pr.saved ? <Chip tone="bad">Pedido de ajuste</Chip> : pr.semAcordo && pr.saved ? <Chip tone="bad">Sem acordo</Chip> : pr.saved && pr.v.divisao === PCT_NEG ? <Chip tone="warn">Percentuais pendentes</Chip> : pr.saved ? <Chip tone="ok">Decidido</Chip> : pts.length ? <Chip tone="warn">A decidir</Chip> : <Chip>Pronto para conferir</Chip>;
            return (
              <div key={a.id} className="jr-prop-item">
                <div className="jr-person-text jr-grow"><span className="type-app-title-3">{a.name}</span><span className="jr-muted type-app-small">{a.cat} · {pts.length ? plural(pts.length, 'ponto com diferença', 'pontos com diferença') : 'todos concordaram'}</span>{pr.ajuste && !pr.saved && <span className="jr-muted type-app-small">{nm(p, pr.ajuste.by)}: “{pr.ajuste.comment}”</span>}</div>
                {st}
                {edit ? <AppButton kind="small" onClick={() => start(a)}>{pr.saved || !pts.length ? 'Revisar' : pr.ajuste ? 'Ajustar' : 'Decidir'}</AppButton> : <AppButton kind="small" onClick={() => setUi({ dasset: ui.dasset === a.id ? null : a.id })}>{ui.dasset === a.id ? 'Fechar' : 'Ver'}</AppButton>}
              </div>
            );
          })}
        </Panel>
      )}
      {!edit && ui.dasset && rows.some(r => r.a.id === ui.dasset) && <Resumo a={rows.find(r => r.a.id === ui.dasset).a} />}
    </>
  );
}

/* Decisões de uma criação (só leitura) e comentários da equipe. */
function Resumo({ a }) {
  const { p, me, act, err } = useProject(), pr = propOf(p, a.id), E = elig(p), pts = ptsOf(p, a), [t, setT] = useState('');
  const cs = p.comments.filter(c => c.aid === a.id);
  const Row = ({ k, v }) => <div className="jr-ans"><span className="jr-ans-k type-app-caption">{k}</span><span className="type-app-small jr-grow">{v}</span></div>;
  return (
    <Panel>
      <PanelHead title={a.name} chip={pr.semAcordo && pr.saved ? <Chip tone="bad">Sem acordo</Chip> : null} />
      <Row k="Participação percebida" v={partTxt(p, partOf(p, a.id))} />
      {decQs(a).map(q => <Row key={q} k={QS[q].short} v={pr.saved || !pts.includes(q) ? fmtAns(p, q, pr.v[q]) : 'A decidir'} />)}
      {pr.externo && <Row k="Titular pretendido fora da equipe" v={pr.externo} />}
      <Row k="Percentuais acordados" v={pctTxt(p, pr)} />
      {pr.texto && <p className="type-app-small"><b>Explicações e pendências:</b> {pr.texto}</p>}
      {cs.map((c, i) => <p key={c.id || i} className="jr-muted type-app-small"><b>{nm(p, c.pid)}:</b> {c.text}</p>)}
      {E.includes(me) && (p.phase === 'decisao' || p.phase === 'confirmacao') && (
        <>
          <AuthField label={'Comentar sobre ' + a.name} placeholder="Escreva um comentário para a equipe" value={t} onChange={e => setT(e.target.value)} />
          {err.cmt && <p className="jr-err type-app-small" role="alert">{err.cmt}</p>}
          <div><AppButton kind="small" onClick={async () => { if (await act('comment', { aid: a.id, text: t })) setT(''); }}>Enviar comentário</AppButton></div>
        </>
      )}
    </Panel>
  );
}

/* Pessoa marcável (várias podem ser marcadas). */
const Pessoa = ({ name, checked, onChange }) => (
  <label className={'jr-optrow' + (checked ? ' is-on' : '')}>
    <input type="checkbox" className="sr" checked={checked} onChange={onChange} />
    <span className="jr-box20" aria-hidden="true">{checked && <img src={checkBox} alt="" width="12" height="12" />}</span>
    <Avatar name={name} /><span className="type-app-body jr-grow">{name}</span>
  </label>
);

/* C11: decidir um ponto, um por tela, e a revisão da criação. */
export function Ponto() {
  const { p, act, err, setErr, ui, setUi, editProp } = useProject(), as = approved(p), a = as.find(x => x.id === ui.dq), pr = propOf(p, a.id), E = elig(p);
  const pts = ptsOf(p, a), S = [...pts, 'review'], s = Math.min(S.length - 1, Math.max(0, ui.dstep)), q = S[s];
  const [cm, setCm] = useState(''), title = useRef(null), [fora, setFora] = useState(!!pr.externo);
  const soma = Object.values(pr.percentual || {}).reduce((n, x) => n + (parseFloat(x) || 0), 0);
  usePlace('Decisões · ' + a.name + ' · ' + (q === 'review' ? 'revisão' : QS[q].short));
  useEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); setCm(''); }, [a.id, s]);

  const goStep = n => { setErr({}); setUi({ dstep: n, dedit: null }); };
  const sair = () => { setUi({ dq: null, dstep: 0, dedit: null, flag: {} }); setErr({}); };
  const pick = (k, v) => { setErr({}); editProp(a.id, cur => ({ v: { [k]: isP(k) ? ((cur.v[k] || []).includes(v) ? cur.v[k].filter(x => x !== v) : [...(cur.v[k] || []), v]) : v } })); };
  const proximo = async () => {
    if (cm.trim()) { const r = await act('comment', { aid: a.id, text: cm }); if (!r) return; }
    goStep(s + 1);
  };
  const save = async () => {
    const r = await act('saveprop', { aid: a.id });
    if (!r) return;
    setUi({ dq: r.next || null, dstep: 0, dedit: null, flag: { dsaved: a.id } });
  };

  const items = as.flatMap(x => (!propOf(p, x.id).saved || x.id === a.id ? ptsOf(p, x).map(k => ({ a: x, q: k })) : []));
  const savedName = ui.flag.dsaved && p.assets.find(x => x.id === ui.flag.dsaved)?.name;
  let eyebrow, titulo, sub, body, bar, pos = 0;
  if (q === 'review') {
    const same = decQs(a).filter(k => !pts.includes(k)), holders = (pr.v.titular || []).concat(pr.externo ? ['__externo__'] : []), cs = p.comments.filter(x => x.aid === a.id);
    const Row = ({ k, v, to }) => <div className="jr-ans"><span className="jr-ans-k type-app-caption">{k}</span><span className="type-app-small jr-grow">{v}</span>{to != null && <TextButton onClick={() => goStep(to)}>Editar</TextButton>}</div>;
    eyebrow = 'Decisões · ' + a.name; titulo = 'Decisões de ' + a.name;
    sub = `Confira o que a equipe combinou para ${a.name}. Você pode ajustar antes de enviar a proposta.`;
    body = (
      <div className="jr-fields jr-fields--xl">
        {pts.length > 0 && <Panel><PanelHead title="Pontos com respostas diferentes" />{pts.map((k, i) => <Row key={k} k={QS[k].short} v={decPick(p, k, pr) || 'Falta decidir'} to={i} />)}</Panel>}
        <Panel>
          <PanelHead title="Sem divergência: todos responderam igual" />
          <Row k="Participação percebida" v={partTxt(p, partOf(p, a.id))} />
          {same.map(k => <Row key={k} k={QS[k].short} v={decPick(p, k, pr) || 'Falta decidir'} />)}
        </Panel>
        {pr.v.divisao === PCT_NEG && <p className="jr-muted type-app-small">Percentuais ficam como pendência no registro do acordo. Para informar agora, escolha “Percentuais combinados” acima.</p>}
        <Panel>
          <PanelHead title="Titular fora da equipe" />
          <p className="jr-muted type-app-small">Alguém de fora também aparece como dono de {a.name}?</p>
          <div className="jr-opts" role="radiogroup" aria-label="Titular fora da equipe">
            <RadioRow name={'ext-' + a.id} label="Só pessoas da equipe" checked={!fora} onChange={() => { setFora(false); editProp(a.id, { externo: '' }); }} />
            <RadioRow name={'ext-' + a.id} label="Há titular fora da equipe (ex.: universidade, empresa)" checked={fora} onChange={() => setFora(true)} />
          </div>
          {fora && <AuthField label="Quem é o titular de fora?" placeholder="Nome da pessoa ou instituição" value={pr.externo || ''} onChange={e => editProp(a.id, { externo: e.target.value })} />}
        </Panel>
        {pr.v.divisao === PCT_SIM && (
          <Panel>
            <PanelHead title="Percentuais combinados" />
            <p className="jr-muted type-app-small">A soma precisa dar 100%.</p>
            {holders.map(pid => (
              <div key={pid} className="jr-row">
                <span className="jr-row jr-row--start"><Avatar name={pid === '__externo__' ? pr.externo : nm(p, pid)} /><span className="type-app-body">{pid === '__externo__' ? pr.externo : nm(p, pid)}</span></span>
                <label className="jr-pct"><span className="sr">Percentual de {pid === '__externo__' ? pr.externo : nm(p, pid)}</span><input className="jr-input type-app-small" type="number" min="0" max="100" step="0.01" value={(pr.percentual || {})[pid] ?? ''} onChange={e => editProp(a.id, cur => ({ percentual: { ...(cur.percentual || {}), [pid]: e.target.value } }))} /> %</label>
              </div>
            ))}
            <div className="jr-row"><span className="jr-muted type-app-small">Total</span><Chip tone={Math.abs(soma - 100) < 0.01 ? 'ok' : 'warn'}>{Math.abs(soma - 100) < 0.01 ? 'Soma 100%' : 'Soma ' + String(+soma.toFixed(2)).replace('.', ',') + '%' + (soma < 100 ? ' · faltam ' + String(+(100 - soma).toFixed(2)).replace('.', ',') + '%' : ' · passou ' + String(+(soma - 100).toFixed(2)).replace('.', ',') + '%')}</Chip></div>
          </Panel>
        )}
        <div className="jr-qblock">
          <label className="type-app-title-3" htmlFor={'pt-' + a.id}>Explique ou registre algo pendente</label>
          <p className="jr-muted type-app-small">Ex.: combinamos conversar sobre a parte do Bruno depois do lançamento.</p>
          <textarea id={'pt-' + a.id} className="jr-area type-app-small" value={pr.texto || ''} onChange={e => editProp(a.id, { texto: e.target.value })} placeholder="Opcional. Fica no registro do acordo." />
        </div>
        {(pts.length > 0 || pr.semAcordo) && <p className="type-app-title-3">Se ainda não houver acordo</p>}
        {(pts.length > 0 || pr.semAcordo) && (
          <label className={'jr-optrow' + (pr.semAcordo ? ' is-on' : '')}>
            <input type="checkbox" className="sr" checked={!!pr.semAcordo} onChange={e => editProp(a.id, { semAcordo: e.target.checked })} />
            <span className="jr-box20" aria-hidden="true">{pr.semAcordo && <img src={checkBox} alt="" width="12" height="12" />}</span>
            <span className="type-app-body jr-grow">A equipe ainda não chegou a um acordo sobre {a.name}</span>
          </label>
        )}
        {err['p' + a.id] && <p className="jr-err type-app-small" role="alert">{err['p' + a.id]}</p>}
        {cs.length > 0 && <Panel><PanelHead title="Comentários da equipe" />{cs.map((x, i) => <p key={x.id || i} className="jr-muted type-app-small"><b>{nm(p, x.pid)}:</b> {x.text}</p>)}</Panel>}
      </div>
    );
    bar = <div className="jr-bar"><div className="jr-bar-left">{s > 0 && <AppButton kind="secondary" onClick={() => goStep(s - 1)}>Voltar</AppButton>}</div><div className="jr-bar-right"><AppButton onClick={save}>Salvar decisões de {a.name}</AppButton></div></div>;
  } else {
    const v = votesOf(p, a, q), top = v.list[0]?.who.length || 0;
    pos = items.findIndex(it => it.a.id === a.id && it.q === q) + 1;
    eyebrow = `${a.name} · ${GRP(q).toLowerCase()} · ponto ${pos} de ${items.length}`; titulo = QS[q].label;
    sub = 'As respostas são anônimas até aqui. Veja o que a equipe pensa e proponha o que fica registrado.';
    body = (
      <div className="jr-fields jr-fields--xl">
        <Panel>
          <p className="jr-eyebrow type-v2-eyebrow">Como a equipe respondeu</p>
          {v.list.map(g => (
            <div key={g.key} className="jr-vrow">
              <div className="jr-row"><span className="type-app-body">{g.txt}</span><span className="jr-row jr-row--start"><span className="jr-muted type-app-caption">{lista(g.who)}</span><span className="type-app-small jr-sec">{votosTxt(g.who.length)}</span></span></div>
              <div className="jr-progress jr-progress--thin"><span className={g.who.length === top ? '' : 'is-dim'} style={{ width: (v.n ? Math.max(100 * g.who.length / v.n, 0.4) : 0) + '%' }} /></div>
            </div>
          ))}
          {v.missing > 0 && <p className="jr-muted type-app-small">{v.missing > 1 ? v.missing + ' pessoas não responderam.' : '1 pessoa não respondeu.'}</p>}
        </Panel>
        <div className="jr-qblock" role={isP(q) ? 'group' : 'radiogroup'} aria-labelledby="sp-t">
          <p id="sp-t" className="type-app-title-3">Sua proposta para o registro</p>
          <p className="jr-muted type-app-small">Você pode mudar sua escolha até enviar a proposta.</p>
          <div className="jr-opts">
            {isP(q) ? E.map(pid => <Pessoa key={pid} name={nm(p, pid)} checked={(pr.v[q] || []).includes(pid)} onChange={() => pick(q, pid)} />) : QS[q].opts.map(u => <RadioRow key={u} name={'pv-' + a.id + q} label={u} checked={pr.v[q] === u} onChange={() => pick(q, u)} />)}
          </div>
        </div>
        {q === 'titular' && <AuthField label="Titular pretendido fora da equipe (opcional)" placeholder="Pessoa, empresa ou instituição" value={pr.externo || ''} onChange={e => editProp(a.id, { externo: e.target.value })} />}
        <AuthField label="Comentário para a equipe (opcional)" placeholder="Ex.: acho justo porque o dono já contribuiu mais" value={cm} onChange={e => setCm(e.target.value)} />
        {err.cmt && <p className="jr-err type-app-small" role="alert">{err.cmt}</p>}
      </div>
    );
    bar = <div className="jr-bar"><span className="jr-muted type-app-small">Ponto {pos} de {items.length}</span><AppButton onClick={proximo}>Salvar e ir para o próximo</AppButton></div>;
  }

  return (
    <AppFrame>
      <main className="jr-body jr-body--d">
        <aside className="jr-rail jr-rail--q" aria-label="Pontos para conversar">
          <div><AppButton kind="small" onClick={sair}>← Decisões</AppButton></div>
          <p className="jr-eyebrow type-v2-eyebrow">Para conversar</p>
          <ol className="jr-qitems">
            {items.map(it => {
              const now = it.a.id === a.id && it.q === q, go = () => { const ps = ptsOf(p, it.a); setErr({}); setUi({ dq: it.a.id, dstep: ps.indexOf(it.q), dedit: null, flag: {} }); };
              return <li key={it.a.id + it.q}><button type="button" className={'jr-qitem jr-qitem--btn' + (now ? ' is-now' : '')} aria-current={now ? 'step' : undefined} onClick={go}><span className="jr-person-text"><span className={now ? 'type-app-title-3' : 'type-app-body'}>{QS[it.q].short}</span><span className="jr-muted type-app-small">{it.a.name}</span></span></button></li>;
            })}
            <li><span className={'jr-qitem' + (q === 'review' ? ' is-now' : '')}><span className="jr-person-text"><span className={q === 'review' ? 'type-app-title-3' : 'type-app-body'}>Decisões de {a.name}</span><span className="jr-muted type-app-small">Revisão</span></span></span></li>
          </ol>
        </aside>
        <div className="jr-main jr-main--d">
          {pr.ajuste && !pr.saved && <Banner k="warn" title={nm(p, pr.ajuste.by).split(' ')[0] + ' pediu ajuste neste ponto'}>“{pr.ajuste.comment}”</Banner>}
          {savedName && s === 0 && <Banner>Decisões de {savedName} salvas. Agora, {a.name}.</Banner>}
          <header className="jr-head">
            <p className="jr-eyebrow type-v2-eyebrow">{eyebrow}</p>
            <h1 ref={title} tabIndex={-1} className="jr-title jr-title--q type-app-title">{titulo}</h1>
            <p className="jr-sub type-v2-body">{sub}</p>
          </header>
          {body}
          {bar}
          <p className="jr-muted type-app-small">Só quem organiza registra. A equipe confirma depois.</p>
        </div>
      </main>
    </AppFrame>
  );
}
