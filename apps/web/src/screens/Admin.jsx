/* /admin: feedbacks das pessoas, só para quem está em ADMIN_EMAILS no servidor.
   No alto, os números (quantos feedbacks e a satisfação média, com a distribuição); abaixo, a lista agrupada por dia,
   com filtro por tipo e por tela. Os prints abrem num visualizador na própria página. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { get } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import { Banner, Chip, initials } from '../components/ui.jsx';
import { RATINGS } from '../components/Feedback.jsx';

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
        {n > 1 && <button type="button" className="viewer-nav prev" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Print anterior">‹</button>}
        <img src={img(view.images[i])} alt={'Print ' + (i + 1) + ' de ' + n + ' do feedback'} />
        {n > 1 && <button type="button" className="viewer-nav next" onClick={() => setI(i + 1)} disabled={i === n - 1} aria-label="Próximo print">›</button>}
      </div>
    </dialog>
  );
}

export default function Admin() {
  const { me } = useSession();
  const [rows, setRows] = useState(null), [err, setErr] = useState(''), [kind, setKind] = useState(''), [screen, setScreen] = useState(''), [view, setView] = useState(null);
  useEffect(() => { if (me?.admin) get('/api/admin/feedback').then(setRows).catch(e => setErr(e.message)); }, [me]);
  const all = rows || [];
  const sats = useMemo(() => all.filter(r => r.kind === 'satisfacao'), [all]);
  const screens = useMemo(() => [...new Set(all.map(r => r.screen))].sort(), [all]);
  const shown = all.filter(r => (!kind || r.kind === kind) && (!screen || r.screen === screen));
  const days = useMemo(() => { const g = []; for (const r of shown) { const k = dayKey(r.createdAt); if (g.at(-1)?.k !== k) g.push({ k, name: dayName(r.createdAt), rows: [] }); g.at(-1).rows.push(r); } return g; }, [shown]);

  if (!me.admin) return <><Header /><main className="admin"><h1>Feedback</h1><Banner>Só a equipe da MIP vê esta página.</Banner></main></>;
  const avg = sats.length ? sats.reduce((s, r) => s + r.rating, 0) / sats.length : 0;
  const count = k => all.filter(r => !k || r.kind === k).length;
  const KINDS = [['', 'Todos'], ['texto', 'Comentários'], ['satisfacao', 'Satisfação']];
  return (
    <>
      <Header />
      <main className="admin">
        <h1>Feedback</h1>
        {err && <Banner k="bad">{err}</Banner>}
        {!rows && !err && <p className="muted" role="status">Buscando os feedbacks…</p>}
        {rows && (
          <>
            <section className="admin-stats" aria-label="Resumo">
              <div className="stat"><span>Comentários</span><b>{count('texto')}</b></div>
              <div className="stat"><span>Avaliações</span><b>{sats.length}</b></div>
              <div className="stat wide">
                <span>Satisfação média</span>
                {sats.length ? <b>{RATINGS[Math.round(avg) - 1]} <small>{avg.toFixed(1).replace('.', ',')} de 5</small></b> : <b className="muted">Sem avaliações</b>}
                {sats.length > 0 && (
                  <ul className="admin-dist" aria-label="Avaliações por opção">
                    {RATINGS.map((n, i) => { const k = sats.filter(r => r.rating === i + 1).length; return <li key={n}><span>{n}</span><span className="dec-bar"><i style={{ width: 100 * k / sats.length + '%' }} /></span><b>{k}</b></li>; })}
                  </ul>
                )}
              </div>
            </section>

            <section className="admin-list" aria-labelledby="adm-list">
              <h2 id="adm-list" className="sr">Feedbacks</h2>
              <div className="admin-filters">
                <div className="seg" role="radiogroup" aria-label="Tipo">
                  {KINDS.map(([k, n]) => <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{n} <span>{count(k)}</span></button>)}
                </div>
                <label className="admin-screen"><span className="sr">Tela</span>
                  <select value={screen} onChange={e => setScreen(e.target.value)}><option value="">Todas as telas</option>{screens.map(s => <option key={s}>{s}</option>)}</select>
                </label>
              </div>
              {!shown.length ? <p className="admin-empty">{all.length ? 'Nenhum feedback com esses filtros.' : 'Nenhum feedback ainda. Eles aparecem aqui assim que alguém enviar.'}</p> : days.map(d => (
                <div className="admin-day" key={d.k}>
                  <h3>{d.name}</h3>
                  <ul className="admin-rows">
                    {d.rows.map(r => (
                      <li key={r.id} className="admin-row">
                        <span className="avatar" aria-hidden="true">{r.user ? initials(r.user.name) : '?'}</span>
                        <div className="admin-body">
                          <div className="admin-head">
                            <p><b>{r.user ? r.user.name : 'Sem conta'}</b>{r.user && <span className="admin-mail"> {r.user.email}</span>}</p>
                            <time dateTime={r.createdAt}>{hour(r.createdAt)}</time>
                          </div>
                          <p className="admin-where">{r.kind === 'satisfacao' && <Chip k={ratingKind(r.rating)}>{RATINGS[r.rating - 1]}</Chip>}<span>{r.screen}{r.project?.name && ' · ' + r.project.name} · {r.device}</span></p>
                          {r.text && <p className="admin-text">{r.text}</p>}
                          {r.images?.length > 0 && (
                            <div className="admin-imgs">
                              {r.images.map((id, n) => <button type="button" key={id} onClick={() => setView({ images: r.images, index: n, title: (r.user ? r.user.name : 'Sem conta') + ' · ' + r.screen })} aria-label={'Ver print ' + (n + 1) + ' de ' + r.images.length}><img src={img(id)} alt="" loading="lazy" /></button>)}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          </>
        )}
      </main>
      {view && <Viewer view={view} onClose={() => setView(null)} />}
    </>
  );
}
