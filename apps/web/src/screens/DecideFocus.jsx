/* Decidir uma criação (quem organiza): um ponto por tela, na ordem das perguntas, com a contagem das respostas
   dentro de cada opção, e a revisão. Os pontos em que todos concordaram aparecem já marcados, com o aviso "Sem divergência".
   Um ponto aberto a partir da revisão volta direto para ela. */
import { useEffect, useRef } from 'react';
import { QS, SCEN, GRP, PCT_SIM, PCT_NEG, decQs, approved, elig, nm, isP, itemStatus, hasNota, lvName, partOf, partTxt, propOf, decPts, dsteps, decPick } from '@mip/domain';
import { useProject } from './Project.jsx';
import Header from '../components/Header.jsx';
import { Banner, Btn, Chip, Err, Voters } from '../components/ui.jsx';
import { usePlace } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';

export default function DecideFocus() {
  const { p, act, err, setErr, ui, setUi, editProp } = useProject();
  const as = approved(p), a = as.find(x => x.id === ui.dq), pr = propOf(p, a.id), E = elig(p), S = dsteps(p, a);
  const s = Math.min(S.length - 1, Math.max(0, ui.dstep)), fromReview = !!ui.dedit;
  const q = S[s], nq = S.length - 1, title = useRef();
  usePlace('Decisões · ' + a.name + ' · ' + (q === 'review' ? 'revisão' : QS[q].short));
  useEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [a.id, s]);

  const goStep = n => { setErr({}); setUi({ dstep: n, dedit: null }); };
  const edit = k => { setErr({}); setUi({ dstep: S.indexOf(k), dedit: true }); };
  const pick = (k, v) => { setErr({}); editProp(a.id, cur => ({ v: { [k]: isP(k) ? ((cur.v[k] || []).includes(v) ? cur.v[k].filter(x => x !== v) : [...(cur.v[k] || []), v]) : v } })); };
  const save = async () => {
    const r = await act('saveprop', { aid: a.id });
    if (!r) return;
    if (r.next) setUi({ dq: r.next, dstep: 0, dedit: null, flag: { dsaved: a.id } });
    else setUi({ dq: null, dstep: 0, dedit: null, flag: { dsaved: a.id } });
  };

  let body;
  if (q === 'review') {
    const pts = decPts(p, a), same = ['notas'].concat(decQs(a)).filter(k => !pts.includes(k));
    const row = (k, goTo) => {
      const inner = <><b>{QS[k].short}</b><span>{k === 'notas' ? partTxt(p, partOf(p, a.id)) : decPick(p, k, pr) || 'Falta decidir'}</span>{goTo && <i>Editar</i>}</>;
      return goTo ? <button className="qs-rrow" key={k} onClick={() => edit(k)}>{inner}</button> : <div className="qs-rrow" key={k}>{inner}</div>;
    };
    const holders = (pr.v.titular || []).concat(pr.externo ? ['__externo__'] : []);
    const cs = p.comments.filter(x => x.aid === a.id);
    body = (
      <>
        <div className="qs-head"><h1 className="qs-title" ref={title} tabIndex={-1}>Decisões de {a.name}</h1><p className="qs-hint">{pts.length ? 'Confira antes de salvar. Escolha um ponto para editar.' : 'Todos responderam igual. Confira e salve.'}</p></div>
        <div className="qs-review">
          {pts.length > 0 && <div className="qs-sec"><p>Pontos com respostas diferentes</p><div className="qs-list">{pts.map(k => row(k, k !== 'notas'))}</div></div>}
          {same.length > 0 && <div className="qs-sec"><p>Sem divergência: todos responderam igual</p><div className="qs-list">{same.map(k => row(k, k !== 'notas'))}</div></div>}
        </div>
        {pr.v.divisao === PCT_NEG && <p className="qs-hint">Percentuais ficam como pendência no registro do acordo. Para informar agora, escolha “Percentuais combinados” acima.</p>}
        <div className="qs-field"><label htmlFor={'ext-' + a.id} className="q">Titular pretendido fora da equipe (opcional)</label><input id={'ext-' + a.id} type="text" value={pr.externo || ''} onChange={e => editProp(a.id, { externo: e.target.value })} placeholder="Pessoa, empresa ou instituição" /></div>
        {pr.v.divisao === PCT_SIM && (
          <div className="qs-field">
            <p className="qs-sub">Percentuais acordados para a titularidade pretendida</p>
            <p className="qs-hint">A soma deve ser 100%. Estes números não são calculados pelas avaliações de contribuição.</p>
            {holders.map(pid => (
              <label className="qs-row" key={pid} htmlFor={'pct-' + pid}>
                <span style={{ flex: 1 }}>{pid === '__externo__' ? pr.externo : nm(p, pid)}</span>
                <input id={'pct-' + pid} type="number" min="0" max="100" step="0.01" style={{ width: 110 }} value={(pr.percentual || {})[pid] ?? ''} onChange={e => editProp(a.id, cur => ({ percentual: { ...(cur.percentual || {}), [pid]: e.target.value } }))} /> %
              </label>
            ))}
          </div>
        )}
        <div className="qs-field">
          <label htmlFor={'pt-' + a.id} className="q">Quer explicar alguma decisão ou registrar algo pendente? (opcional)</label>
          <p className="qs-hint">As escolhas acima já estão registradas. Escreva aqui apenas o motivo de alguma escolha ou algo que ainda precisa ser conferido, como um contrato ou uma autorização. Se não houver nada a acrescentar, deixe em branco.</p>
          <textarea id={'pt-' + a.id} value={pr.texto || ''} onChange={e => editProp(a.id, { texto: e.target.value })} placeholder="Ex.: O logo pode ir ao portfólio após autorização de Ana. Falta conferir a licença da fonte." />
        </div>
        {(pts.length > 0 || pr.semAcordo) && <label className="qs-row"><input type="checkbox" checked={!!pr.semAcordo} onChange={e => editProp(a.id, { semAcordo: e.target.checked })} /><span>A equipe ainda não chegou a um acordo sobre {a.name}</span></label>}
        <Err msg={err['p' + a.id]} />
        {cs.length > 0 && <div className="qs-sec"><p>Comentários da equipe</p>{cs.map((x, i) => <p className="qs-hint" key={x.id || i}><b>{nm(p, x.pid)}:</b> {x.text}</p>)}</div>}
      </>
    );
  } else {
    const r = itemStatus(p, a.id, q), n = r.vals.length, who = f => r.vals.filter(f).map(x => nm(p, x.pid)), same = r.status === 'conv';
    const hint = q === 'notas'
      ? (same ? 'As percepções foram parecidas. Elas não definem percentuais nem direitos.' : 'As respostas variaram. Elas mostram percepções, sem definir percentuais ou direitos.')
      : same ? (isP(q) ? 'Todos marcaram as mesmas pessoas, e elas já estão marcadas. Mude só se a equipe decidir outra coisa.' : 'Todos escolheram a mesma opção, e ela já está marcada. Mude só se a equipe decidir outra coisa.')
      : 'Passe o mouse sobre os números para ver quem ' + (isP(q) ? 'marcou cada nome' : 'escolheu cada opção') + '. Marque o que a equipe decidiu.';
    body = (
      <>
        <div className="qs-head">
          <p className="qs-step">{'Ponto ' + (s + 1) + ' de ' + nq + ' · ' + GRP(q)}</p>
          <h1 className="qs-title" ref={title} tabIndex={-1}>{QS[q].label}</h1>
          <p className="qs-status">{same ? <Chip k="ok">Sem divergência</Chip> : r.status === 'div' ? <Chip k="warn">Respostas diferentes</Chip> : <Chip>Nem todos responderam</Chip>}</p>
          <p className="qs-hint">{hint}</p>
        </div>
        {q === 'notas' ? (
          <>
            <div className="qs-list">{E.map(t => { const xs = r.vals.filter(x => hasNota(x.v, t)).map(x => +x.v[t]), lo = Math.min(...xs), hi = Math.max(...xs); return <div className="qs-row" key={t}><span>{nm(p, t)}<small className="muted" style={{ display: 'block' }}>{xs.length ? (lvName(lo) === lvName(hi) ? 'todos disseram: ' + lvName(lo).toLowerCase() : 'de ' + lvName(lo).toLowerCase() + ' a ' + lvName(hi).toLowerCase()) : 'sem respostas'}</small></span></div>; })}</div>
            <p className="qs-foot">Estas percepções não definem percentuais nem titularidade.</p>
          </>
        ) : isP(q) ? (
          <>
            <div className="qs-list" role="group">{E.map(pid => { const ws = who(x => (x.v || []).includes(pid)); return <label className="qs-row dec-row" key={pid}><input type="checkbox" checked={(pr.v[q] || []).includes(pid)} onChange={() => pick(q, pid)} /><span>{nm(p, pid)}</span><span className="dec-bar"><i style={{ width: (n ? 100 * ws.length / n : 0) + '%' }} /></span><Voters names={ws} total={n} /></label>; })}</div>
            <p className="qs-foot">Pode marcar mais de uma pessoa.</p>
            {q === 'titular' && <div className="qs-field"><label htmlFor="ext-step" className="q">Titular pretendido fora da equipe (opcional)</label><input id="ext-step" type="text" value={pr.externo || ''} onChange={e => editProp(a.id, { externo: e.target.value })} placeholder="Pessoa, empresa ou instituição" /></div>}
          </>
        ) : (
          <div className="qs-list" role="radiogroup">{QS[q].opts.map(u => { const ws = who(x => x.v === u); return <label className="qs-row dec-row" key={u}><input type="radio" name={'pv-' + q} checked={pr.v[q] === u} onChange={() => pick(q, u)} /><span>{u}</span><span className="dec-bar"><i style={{ width: (n ? 100 * ws.length / n : 0) + '%' }} /></span><Voters names={ws} total={n} /></label>; })}</div>
        )}
        {r.missing.length > 0 && <p className="qs-foot">{r.missing.length > 1 ? r.missing.length + ' pessoas não responderam.' : '1 pessoa não respondeu.'}</p>}
        {SCEN[q] && !same && <details className="dec-more"><summary>Ideias para a conversa</summary><dl className="kv">{SCEN[q].map(([t, d]) => <Pair key={t} t={t} d={d} />)}</dl></details>}
      </>
    );
  }

  const exit = () => { setUi({ dq: null, dstep: 0, dedit: null, flag: {} }); setErr({}); };
  const savedName = ui.flag.dsaved && p.assets.find(x => x.id === ui.flag.dsaved)?.name;
  return (
    <div className="qs">
      <Header />
      <header className="qs-top">
        <button className="qs-exit" onClick={exit}><Icon name="chevron-left" />Voltar às decisões</button>
        <div className="qs-ctx"><b>Decisões · {a.name}</b><span>Criação {as.indexOf(a) + 1} de {as.length}</span></div>
        <span className="qs-count">{q === 'review' ? 'Revisão' : (s + 1) + ' de ' + nq}</span>
      </header>
      <div className="qs-progress" role="progressbar" aria-label="Progresso das decisões" aria-valuemin={0} aria-valuemax={nq} aria-valuenow={s}><span style={{ width: (nq ? Math.round(100 * s / nq) : 100) + '%' }} /></div>
      <main className="qs-main">
        <div className={'qs-col' + (q === 'review' ? ' wide' : '')}>
          {pr.ajuste && !pr.saved && <Banner k="warn">{nm(p, pr.ajuste.by)} pediu ajuste: “{pr.ajuste.comment}”</Banner>}
          {savedName && s === 0 && <Banner>Decisões de {savedName} salvas. Agora, {a.name}.</Banner>}
          <div className="qs-card">
            {body}
            <div className="qs-actions">{fromReview && q !== 'review' ? <Btn kind="pri" onClick={() => goStep(nq)}>Voltar à revisão</Btn> : <>{s > 0 && <Btn onClick={() => goStep(s - 1)}>Voltar</Btn>}{q === 'review' ? <Btn kind="pri" onClick={save}>Salvar decisões de {a.name}</Btn> : <Btn kind="pri" onClick={() => goStep(s + 1)}>{s === nq - 1 ? 'Revisar' : 'Continuar'}</Btn>}</>}</div>
          </div>
          <p className="qs-private">Só quem organiza registra. A equipe confirma depois.</p>
        </div>
      </main>
    </div>
  );
}
const Pair = ({ t, d }) => <><dt>{t}</dt><dd>{d}</dd></>;
