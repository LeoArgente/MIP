/* Responder uma criação: 3 telas (Contribuição e origem, Titularidade pretendida, Uso e condições) e a revisão. */
import { useEffect, useRef } from 'react';
import { PERFIL, perfilDone, mem, QS, GROUPS, GNAME, LV, approved, elig, nm, ansOf, isP, qsFor, hasNota, lvOf, notasOf, fmtAns, steps, stepOf, stepErrors } from '@mip/domain';
import { useProject } from './Project.jsx';
import Header from '../components/Header.jsx';
import { Banner, Btn, Err } from '../components/ui.jsx';
import { usePlace } from '../components/Feedback.jsx';

/* Sobre você: uma vez por projeto, antes da primeira pergunta. */
function Perfil() {
  const { p, me, act, err, setErr, setUi, editPerfil } = useProject(), f = mem(p, me).perfil || {}, title = useRef();
  useEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  const exit = () => { setUi({ qasset: null, qstep: 0, flag: {} }); setErr({}); };
  return (
    <div className="qs">
      <Header />
      <header className="qs-top"><button className="qs-exit" onClick={exit}>‹ Voltar ao projeto</button><div className="qs-ctx"><b>Sobre você</b><span>{p.name}</span></div><span className="qs-count">Antes de começar</span></header>
      <div className="qs-progress"><span style={{ width: '0%' }} /></div>
      <main className="qs-main"><div className="qs-col">
        <div className="qs-card">
          <div className="qs-head"><p className="qs-step">Uma vez por projeto</p><h1 className="qs-title" ref={title} tabIndex={-1}>Antes de começar, conte sobre você</h1><p className="qs-hint">Ninguém vê o que você responder aqui agora. A equipe só vê quando a etapa de perguntas terminar.</p></div>
          <div className="qs-q">
            <label className="qs-sub" htmlFor="pf-funcao">{PERFIL.funcao.label}</label>
            <input id="pf-funcao" type="text" value={f.funcao || ''} onChange={e => { setErr({}); editPerfil({ funcao: e.target.value }); }} placeholder={PERFIL.funcao.ph} autoFocus />
            <Err msg={err['perfil:funcao']} />
          </div>
          <div className="qs-q">
            <p className="qs-sub" id="pf-investiu">{PERFIL.investiu.label}</p>
            <p className="qs-hint" id="pf-investiu-h">{PERFIL.investiu.hint}</p>
            <div className="qs-list" role="radiogroup" aria-labelledby="pf-investiu" aria-describedby="pf-investiu-h">{PERFIL.investiu.opts.map(o => <label className="qs-row" key={o}><input type="radio" name="pf-investiu" checked={f.investiu === o} onChange={() => { setErr({}); editPerfil({ investiu: o }); }} /><span>{o}</span></label>)}</div>
            <Err msg={err['perfil:investiu']} />
          </div>
          <div className="qs-actions"><Btn kind="pri" onClick={() => act('perfil', { perfil: f, check: true })}>Continuar</Btn></div>
        </div>
        <p className="qs-private">Salvo automaticamente.</p>
      </div></main>
    </div>
  );
}

export default function Question() {
  const { p: pp, me: mm } = useProject();
  if (pp.phase === 'coleta' && !perfilDone(pp, mm)) return <Perfil />;
  return <Questions />;
}

function Questions() {
  const { p, me, act, err, setErr, ui, setUi, editDraft, say, go } = useProject();
  const as = approved(p), open = p.phase === 'coleta', a = as.find(x => x.id === ui.qasset);
  const an = ansOf(p, me, a.id) || { draft: {}, sent: null }, d = an.draft || {}, S = steps(), s = Math.min(S.length - 1, Math.max(0, ui.qstep)), g = S[s], nq = S.length - 1;
  const E = elig(p), qs = qsFor(a), dis = !open, title = useRef();
  usePlace('Perguntas · ' + a.name + ' · ' + (g === 'review' ? 'revisão' : GNAME[g] || 'parte ' + (s + 1)));

  /* Guarda a tela em que a pessoa está, para "Continuar" depois. */
  useEffect(() => { if (open && !an.sent && an.step !== s) editDraft(a.id, null, s); title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [a.id, s]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAns = (q, v) => { setErr({}); editDraft(a.id, isP(q) ? dr => { const cur = dr[q] || []; return { [q]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }; } : { [q]: v }); };
  const setText = k => e => editDraft(a.id, { [k]: e.target.value });
  const goStep = n => setUi({ qstep: n });
  const next = () => {
    if (open) { const e = stepErrors(p, me, a, d, g); if (Object.keys(e).length) { setErr(e); say('Falta responder nesta tela.', 'bad'); return; } }
    goStep(Math.min(nq, s + 1));
  };
  const send = async () => {
    const r = await act('qsend', { aid: a.id });
    if (!r) return;
    const remaining = approved(p).find(x => x.id !== a.id && !ansOf(p, me, x.id)?.sent);
    if (remaining) setUi({ qasset: remaining.id, qstep: ansOf(p, me, remaining.id)?.step || 0, flag: { qsent: a.id } });
    else { setUi({ qasset: null, qstep: 0, flag: {} }); say('Pronto! Suas respostas foram enviadas. Quem organiza encerra a coleta explicitamente.'); go('proj'); }
  };
  /* Envio com erro: leva até a tela com a primeira pergunta pendente. */
  useEffect(() => {
    const keys = Object.keys(err).filter(k => k.startsWith(a.id + ':'));
    if (!keys.length || g !== 'review') return;
    const gi = S.findIndex(x => (GROUPS[x] || []).some(q => err[a.id + ':' + q]) || (x === 'contrib' && err[a.id + ':link']));
    if (gi >= 0) { goStep(gi); say('Falta uma resposta. Levamos você até ela.', 'bad'); }
  }, [err]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Pergunta de escolha: enunciado, dica e o grupo de opções ligado a eles por aria-labelledby/describedby. */
  const block = q => { const id = 'q-' + a.id + '-' + q; return (
    <div className="qs-q" key={q}>
      <p className="qs-sub" id={id}>{QS[q].label}</p>
      {QS[q].hint && <p className="qs-hint" id={id + '-h'}>{QS[q].hint}</p>}
      <div className="qs-list" role={isP(q) ? 'group' : 'radiogroup'} aria-labelledby={id} aria-describedby={QS[q].hint ? id + '-h' : undefined}>
        {isP(q)
          ? E.map(pid => <label className={'qs-row' + (dis ? ' dis' : '')} key={pid}><input type="checkbox" checked={(d[q] || []).includes(pid)} disabled={dis} onChange={() => setAns(q, pid)} /><span>{nm(p, pid)}{pid === me && ' (você)'}</span></label>)
          : QS[q].opts.map(u => <label className={'qs-row' + (dis ? ' dis' : '')} key={u}><input type="radio" name={'q-' + a.id + '-' + q} checked={d[q] === u} disabled={dis} onChange={() => setAns(q, u)} /><span>{u}</span></label>)}
      </div>
      {isP(q) && <p className="qs-foot">Pode marcar mais de uma pessoa.</p>}
      <Err msg={err[a.id + ':' + q]} />
    </div>
  ); };
  /* Atalho: repetir as respostas que a pessoa já enviou em outra criação. */
  const copyFrom = gk => {
    if (!open) return null;
    const src = as.filter(x => x.id !== a.id).map(x => ({ x, v: ansOf(p, me, x.id)?.sent })).filter(o => o.v && GROUPS[gk].some(q => qs.includes(q) && o.v[q] !== undefined && (isP(q) ? (o.v[q] || []).length : o.v[q])));
    if (!src.length) return null;
    const o = src[src.length - 1];
    const copy = () => { const ch = {}; GROUPS[gk].filter(q => qs.includes(q) && o.v[q] !== undefined).forEach(q => { ch[q] = isP(q) ? (o.v[q] || []).filter(x => E.includes(x)) : o.v[q]; }); if (gk === 'donos' && o.v.titularExterno) ch.titularExterno = o.v.titularExterno; editDraft(a.id, ch); setErr({}); say('Respostas copiadas. Confira antes de continuar.'); };
    return <div className="qs-copy"><span>Vale o mesmo que em {o.x.name}?</span><Btn kind="sm" onClick={copy}>Usar as mesmas respostas</Btn></div>;
  };

  let body;
  if (g === 'review') {
    const row = k => <button className="qs-rrow" key={k} onClick={() => goStep(S.indexOf(stepOf(k)))}><b>{k === 'desc' ? 'Sua contribuição' : QS[k].short}</b><span>{k === 'desc' ? (d.desc || 'Não descrita') : fmtAns(p, k, d[k])}</span><i>{open ? 'Editar' : 'Ver'}</i></button>;
    const sec = gk => {
      const ks = GROUPS[gk].filter(k => (k === 'desc' ? +notasOf(d)[me] > 0 : qs.includes(k)));
      return ks.length > 0 && (
        <div className="qs-sec"><p>{GNAME[gk]}</p><div className="qs-list">
          {ks.map(row)}
          {gk === 'contrib' && <><div className="qs-rrow"><b>Titular indicado hoje</b><span>{d.titularAtualNome || 'Não informado'}</span></div><div className="qs-rrow"><b>Base ou documento</b><span>{d.titularAtualBase || 'Não informado'}</span></div></>}
          {gk === 'donos' && d.titularExterno && <div className="qs-rrow"><b>Titular pretendido fora da equipe</b><span>{d.titularExterno}</span></div>}
        </div></div>
      );
    };
    body = (
      <>
        <div className="qs-head"><h1 className="qs-title" ref={title} tabIndex={-1}>{an.sent || !open ? 'Suas respostas' : 'Revise e envie'}</h1>{open && <p className="qs-hint">Escolha uma resposta para editar. Você pode editar até quem organiza encerrar as respostas.</p>}</div>
        <div className="qs-review">{sec('contrib')}<div className="qs-stack">{sec('donos')}{sec('uso')}</div></div>
      </>
    );
  } else if (g === 'contrib') {
    const n = notasOf(d);
    body = (
      <>
        <div className="qs-head"><p className="qs-step">Parte 1 de 3 · {GNAME[g]}</p><h1 className="qs-title" ref={title} tabIndex={-1}>Quanto cada pessoa fez em {a.name}?</h1><p className="qs-hint">Inclua você. Não precisa ser exato: escolha o que mais se aproxima.</p></div>
        <div className="lv-list">
          {E.map(pid => (
            <div className="lv-row" role="radiogroup" aria-label={'Participação percebida de ' + nm(p, pid)} key={pid}>
              <span className="lv-name">{nm(p, pid)}{pid === me && ' (você)'}</span>
              <span className="lv-seg">{LV.map(([v, t]) => <label className={'lv-opt' + (dis ? ' dis' : '')} key={v}><input type="radio" name={'lv-' + a.id + '-' + pid} checked={hasNota(n, pid) && lvOf(n[pid]) === v} disabled={dis} onChange={() => { setErr({}); editDraft(a.id, dr => ({ notas: { ...notasOf(dr), [pid]: v } })); }} /><span>{t}</span></label>)}</span>
            </div>
          ))}
        </div>
        <Err msg={err[a.id + ':notas']} />
        {+n[me] > 0 && (
          <div className="qs-q">
            <label className="qs-sub" htmlFor="ds">O que você fez?</label>
            <p className="qs-hint" id="ds-h">Uma ou duas frases bastam. Isso entra no registro do acordo.</p>
            <textarea id="ds" aria-describedby="ds-h" value={d.desc || ''} onChange={setText('desc')} placeholder="Ex.: Desenhei o logo e escolhi as cores" disabled={dis} />
            <Err msg={err[a.id + ':desc']} />
            <label htmlFor="lk" className="qs-hint" style={{ marginTop: 8 }}>Link de evidência (opcional)</label>
            <input id="lk" type="text" inputMode="url" value={d.link || ''} onChange={setText('link')} placeholder="https://" disabled={dis} />
            <Err msg={err[a.id + ':link']} />
          </div>
        )}
        {block('origem')}{block('titularAtual')}
        <div className="qs-q">
          <label className="qs-sub" htmlFor="ta-nome">Quem aparece como dono hoje? <span className="muted">(se souber)</span></label>
          <input id="ta-nome" type="text" value={d.titularAtualNome || ''} onChange={setText('titularAtualNome')} placeholder="Nome da pessoa, organização ou terceiro" disabled={dis} />
          <label className="qs-sub" htmlFor="ta-base">Qual é o documento ou o acordo? <span className="muted">(opcional)</span></label>
          <input id="ta-base" type="text" value={d.titularAtualBase || ''} onChange={setText('titularAtualBase')} placeholder="Contrato, registro, licença ou relato" disabled={dis} />
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div className="qs-head"><p className="qs-step">Parte {s + 1} de 3 · {GNAME[g]}</p><h1 className="qs-title" ref={title} tabIndex={-1}>{g === 'donos' ? 'Donos de ' + a.name : 'Como ' + a.name + ' pode ser usado?'}</h1></div>
        {copyFrom(g)}
        {GROUPS[g].filter(q => qs.includes(q)).map(block)}
        {g === 'donos' && <div className="qs-q"><label className="qs-sub" htmlFor="tit-ext">Titular pretendido fora da equipe <span className="muted">(opcional)</span></label><input id="tit-ext" type="text" value={d.titularExterno || ''} onChange={setText('titularExterno')} placeholder="Pessoa, empresa ou instituição" disabled={dis} /></div>}
      </>
    );
  }

  const exit = () => { setUi({ qasset: null, qstep: 0, flag: {} }); setErr({}); };
  const pri = open
    ? (g === 'review' ? <Btn kind="pri" onClick={send}>{an.sent ? 'Salvar alterações' : 'Enviar respostas'}</Btn> : <Btn kind="pri" onClick={next}>{s === nq - 1 ? 'Revisar' : 'Continuar'}</Btn>)
    : (g === 'review' ? <Btn kind="pri" onClick={exit}>Voltar ao projeto</Btn> : <Btn kind="pri" onClick={() => goStep(s + 1)}>Continuar</Btn>);
  const sentName = ui.flag.qsent && p.assets.find(x => x.id === ui.flag.qsent)?.name;
  return (
    <div className="qs" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !['TEXTAREA', 'BUTTON'].includes(e.target.tagName)) { e.preventDefault(); if (g === 'review') { if (open) send(); } else next(); } }}>
      <Header />
      <header className="qs-top">
        <button className="qs-exit" onClick={exit}>‹ Voltar ao projeto</button>
        <div className="qs-ctx"><b>{a.name}</b><span>{a.cat} · {as.indexOf(a) + 1} de {as.length}</span></div>
        <span className="qs-count">{g === 'review' ? 'Revisão' : (s + 1) + ' de ' + nq}</span>
      </header>
      <div className="qs-progress" role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={nq} aria-valuenow={s}><span style={{ width: Math.round(100 * s / nq) + '%' }} /></div>
      <main className="qs-main">
        <div className={'qs-col' + (g === 'review' ? ' wide' : '')}>
          {!open && <Banner>As respostas foram encerradas por {nm(p, p.org)}. Você pode ver o que respondeu, mas não pode mudar.</Banner>}
          {sentName && s === 0 && <Banner>Respostas de {sentName} enviadas. Agora, {a.name}.</Banner>}
          <div className="qs-card">
            {body}
            <div className="qs-actions">{s > 0 && <Btn onClick={() => goStep(s - 1)}>Voltar</Btn>}{pri}</div>
          </div>
          <p className="qs-private">{open ? 'Salvo automaticamente. Só você vê suas respostas até o fim.' : 'Só para consulta.'}</p>
        </div>
      </main>
    </div>
  );
}
