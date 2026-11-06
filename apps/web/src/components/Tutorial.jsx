/* Tutorial de primeiro uso: três telas com prints da própria MIP, mostrado uma vez por navegador.
   - Aparece sozinho na primeira visita (inclusive por um convite); "Pular tutorial" ou Esc fecha.
   - Dá para rever pelo botão "?" do topo e pela página inicial ("Ver tutorial").
   - Os prints vêm em quatro versões (celular e computador, tema claro e escuro): o navegador baixa só a que
     combina com a largura da tela e o tema do aparelho.
   - Celular: tela cheia, arrastar para os lados troca de tela. Computador: janela larga, print numa moldura de navegador. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import projetoLight from '../assets/tutorial/projeto-light.jpg';
import projetoDark from '../assets/tutorial/projeto-dark.jpg';
import projetoDesktopLight from '../assets/tutorial/projeto-desktop-light.jpg';
import projetoDesktopDark from '../assets/tutorial/projeto-desktop-dark.jpg';
import perguntasLight from '../assets/tutorial/perguntas-light.jpg';
import perguntasDark from '../assets/tutorial/perguntas-dark.jpg';
import perguntasDesktopLight from '../assets/tutorial/perguntas-desktop-light.jpg';
import perguntasDesktopDark from '../assets/tutorial/perguntas-desktop-dark.jpg';
import decidirLight from '../assets/tutorial/decidir-light.jpg';
import decidirDark from '../assets/tutorial/decidir-dark.jpg';
import decidirDesktopLight from '../assets/tutorial/decidir-desktop-light.jpg';
import decidirDesktopDark from '../assets/tutorial/decidir-desktop-dark.jpg';

const SLIDES = [
  {
    title: 'Organize o projeto da equipe',
    text: 'Adicione quem participou e cadastre o que vocês criaram: um app, um logo, uma música. A página do projeto sempre mostra o que fazer agora.',
    light: projetoLight, dark: projetoDark, desktopLight: projetoDesktopLight, desktopDark: projetoDesktopDark,
    alt: 'Página do projeto App Rotas: a próxima tarefa no alto e quem da equipe já respondeu.'
  },
  {
    title: 'Responda em particular',
    text: 'Cada pessoa diz quanto cada um fez, quem deve ser dono e como usar. Ninguém vê suas respostas até o fim.',
    light: perguntasLight, dark: perguntasDark, desktopLight: perguntasDesktopLight, desktopDark: perguntasDesktopDark,
    alt: 'Pergunta “Quanto cada pessoa fez em Logo?”, com as opções Nada, Pouco, Parte e Muito para cada integrante.'
  },
  {
    title: 'Decidam e registrem o acordo',
    text: 'A equipe vê só onde as respostas diferem. Todos confirmam a proposta e o acordo fica registrado.',
    light: decidirLight, dark: decidirDark, desktopLight: decidirDesktopLight, desktopDark: decidirDesktopDark,
    alt: 'Tela de decisões: quantas pessoas marcaram cada nome como dono da criação.'
  }
];
/* Mesma largura em que o CSS troca o layout do tutorial para o de computador. */
const DESKTOP = '(min-width: 768px)';
const KEY = 'mip:tutorial-visto';
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch { /* sem armazenamento: aparece de novo na próxima visita */ } };

const Ctx = createContext(() => {}), OpenCtx = createContext(false);
export const useTutorial = () => useContext(Ctx);
/* Se o tutorial geral está aberto agora (os vídeos de "Como funciona?" esperam ele fechar). */
export const useTutorialOpen = () => useContext(OpenCtx);

export function TutorialProvider({ children }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(() => !seen() && !pathname.startsWith('/admin'));
  const show = useCallback(() => setOpen(true), []);
  const close = useCallback(() => { markSeen(); setOpen(false); }, []);
  return <Ctx.Provider value={show}><OpenCtx.Provider value={open}>{children}{open && <Tutorial onClose={close} />}</OpenCtx.Provider></Ctx.Provider>;
}

function Tutorial({ onClose }) {
  const dlg = useRef(), back = useRef(document.activeElement), swipe = useRef(null);
  const [step, setStep] = useState(0), last = step === SLIDES.length - 1;
  const go = n => setStep(Math.max(0, Math.min(SLIDES.length - 1, n)));
  useEffect(() => {
    const d = dlg.current, from = back.current;
    /* O foco começa no tutorial todo (sem anel em um botão); Tab segue para os botões. */
    d.showModal();
    d.querySelector('.tut-box').focus();
    return () => { if (d.open) d.close(); if (from?.isConnected) from.focus?.(); };
  }, []);
  const onKey = e => {
    if (e.key === 'ArrowRight') go(step + 1);
    else if (e.key === 'ArrowLeft') go(step - 1);
  };
  /* Arrastar para os lados (toque ou mouse) troca de tela; toques em botões não contam. */
  const down = e => { if (!e.target.closest('button')) swipe.current = { x: e.clientX, y: e.clientY }; };
  const up = e => {
    const s = swipe.current; swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) go(step + (dx < 0 ? 1 : -1));
  };
  return (
    <dialog ref={dlg} className="tut" aria-labelledby="tut-title" onCancel={e => { e.preventDefault(); onClose(); }} onKeyDown={onKey} onPointerDown={down} onPointerUp={up} onPointerCancel={() => { swipe.current = null; }}>
      <div className="tut-box" tabIndex={-1}>
        <div className="tut-media">
          <div className="tut-track" style={{ transform: `translateX(-${step * 100}%)` }}>
            {SLIDES.map((s, i) => (
              <div className="tut-slide" key={s.title} aria-hidden={i !== step}>
                <picture className="tut-shot">
                  <source srcSet={s.desktopLight} media={DESKTOP + ' and (prefers-color-scheme: light)'} />
                  <source srcSet={s.desktopDark} media={DESKTOP} />
                  <source srcSet={s.light} media="(prefers-color-scheme: light)" />
                  <img src={s.dark} alt={s.alt} width="390" height="720" draggable="false" loading={i ? 'lazy' : 'eager'} />
                </picture>
              </div>
            ))}
          </div>
        </div>

        <div className="tut-card">
          <div className="tut-dots" aria-hidden="true">{SLIDES.map((s, i) => <span key={s.title} className={i === step ? 'on' : ''} />)}</div>
          {/* Os três textos ocupam o mesmo lugar, para o cartão não mudar de altura entre as telas. */}
          <div className="tut-texts" aria-live="polite">
            {SLIDES.map((s, i) => (
              <div className="tut-text" key={s.title} aria-hidden={i !== step}>
                <p className="tut-count">{i + 1} de {SLIDES.length}</p>
                <h2 id={i === step ? 'tut-title' : undefined}>{s.title}</h2>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div className="tut-acts">
            {step === 1 && <button type="button" className="btn" onClick={() => go(step - 1)}>Voltar</button>}
            <button type="button" className="btn pri" onClick={() => (last ? onClose() : go(step + 1))}>{last ? 'Quero usar a MIP' : 'Continuar'}</button>
          </div>
          {last
            ? <button type="button" className="link tut-skip" onClick={() => go(step - 1)}>Voltar para o tutorial</button>
            : <button type="button" className="link tut-skip" onClick={onClose}>Pular tutorial</button>}
        </div>
      </div>
    </dialog>
  );
}
