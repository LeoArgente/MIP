/* Projeto: carrega os dados do servidor, executa as ações e escolhe a tela.
   Rascunhos (respostas e proposta) são salvos sozinhos alguns instantes depois da última mudança. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approved, mem, PHN, clone, propOf } from '@mip/domain';
import { get, post, patch } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import { Banner, Btn, Chip, useToast } from '../components/ui.jsx';
import { Hub, Equipe, Criacoes, Respostas, Andamento, Decidir, Confirmacao, Memorial, Welcome, TIPS } from './ProjectScreens.jsx';
import Question from './Question.jsx';
import DecideFocus from './DecideFocus.jsx';

const Ctx = createContext(null);
export const useProject = () => useContext(Ctx);

export default function Project() {
  const { id, tab = 'proj' } = useParams(), nav = useNavigate(), say = useToast();
  const { me: user, update, config } = useSession(), me = user.id;
  const [p, setP] = useState(null), [loadErr, setLoadErr] = useState(null), [err, setErr] = useState({});
  /* Estado da tela (não vai para o servidor). */
  const [ui, setUiState] = useState({ qasset: null, qstep: 0, dq: null, dstep: 0, flag: {}, tipOpen: null });
  const setUi = useCallback(o => setUiState(s => ({ ...s, ...(typeof o === 'function' ? o(s) : o) })), []);
  const pending = useRef(new Map()), timer = useRef();

  const load = useCallback(async () => {
    try { setP(await get('/api/projects/' + id)); setLoadErr(null); } catch (x) { setLoadErr(x); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  /* Envia rascunhos pendentes (antes de qualquer outra ação e ao sair da tela). */
  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const jobs = [...pending.current.values()]; pending.current.clear();
    for (const j of jobs) { try { await post(`/api/projects/${id}/actions/${j.type}`, j.body); } catch (x) { say(x.message, 'bad'); } }
  }, [id, say]);
  const queue = useCallback((key, job) => { pending.current.set(key, job); clearTimeout(timer.current); timer.current = setTimeout(flush, 700); }, [flush]);
  useEffect(() => () => { flush(); }, [flush]);

  /* Atualiza quando outra pessoa age (a cada 20 s, fora do modo foco e sem rascunho pendente). */
  const focus = !!(ui.qasset || ui.dq);
  useEffect(() => {
    const t = setInterval(() => { if (!focus && !pending.current.size && document.visibilityState === 'visible') load(); }, 20000);
    const onVis = () => { if (document.visibilityState === 'visible' && !focus && !pending.current.size) load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [focus, load]);

  const go = useCallback(t => { setUi({ flag: {}, tipOpen: null }); setErr({}); nav('/p/' + id + (t && t !== 'proj' ? '/' + t : '')); window.scrollTo(0, 0); }, [id, nav, setUi]);

  /* Executa uma ação no servidor e aplica o resultado na tela. */
  const act = useCallback(async (type, body = {}, path) => {
    await flush();
    setErr({});
    try {
      const r = await post(path || `/api/projects/${id}/actions/${type}`, body);
      if (r.project) setP(r.project);
      const res = r.result || {};
      if (res.toast) say(res.toast);
      if (res.notice) say(res.notice);
      if (res.tab) go(res.tab);
      /* Como no protótipo: ao liberar as perguntas, quem organiza já começa pelas suas. */
      if (res.tab === 'resp' && r.project) { const nx = approved(r.project).find(a => !r.project.answers[me]?.[a.id]?.sent); if (nx) setUi({ qasset: nx.id, qstep: 0 }); }
      return res;
    } catch (x) {
      setErr(x.err);
      if (x.err._ || x.status === 403) say(x.message, 'bad');
      if (x.status === 409 || x.status === 403) load();
      return null;
    }
  }, [flush, go, id, load, say, me, setUi]);

  /* Rascunho da resposta da pessoa (local na hora, servidor logo depois). */
  const editDraft = useCallback((aid, patchFn, step) => {
    setP(prev => {
      const n = clone(prev), mine = (n.answers[me] = n.answers[me] || {}), an = (mine[aid] = mine[aid] || { draft: { desc: '', link: '' }, sent: null, step: 0 });
      if (patchFn) an.draft = { ...an.draft, ...(typeof patchFn === 'function' ? patchFn(an.draft) : patchFn) };
      if (Number.isInteger(step)) an.step = step;
      queue('draft:' + aid, { type: 'draft', body: { aid, draft: an.draft, step: an.step } });
      return n;
    });
  }, [me, queue]);

  /* Rascunho da proposta (só quem organiza). */
  const editProp = useCallback((aid, patchFn) => {
    setP(prev => {
      const n = clone(prev), pr = (n.proposal[aid] = n.proposal[aid] || propOf(n, aid));
      const ch = typeof patchFn === 'function' ? patchFn(pr) : patchFn;
      Object.assign(pr, ch, ch.v ? { v: { ...pr.v, ...ch.v } } : {}); pr.saved = false;
      queue('prop:' + aid, { type: 'propdraft', body: { aid, prop: { v: pr.v, externo: pr.externo, percentual: pr.percentual, texto: pr.texto, semAcordo: pr.semAcordo } } });
      return n;
    });
  }, [queue]);

  if (loadErr) return <><Header /><Banner k="bad" action={<Btn kind="sm" onClick={() => nav('/')}>Voltar ao início</Btn>}>{loadErr.message}</Banner></>;
  if (!p) return <Header />;

  const m = mem(p, me), org = p.org === me;
  const value = { p, me, org, act, go, err, setErr, ui, setUi, editDraft, editProp, flush, reload: load, say, tab };

  /* Modo foco: responder perguntas ou decidir uma criação, uma tela por vez. */
  const inQuestion = tab === 'resp' && m?.status === 'ativo' && m.elig && approved(p).some(a => a.id === ui.qasset);
  const inDecide = tab === 'decidir' && p.phase === 'decisao' && org && approved(p).some(a => a.id === ui.dq);
  if (user.seenWelcome && (inQuestion || inDecide)) return <Ctx.Provider value={value}>{inQuestion ? <Question /> : <DecideFocus />}</Ctx.Provider>;

  const head = <header className="proj"><b>{p.name}</b><span>{(org ? 'Você organiza' : 'Você participa') + ' · ' + PHN[p.phase]}</span></header>;
  if (!user.seenWelcome) return <><Header />{head}<Welcome name={user.name} askName={!config.testLogin} onStart={async name => { await update({ name, seenWelcome: true }); load(); }} /></>;

  const screens = { proj: Hub, equipe: Equipe, ativos: Criacoes, resp: Respostas, coleta: Andamento, decidir: Decidir, conf: Confirmacao, memorial: Memorial };
  const Screen = screens[tab] || Hub;
  return (
    <Ctx.Provider value={value}>
      <Header />
      {tab === 'proj' ? head : (
        <nav className={'back-nav' + (tab === 'conf' ? '' : ' read')}>
          <span className="back-l"><button className="back-btn" onClick={() => go('proj')}>‹ {p.name}</button><Chip>{PHN[p.phase]}</Chip></span>
          {TIPS[tab] && ui.tipOpen !== tab && <button className="link" onClick={() => setUi({ tipOpen: tab })}>Como funciona?</button>}
        </nav>
      )}
      <Screen />
    </Ctx.Provider>
  );
}

/* Layout das telas do projeto: cartão principal com a barra de ações no fim e, quando houver, coluna lateral. */
export function Page({ children, bar, side }) {
  const { ui, setUi, tab } = useProject();
  return (
    <div className={'page' + (side ? '' : ' solo')}>
      <div className="page-main">
        {ui.tipOpen === tab && TIPS[tab] && <div className="tip-card"><p>{TIPS[tab]}</p><Btn kind="sm" onClick={() => setUi({ tipOpen: null })}>Fechar</Btn></div>}
        <div className="step-card">{children}{bar}</div>
      </div>
      {side && <aside className="page-side">{side}</aside>}
    </div>
  );
}
export { patch };
