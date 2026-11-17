/* /admin: feedbacks das pessoas, só para quem está em ADMIN_EMAILS no servidor.
   No alto, os números (quantos feedbacks e a satisfação média, com a distribuição); abaixo, a lista agrupada por dia,
   com filtro por tipo e por tela. Os prints abrem num visualizador na própria página. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { get } from '../api.js';
import { useSession } from '../session.jsx';
import { AppFrame, Panel } from '../components/journey/Shell.jsx';
import { Avatar, Chip, Field } from '../components/ds/index.js';
import { Banner } from '../components/ui.jsx';
import { RATINGS } from '../components/Feedback.jsx';
import Icon from '../components/Icon.jsx';

const img = id => '/api/admin/feedback/image/' + id;
const hour = d => new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const dayKey = d => new Date(d).toDateString();
function dayName(d) {
  const t = new Date(), y = new Date(); y.setDate(t.getDate() - 1);
  if (dayKey(d) === t.toDateString()) return 'Hoje';
  if (dayKey(d) === y.toDateString()) return 'Ontem';
  const s = new Date(d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const ratingKind = r => (r >= 4 ? 'ok' : r <= 2 ? 'bad' : 'warn');
/* O filtro usa só a seção ("Decisões"), não o detalhe ("Decisões · Logo · Uso comercial"), que continua em cada linha. */
const section = r => r.screen.split(' · ')[0];

/* Visualizador dos prints de um feedback: setas (ou ← →) passam entre eles; Esc, "Fechar" ou um clique fora fecham. */
function Viewer({ view, onClose }) {
  const dlg = useRef(), [i, setI] = useState(view.index), n = view.images.length;
  useEffect(() => { dlg.current.showModal(); }, []);
  useEffect(() => {
    const key = e => { if (e.key === 'ArrowRight') setI(x => Math.min(n - 1, x + 1)); if (e.key === 'ArrowLeft') setI(x => Math.max(0, x - 1)); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [n]);
  return (
    <dialog ref={dlg} className="viewer" aria-label={'Print ' + (i + 1) + ' de ' + n} onClose={onClose} onClick={e => { if (e.target === dlg.current || e.target.classList.contains('viewer-stage')) dlg.current.close(); }}>
      <div className="viewer-bar">
        <p><b>{view.title}</b>{n > 1 && <span> · {i + 1} de {n}</span>}</p>
        <a className="btn sm" href={img(view.images[i])} target="_blank" rel="noreferrer">Abrir original</a>
        <button type="button" className="btn sm" onClick={() => dlg.current.close()} autoFocus>Fechar</button>
      </div>
      <div className="viewer-stage">
        {n > 1 && <button type="button" className="viewer-nav prev" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Print anterior"><Icon name="chevron-left" /></button>}
        <img src={img(view.images[i])} alt={'Print ' + (i + 1) + ' de ' + n + ' do feedback'} />
        {n > 1 && <button type="button" className="viewer-nav next" onClick={() => setI(i + 1)} disabled={i === n - 1} aria-label="Próximo print"><Icon name="chevron-right" /></button>}
      </div>
    </dialog>
  );
}

export default function Admin() {
  const { me } = useSession();
  const [rows, setRows] = useState(null), [err, setErr] = useState(''), [kind, setKind] = useState(''), [screen, setScreen] = useState(''), [view, setView] = useState(null);
  useEffect(() => { if (me?.admin) get('/api/admin/feedback').then(setRows).catch(e => setErr(e.message)); }, [me]);
  const all = useMemo(() => rows || [], [rows]);
  const sats = useMemo(() => all.filter(r => r.kind === 'satisfacao'), [all]);
  const ofKind = all.filter(r => !kind || r.kind === kind);
  const screens = useMemo(() => [...new Set(all.map(section))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [all]);
  const shown = ofKind.filter(r => !screen || section(r) === screen);
  const days = useMemo(() => { const g = []; for (const r of shown) { const k = dayKey(r.createdAt); if (g.at(-1)?.k !== k) g.push({ k, name: dayName(r.createdAt), rows: [] }); g.at(-1).rows.push(r); } return g; }, [shown]);

  if (!me.admin) return <AppFrame><main className="jr-adm"><h1 className="type-app-title">Feedback</h1><Banner>Só a equipe da MIP vê esta página.</Banner></main></AppFrame>;
  const avg = sats.length ? sats.reduce((s, r) => s + r.rating, 0) / sats.length : 0;
  const count = k => all.filter(r => !k || r.kind === k).length;
  const KINDS = [['', 'Todos'], ['texto', 'Comentários'], ['satisfacao', 'Satisfação']];
  return (
    <AppFrame>
      <main className="jr-adm">
        <h1 className="type-app-title">Feedback</h1>
        {err && <Banner k="bad">{err}</Banner>}
        {!rows && !err && <p className="jr-muted type-app-small" role="status">Buscando os feedbacks…</p>}
        {rows && (
          <>
            <section className="jr-two" aria-label="Resumo">
              <Panel><span className="jr-muted type-app-small">Comentários</span><b className="type-app-title">{count('texto')}</b></Panel>
              <Panel><span className="jr-muted type-app-small">Avaliações</span><b className="type-app-title">{sats.length}</b></Panel>
              <Panel className="jr-grow">
                <span className="jr-muted type-app-small">Satisfação média</span>
                {sats.length ? <b className="type-app-title-3">{RATINGS[Math.round(avg) - 1]} <span className="jr-muted type-app-small">{avg.toFixed(1).replace('.', ',')} de 5,0</span></b> : <b className="jr-muted type-app-title-3">Sem avaliações</b>}
                {sats.length > 0 && (
                  <ul className="jr-dist" aria-label="Avaliações por opção">
                    {RATINGS.map((n, i) => { const k = sats.filter(r => r.rating === i + 1).length; return <li key={n} className="type-app-small"><span>{n}</span><span className="jr-progress jr-progress--thin"><span style={{ width: 100 * k / sats.length + '%' }} /></span><b>{k}</b></li>; })}
                  </ul>
                )}
              </Panel>
            </section>

            <section aria-labelledby="adm-list" className="jr-fields">
              <h2 id="adm-list" className="sr">Feedbacks</h2>
              <div className="jr-row jr-wraprow">
                <div className="jr-wrap" role="radiogroup" aria-label="Tipo">
                  {KINDS.map(([k, n]) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={'jr-pill type-app-small' + (kind === k ? ' is-on' : '')} onClick={() => setKind(k)}>{n} {count(k)}</button>)}
                </div>
                <Field as="select" aria-label="Tela" className="jr-select" value={screen} onChange={e => setScreen(e.target.value)}>
                  <option value="">Todas as telas ({ofKind.length})</option>
                  {screens.map(sc => <option key={sc} value={sc}>{sc} ({ofKind.filter(r => section(r) === sc).length})</option>)}
                </Field>
              </div>
              {!shown.length ? <p className="jr-muted type-app-small">{all.length ? 'Nenhum feedback com esses filtros.' : 'Nenhum feedback ainda. Eles aparecem aqui assim que alguém enviar.'}</p> : days.map(d => (
                <div className="jr-fields" key={d.k}>
                  <p className="jr-eyebrow type-v2-eyebrow">{d.name}</p>
                  {d.rows.map(r => (
                    <Panel key={r.id} className="jr-adm-row">
                      <Avatar name={r.user ? r.user.name : '?'} />
                      <div className="jr-person-text jr-grow">
                        <div className="jr-row"><p className="type-app-body"><b>{r.user ? r.user.name : 'Sem conta'}</b>{r.user && <span className="jr-muted type-app-small"> {r.user.email}</span>}</p><time className="jr-muted type-app-caption" dateTime={r.createdAt}>{hour(r.createdAt)}</time></div>
                        <p className="jr-row jr-row--start type-app-small">{r.kind === 'satisfacao' && <Chip tone={ratingKind(r.rating)}>{RATINGS[r.rating - 1]}</Chip>}<span className="jr-muted">{r.screen}{r.project?.name && ' · ' + r.project.name} · {r.device}</span></p>
                        {r.text && <p className="type-app-small">{r.text}</p>}
                        {r.images?.length > 0 && (
                          <div className="jr-row jr-row--start jr-wraprow">
                            {r.images.map((id, n) => <button type="button" className="jr-thumb" key={id} onClick={() => setView({ images: r.images, index: n, title: (r.user ? r.user.name : 'Sem conta') + ' · ' + r.screen })} aria-label={'Ver print ' + (n + 1) + ' de ' + r.images.length}><img src={img(id)} alt="" loading="lazy" /></button>)}
                          </div>
                        )}
                      </div>
                    </Panel>
                  ))}
                </div>
              ))}
            </section>
          </>
        )}
      </main>
      {view && <Viewer view={view} onClose={() => setView(null)} />}
    </AppFrame>
  );
}
