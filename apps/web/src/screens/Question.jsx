/* Responder (Figma C7a–C7f): Sobre você, as 3 partes de cada criação (contribuição, titularidade, uso), a revisão e "Respostas enviadas".
   As perguntas, as regras e a validação vêm de @mip/domain e ficam como antes. */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PERFIL, perfilDone, mem, QS, GROUPS, GNAME, LV, approved, elig, nm, ansOf, isP, qsFor, hasNota, lvOf, notasOf, fmtAns, steps, stepOf, stepErrors } from '@mip/domain';
import { AppButton, Avatar, AuthField, Logo, RadioRow } from '../components/ds/index.js';
import { Panel, TextButton } from '../components/journey/Shell.jsx';
import { Banner } from '../components/ui.jsx';
import { usePlace } from '../components/Feedback.jsx';
import { useProject } from './Project.jsx';
import checkOk from '../assets/icons/check-ok.svg';
import checkBox from '../assets/icons/checkbox-check.svg';

/* Barra no alto: marca, aviso de salvamento e "Salvar e sair". */
function Frame({ onExit, children }) {
  return (
    <div className="jr-page">
      <header className="jr-top jr-top--q">
        <div className="jr-top-row">
          <Link to="/inicio" aria-label="MIP, ir para o início"><Logo /></Link>
          <div className="jr-row">
            <span className="jr-muted type-app-small">Suas respostas são salvas automaticamente</span>
            <AppButton kind="secondary" onClick={onExit}>Salvar e sair</AppButton>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

/* Trilho (esquerda): Sobre você e uma linha por criação. */
function Trilho({ count, frac, perfil, current }) {
  const { p, me } = useProject(), as = approved(p);
  return (
    <aside className="jr-rail jr-rail--q" aria-label="Suas respostas">
      <p className="jr-eyebrow type-v2-eyebrow">Suas respostas</p>
      <p className="jr-muted type-app-small">{count}</p>
      <div className="jr-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(100 * frac)}><span style={{ width: (100 * frac) + '%' }} /></div>
      <ol className="jr-qitems">
        <li className={'jr-qitem' + (current === 'perfil' ? ' is-now' : '')}>
          <span className={'jr-tick jr-tick--lg' + (perfil ? '' : ' is-off')}>{perfil ? <img src={checkOk} alt="" width="12" height="12" /> : <span className="type-app-caption">1</span>}</span>
          <span className="jr-person-text"><span className={current === 'perfil' ? 'type-app-title-3' : 'type-app-body'}>Sobre você</span><span className="jr-muted type-app-small">Uma vez por projeto</span></span>
        </li>
        {as.map((a, i) => {
          const sent = !!ansOf(p, me, a.id)?.sent, now = current === a.id;
          return (
            <li key={a.id} className={'jr-qitem' + (now ? ' is-now' : '')}>
              <span className={'jr-tick jr-tick--lg' + (sent ? '' : ' is-off')}>{sent ? <img src={checkOk} alt="" width="12" height="12" /> : <span className="type-app-caption">{i + 2}</span>}</span>
              <span className="jr-person-text"><span className={now ? 'type-app-title-3' : 'type-app-body'}>{a.name}</span><span className="jr-muted type-app-small">{a.cat} · {qsFor(a).length} perguntas</span></span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

const Why = ({ children }) => <aside className="jr-hint jr-hint--q"><p className="type-v2-eyebrow">Por que perguntamos</p><p className="type-app-small">{children}</p></aside>;
const Head = ({ eyebrow, title, sub, refEl }) => (
  <header className="jr-head">
    <p className="jr-eyebrow type-v2-eyebrow">{eyebrow}</p>
    <h1 ref={refEl} tabIndex={-1} className="jr-title jr-title--q type-app-title">{title}</h1>
    {sub && <p className="jr-sub type-v2-body">{sub}</p>}
  </header>
);
const Actions = ({ left, note, right }) => <div className="jr-bar"><div className="jr-bar-left">{left}</div><div className="jr-bar-right">{note && <span className="jr-muted type-app-small">{note}</span>}{right}</div></div>;

/* Pessoa marcável (várias podem ser marcadas). */
function Person({ name, you, checked, disabled, onChange }) {
  return (
    <label className={'jr-optrow' + (checked ? ' is-on' : '') + (disabled ? ' is-dis' : '')}>
      <input type="checkbox" className="sr" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="jr-box20" aria-hidden="true">{checked && <img src={checkBox} alt="" width="12" height="12" />}</span>
      <Avatar name={name} />
      <span className="type-app-body jr-grow">{name}{you && ' (você)'}</span>
    </label>
  );
}

/* ===== C7a: Sobre você ===== */
function Perfil() {
  const { p, me, act, err, setErr, setUi, editPerfil, go } = useProject(), f = mem(p, me).perfil || {}, title = useRef(null), as = approved(p);
  useEffect(() => { title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  const exit = () => { setUi({ qasset: null, qstep: 0, flag: {} }); setErr({}); go('proj'); };
  return (
    <Frame onExit={exit}>
      <main className="jr-body jr-body--q">
        <Trilho count={`0 de ${as.length + 1} etapas`} frac={6 / 280} perfil={false} current="perfil" />
        <div className="jr-main jr-main--q">
          <Head refEl={title} eyebrow="Sobre você · antes de começar" title="Conte um pouco sobre você" sub="Uma vez por projeto. Ninguém vê o que você responder aqui agora: a equipe só vê quando a coleta terminar." />
          <div className="jr-fields jr-fields--xl">
            <AuthField label={PERFIL.funcao.label} placeholder={PERFIL.funcao.ph} value={f.funcao || ''} onChange={e => { setErr({}); editPerfil({ funcao: e.target.value }); }} />
            {err['perfil:funcao'] && <p className="jr-err type-app-small" role="alert">{err['perfil:funcao']}</p>}
            <div className="jr-qblock" role="radiogroup" aria-labelledby="pf-inv">
              <p id="pf-inv" className="type-app-title-3">{PERFIL.investiu.label}</p>
              <p className="jr-muted type-app-small">{PERFIL.investiu.hint}</p>
              <div className="jr-opts">{PERFIL.investiu.opts.map(o => <RadioRow key={o} name="pf-investiu" label={o} checked={f.investiu === o} onChange={() => { setErr({}); editPerfil({ investiu: o }); }} />)}</div>
              {err['perfil:investiu'] && <p className="jr-err type-app-small" role="alert">{err['perfil:investiu']}</p>}
            </div>
          </div>
          <Actions note="Pode parar e continuar depois" right={<AppButton onClick={() => act('perfil', { perfil: f, check: true })}>Continuar</AppButton>} />
        </div>
        <Why>Sua função e se você investiu dinheiro entram no registro do acordo, para dar contexto às decisões.</Why>
      </main>
    </Frame>
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
  const E = elig(p), qs = qsFor(a), dis = !open, title = useRef(null);
  const doneN = 1 + as.filter(x => ansOf(p, me, x.id)?.sent).length, total = as.length + 1;
  usePlace('Perguntas · ' + a.name + ' · ' + (g === 'review' ? 'revisão' : GNAME[g] || 'parte ' + (s + 1)));

  /* Guarda a tela em que a pessoa está, para "Continuar" depois. */
  useEffect(() => { if (open && !an.sent && an.step !== s) editDraft(a.id, null, s); title.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [a.id, s]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAns = (q, v) => { setErr({}); editDraft(a.id, isP(q) ? dr => { const cur = dr[q] || []; return { [q]: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v] }; } : { [q]: v }); };
  const setText = k => e => editDraft(a.id, { [k]: e.target.value });
  const goStep = n => setUi({ qstep: n });
  const exit = () => { setUi({ qasset: null, qstep: 0, flag: {} }); setErr({}); go('proj'); };
  const next = () => {
    if (open) { const e = stepErrors(p, me, a, d, g); if (Object.keys(e).length) { setErr(e); say('Falta responder nesta tela.', 'bad'); return; } }
    goStep(Math.min(nq, s + 1));
  };
  const send = async () => {
    const r = await act('qsend', { aid: a.id });
    if (r) setUi({ flag: { qdone: a.id } });
  };
  /* Envio com erro: leva até a tela com a primeira pergunta pendente. */
  useEffect(() => {
    const keys = Object.keys(err).filter(k => k.startsWith(a.id + ':'));
    if (!keys.length || g !== 'review') return;
    const gi = S.findIndex(x => (GROUPS[x] || []).some(q => err[a.id + ':' + q]) || (x === 'contrib' && err[a.id + ':link']));
    if (gi >= 0) { goStep(gi); say('Falta uma resposta. Levamos você até ela.', 'bad'); }
  }, [err]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===== C7f: respostas enviadas ===== */
  if (ui.flag.qdone === a.id) {
    const remaining = as.find(x => x.id !== a.id && !ansOf(p, me, x.id)?.sent);
    const E2 = elig(p), fin = E2.filter(pid => as.every(x => ansOf(p, pid, x.id)?.sent)).length;
    return (
      <Frame onExit={exit}>
        <main className="jr-done">
          <div className="jr-done-col">
            <span className="jr-bigcheck"><img src={checkOk} alt="" width="26" height="26" /></span>
            <header className="jr-head jr-head--center">
              <p className="jr-eyebrow type-v2-eyebrow">Etapa concluída</p>
              <h1 className="jr-title type-v2-heading-h3">Pronto! Suas respostas foram enviadas</h1>
              <p className="jr-sub type-v2-body">Agradecemos por responder. Agora a MIP espera a equipe terminar e avisa você quando for a hora de decidir.</p>
            </header>
            <Panel>
              <p className="jr-eyebrow type-v2-eyebrow">O que vem agora</p>
              {[`A equipe responde: ${fin} de ${E2.length} pessoas já terminaram.`, 'Quem organiza encerra as respostas.', 'Vocês conversam só sobre o que divergiu.'].map((t, i) => <p key={t} className="jr-step-line type-app-body"><span className="jr-num type-app-caption">{i + 1}</span>{t}</p>)}
            </Panel>
            <div className="jr-stack">
              {remaining && <p className="jr-center type-app-small">Próxima criação: {remaining.name} · {qsFor(remaining).length} perguntas · cerca de 3 min</p>}
              {remaining && <AppButton className="jr-block" onClick={() => setUi({ qasset: remaining.id, qstep: ansOf(p, me, remaining.id)?.step || 0, flag: {} })}>Continuar com {remaining.name}</AppButton>}
              <AppButton kind="secondary" className="jr-block" onClick={exit}>Ver o projeto</AppButton>
              <p className="jr-center type-app-small">Você recebe um e-mail quando a proposta estiver pronta.</p>
            </div>
          </div>
        </main>
      </Frame>
    );
  }

  /* Pergunta de escolha: enunciado, dica e as opções. */
  const block = q => {
    const id = 'q-' + a.id + '-' + q;
    return (
      <div className="jr-qblock" key={q} role={isP(q) ? 'group' : 'radiogroup'} aria-labelledby={id}>
        <p id={id} className="type-app-title-3">{QS[q].label}</p>
        {QS[q].hint && <p className="jr-muted type-app-small">{QS[q].hint}</p>}
        <div className="jr-opts">
          {isP(q)
            ? E.map(pid => <Person key={pid} name={nm(p, pid)} you={pid === me} checked={(d[q] || []).includes(pid)} disabled={dis} onChange={() => setAns(q, pid)} />)
            : QS[q].opts.map(u => <RadioRow key={u} name={id} label={u} checked={d[q] === u} disabled={dis} onChange={() => setAns(q, u)} />)}
        </div>
        {isP(q) && <p className="jr-muted type-app-small">Pode marcar mais de uma pessoa.</p>}
        {err[a.id + ':' + q] && <p className="jr-err type-app-small" role="alert">{err[a.id + ':' + q]}</p>}
      </div>
    );
  };
  /* Atalho: repetir as respostas já enviadas em outra criação. */
  const copyFrom = gk => {
    if (!open) return null;
    const src = as.filter(x => x.id !== a.id).map(x => ({ x, v: ansOf(p, me, x.id)?.sent })).filter(o => o.v && GROUPS[gk].some(q => qs.includes(q) && o.v[q] !== undefined && (isP(q) ? (o.v[q] || []).length : o.v[q])));
    if (!src.length) return null;
    const o = src[src.length - 1];
    const copy = () => { const ch = {}; GROUPS[gk].filter(q => qs.includes(q) && o.v[q] !== undefined).forEach(q => { ch[q] = isP(q) ? (o.v[q] || []).filter(x => E.includes(x)) : o.v[q]; }); if (gk === 'donos' && o.v.titularExterno) ch.titularExterno = o.v.titularExterno; editDraft(a.id, ch); setErr({}); say('Respostas copiadas. Confira antes de continuar.'); };
    return <div className="jr-shortcut"><span className="type-app-small">Vale o mesmo que em {o.x.name}?</span><AppButton kind="small" onClick={copy}>Usar as mesmas respostas</AppButton></div>;
  };

  let body, why = null, eyebrow, titleTxt, sub;
  if (g === 'review') {
    eyebrow = `${a.name} · revisão`; titleTxt = an.sent || !open ? 'Suas respostas' : 'Quase lá! Confira antes de enviar';
    sub = open ? 'Você ainda pode editar até quem organiza encerrar as respostas.' : null;
    why = 'Depois de enviar, suas respostas ficam guardadas e ninguém na equipe as vê até o fim da coleta.';
    const row = (k, label, val) => <div className="jr-ans" key={k}><span className="jr-ans-k type-app-caption">{label}</span><span className="type-app-small jr-grow">{val}</span></div>;
    const sec = gk => {
      const ks = GROUPS[gk].filter(k => (k === 'desc' ? +notasOf(d)[me] > 0 : qs.includes(k)));
      return ks.length > 0 && (
        <Panel key={gk}>
          <div className="jr-row"><h2 className="type-app-title-3">{GNAME[gk]}</h2><TextButton onClick={() => goStep(S.indexOf(stepOf(ks[0])))}>{open ? 'Editar' : 'Ver'}</TextButton></div>
          {ks.map(k => row(k, k === 'desc' ? 'Sua contribuição' : QS[k].short, k === 'desc' ? (d.desc || 'Não descrita') : fmtAns(p, k, d[k])))}
          {gk === 'contrib' && <>{row('tan', 'Titular indicado hoje', d.titularAtualNome || 'Não informado')}{row('tab', 'Base ou documento', d.titularAtualBase || 'Não informado')}</>}
          {gk === 'donos' && d.titularExterno && row('te', 'Titular pretendido fora da equipe', d.titularExterno)}
        </Panel>
      );
    };
    body = <div className="jr-fields jr-fields--xl">{sec('contrib')}{sec('donos')}{sec('uso')}</div>;
  } else if (g === 'contrib') {
    const n = notasOf(d);
    eyebrow = `${a.name} · parte 1 de 3 · contribuição`; titleTxt = `Quanto cada pessoa fez em ${a.name}?`; sub = 'Inclua você. Não precisa ser exato: escolha o que mais se aproxima. É uma percepção, não um cálculo de propriedade.';
    why = 'Comparar percepções ajuda a equipe a ver onde cada um enxerga diferente. Isso não define percentuais.';
    body = (
      <div className="jr-fields jr-fields--xl">
        <Panel>
          {E.map(pid => (
            <div className="jr-row" role="radiogroup" aria-label={'Participação percebida de ' + nm(p, pid)} key={pid}>
              <div className="jr-row"><Avatar name={nm(p, pid)} /><span className="type-app-body">{nm(p, pid)}{pid === me && ' (você)'}</span></div>
              <div className="jr-levels">
                {LV.map(([v, t]) => (
                  <label key={v} className={'jr-level type-app-caption' + (hasNota(n, pid) && lvOf(n[pid]) === v ? ' is-on' : '') + (dis ? ' is-dis' : '')}>
                    <input type="radio" className="sr" name={'lv-' + a.id + '-' + pid} checked={hasNota(n, pid) && lvOf(n[pid]) === v} disabled={dis} onChange={() => { setErr({}); editDraft(a.id, dr => ({ notas: { ...notasOf(dr), [pid]: v } })); }} />{t}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {err[a.id + ':notas'] && <p className="jr-err type-app-small" role="alert">{err[a.id + ':notas']}</p>}
        </Panel>
        {+n[me] > 0 && (
          <div className="jr-qblock">
            <label className="type-app-title-3" htmlFor="ds">O que você fez?</label>
            <p className="jr-muted type-app-small" id="ds-h">Uma ou duas frases bastam. Isso entra no registro do acordo.</p>
            <textarea id="ds" className="jr-area type-app-small" aria-describedby="ds-h" value={d.desc || ''} onChange={setText('desc')} placeholder="Ex.: Desenhei o logo e escolhi as cores" disabled={dis} />
            {err[a.id + ':desc'] && <p className="jr-err type-app-small" role="alert">{err[a.id + ':desc']}</p>}
            <AuthField label="Link de evidência (opcional)" placeholder="https://" inputMode="url" value={d.link || ''} onChange={setText('link')} disabled={dis} />
            {err[a.id + ':link'] && <p className="jr-err type-app-small" role="alert">{err[a.id + ':link']}</p>}
          </div>
        )}
        {block('origem')}{block('titularAtual')}
        <AuthField label="Quem aparece como dono hoje? (se souber)" placeholder="Nome da pessoa, organização ou terceiro" value={d.titularAtualNome || ''} onChange={setText('titularAtualNome')} disabled={dis} />
        <AuthField label="Qual é o documento ou o acordo? (opcional)" placeholder="Contrato, registro, licença ou relato" value={d.titularAtualBase || ''} onChange={setText('titularAtualBase')} disabled={dis} />
      </div>
    );
  } else {
    eyebrow = `${a.name} · parte ${s + 1} de 3 · ${GNAME[g].toLowerCase()}`;
    titleTxt = g === 'donos' ? `Quem deve ser dono de ${a.name}?` : `Como ${a.name} pode ser usado?`;
    sub = g === 'donos' ? 'É uma intenção: não comprova quem é dono hoje nem transfere direitos.' : 'Pense no que acontece se alguém sair da equipe ou se vocês quiserem divulgar ou vender.';
    why = g === 'donos' ? 'Você pode marcar mais de uma pessoa. A equipe vai comparar as respostas e decidir junto.' : 'Essas respostas viram as condições propostas no acordo. Onde todos concordarem, nada precisa ser conversado.';
    body = (
      <div className="jr-fields jr-fields--xl">
        {copyFrom(g)}
        {GROUPS[g].filter(q => qs.includes(q)).map(block)}
        {g === 'donos' && <AuthField label="Titular pretendido fora da equipe (opcional)" placeholder="Pessoa, empresa ou instituição" value={d.titularExterno || ''} onChange={setText('titularExterno')} disabled={dis} />}
      </div>
    );
  }

  const nextA = as.find(x => x.id !== a.id && !ansOf(p, me, x.id)?.sent);
  const right = open
    ? (g === 'review' ? <AppButton onClick={send}>{an.sent ? 'Salvar alterações' : `Enviar respostas de ${a.name}`}</AppButton> : <AppButton onClick={next}>{s === nq - 1 ? 'Revisar respostas' : 'Continuar'}</AppButton>)
    : (g === 'review' ? <AppButton onClick={exit}>Voltar ao projeto</AppButton> : <AppButton onClick={() => goStep(s + 1)}>Continuar</AppButton>);
  const note = g === 'review' ? (open && !an.sent && nextA ? `Depois do envio você segue para ${nextA.name}` : null) : 'Pode parar e continuar depois';
  return (
    <Frame onExit={exit}>
      <main className="jr-body jr-body--q" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !['TEXTAREA', 'BUTTON', 'INPUT'].includes(e.target.tagName)) { e.preventDefault(); if (g === 'review') { if (open) send(); } else next(); } }}>
        <Trilho count={`${doneN - 1 < 0 ? 0 : doneN} de ${total} etapas · ${g === 'review' ? 'revisão do ' + a.name : a.name + ' parte ' + (s + 1) + ' de 3'}`} frac={Math.min(1, 0.3 + 0.15 * s + 0.25 * (doneN - 1))} perfil current={a.id} />
        <div className="jr-main jr-main--q">
          {!open && <Banner>As respostas foram encerradas por {nm(p, p.org)}. Você pode ver o que respondeu, mas não pode mudar.</Banner>}
          <Head refEl={title} eyebrow={eyebrow} title={titleTxt} sub={sub} />
          {body}
          <Actions left={s > 0 ? <AppButton kind="secondary" onClick={() => goStep(s - 1)}>Voltar</AppButton> : null} note={note} right={right} />
        </div>
        {why && <Why>{why}</Why>}
      </main>
    </Frame>
  );
}
