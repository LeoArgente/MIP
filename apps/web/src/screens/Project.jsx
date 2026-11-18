/* Projeto: carrega os dados do servidor, executa as ações e escolhe a tela.
   Rascunhos (respostas e proposta) são salvos sozinhos alguns instantes depois da última mudança. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { approved, mem, clone, propOf, eligNaVersao, lastV } from '@mip/domain';
import { get, post } from '../api.js';
import { useSession } from '../session.jsx';
import { AppFrame } from '../components/journey/Shell.jsx';
import { Fases, Painel, ProjectHeader } from './project/Painel.jsx';
import { Panel } from '../components/journey/Shell.jsx';
import { Andamento } from './project/Andamento.jsx';
import { SetupCriacoes, SetupEquipe, SetupRevisar, SetupSobre } from './project/Setup.jsx';
import { Banner, BusyCtx, useToast } from '../components/ui.jsx';
import { AppButton } from '../components/ds/index.js';
import { Equipe, Criacoes, Sobre, Respostas } from './project/Abas.jsx';
import { Decidir, Ponto } from './project/Decisoes.jsx';
import { Confirmacao, ConfirmarProposta } from './project/Confirmacao.jsx';
import { Registro } from './project/Registro.jsx';
import { Boas } from './project/Boas.jsx';
import Question from './Question.jsx';

const Ctx = createContext(null);
/* O que o botão diz enquanto a ação roda: o que está acontecendo, não "Carregando". */
const BUSY = { setupnext: 'Salvando…', setupassets: 'Liberando…', qsend: 'Enviando…', closeok: 'Encerrando…', saveprop: 'Salvando…', sendv: 'Enviando…', conf: 'Confirmando…', refuse: 'Enviando…', genmem: 'Gerando…', del: 'Excluindo…', remove: 'Removendo…', invite: 'Adicionando…', addasset: 'Cadastrando…', sugasset: 'Enviando…', comment: 'Enviando…', remind: 'Enviando…' };
export const useProject = () => useContext(Ctx);

export default function Project() {
  const { id, tab = 'proj' } = useParams(), nav = useNavigate(), say = useToast();
  const { me: user, update } = useSession(), me = user.id;
  const [p, setP] = useState(null), [loadErr, setLoadErr] = useState(null), [err, setErr] = useState({});
  /* Estado da tela (não vai para o servidor). */
  const [ui, setUiState] = useState({ qasset: null, qstep: 0, dq: null, dstep: 0, dedit: null, flag: {}, tipOpen: null });
  const setUi = useCallback(o => setUiState(s => ({ ...s, ...(typeof o === 'function' ? o(s) : o) })), []);
  const pending = useRef(new Map()), timer = useRef();
  const [busy, setBusy] = useState(null), running = useRef(false);

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
    /* Uma ação por vez: um segundo clique enquanto a primeira roda é ignorado. */
    if (running.current) return null;
    running.current = true;
    setBusy({ type, label: BUSY[type] || 'Salvando…' });
    try {
      await flush();
      setErr({});
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
    } finally {
      running.current = false;
      setBusy(null);
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

  if (loadErr && !p) return <AppFrame><div className="jr-pjframe"><Banner k="bad" action={<AppButton kind="small" onClick={() => nav('/inicio')}>Voltar ao início</AppButton>}>{loadErr.message}</Banner></div></AppFrame>;
  if (!p) return <AppFrame><div className="jr-pjframe" /></AppFrame>;

  const m = mem(p, me), org = p.org === me;
  /* Sobre o projeto e sobre você: salvos sozinhos, como os rascunhos. */
  const editSobre = ch => setP(prev => { const n = clone(prev); n.sobre = { ...(n.sobre || {}), ...ch }; queue('sobre', { type: 'sobre', body: { sobre: n.sobre } }); return n; });
  const editPerfil = ch => setP(prev => { const n = clone(prev), mm = n.members.find(x => x.pid === me); mm.perfil = { ...(mm.perfil || {}), ...ch }; queue('perfil', { type: 'perfil', body: { perfil: mm.perfil } }); return n; });
  const value = { p, me, org, act, go, err, setErr, ui, setUi, editDraft, editProp, editSobre, editPerfil, flush, reload: load, say, tab };

  /* Modo foco: responder perguntas ou decidir uma criação, uma tela por vez. */
  const inQuestion = tab === 'resp' && m?.status === 'ativo' && m.elig && approved(p).some(a => a.id === ui.qasset);
  const inDecide = tab === 'decidir' && p.phase === 'decisao' && org && approved(p).some(a => a.id === ui.dq);
  if (user.seenWelcome && (inQuestion || inDecide)) return <Ctx.Provider value={value}><BusyCtx.Provider value={busy}>{inQuestion ? <Question /> : <Ponto />}</BusyCtx.Provider></Ctx.Provider>;

  if (!user.seenWelcome) {
    const comecar = async (name, resp) => {
      await update({ name, seenWelcome: true }); await load();
      if (resp) { const nx = approved(p).find(a => !p.answers[me]?.[a.id]?.sent); if (nx) setUi({ qasset: nx.id, qstep: 0 }); go('resp'); }
    };
    return <Boas name={user.name} onStart={comecar} />;
  }

  /* Preparar o projeto: quem organiza vê o passo a passo do Figma (C2 a C5). */
  const preparing = org && p.phase === 'coleta' && ['equipe', 'ativos', 'sobre'].includes(p.setupStep);
  const SETUP = { equipe: SetupEquipe, ativos: SetupCriacoes, sobre: SetupSobre, revisar: SetupRevisar };
  if (preparing && SETUP[tab]) {
    const Step = SETUP[tab];
    return <Ctx.Provider value={value}><BusyCtx.Provider value={busy}><AppFrame><Step /></AppFrame></BusyCtx.Provider></Ctx.Provider>;
  }
  /* Convidado com a proposta para confirmar (D7): tela própria. */
  const lvAtual = lastV(p);
  if (!org && p.phase === 'confirmacao' && ['conf', 'decidir'].includes(tab) && lvAtual && eligNaVersao(lvAtual).includes(me) && !lvAtual.conf[me]) return <Ctx.Provider value={value}><BusyCtx.Provider value={busy}><AppFrame><ConfirmarProposta /></AppFrame></BusyCtx.Provider></Ctx.Provider>;
  const screens = { proj: Painel, equipe: Equipe, ativos: Criacoes, sobre: Sobre, resp: Respostas, coleta: Andamento, decidir: Decidir, conf: Confirmacao, memorial: Registro };
  const Screen = screens[tab] || Painel;
  return (
    <Ctx.Provider value={value}><BusyCtx.Provider value={busy}>
      <AppFrame><div className="jr-pjframe"><ProjectHeader />{loadErr ? <div className="jr-pj"><Fases /><Banner k="bad" title="Não foi possível carregar o painel" action={<AppButton kind="small" onClick={load}>Tentar de novo</AppButton>}>Verifique sua conexão e tente de novo.</Banner><Panel><h2 className="type-v2-heading-h3">Não conseguimos mostrar esta parte agora</h2><p className="jr-sec type-app-small">Suas respostas continuam salvas. Tente de novo em instantes.</p></Panel></div> : <Screen />}</div></AppFrame>
    </BusyCtx.Provider></Ctx.Provider>
  );
}
