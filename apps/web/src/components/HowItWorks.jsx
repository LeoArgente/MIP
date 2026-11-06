/* "Como funciona?" com vídeo: um pop-up pequeno com a gravação da própria página funcionando.
   - Na primeira vez que a pessoa entra na página, ele abre sozinho (é o tutorial de primeira entrada da página).
     Se o tutorial geral estiver aberto, espera ele fechar.
   - Depois, abre pelo "Como funciona?" da página (na página do projeto, pelo botão "?" do topo).
   - O vídeo vem em quatro versões (celular e computador, tema claro e escuro); a escolha segue a tela e o tema.
   - Começa sozinho, sem som, sempre (inclusive com "reduzir movimento" ligado no aparelho);
     o botão de pausa no canto do vídeo (ou um clique nele) para.
   - Páginas com mais coisa para explicar têm capítulos: cada capítulo é um vídeo curto com título e explicação,
     e ao terminar o vídeo passa sozinho para o próximo. O último fica repetindo.
   Para outra página ganhar vídeo: grave os arquivos em assets/como-funciona/ (<nome>-light.mp4, <nome>-dark.mp4,
   <nome>-desktop-light.mp4, <nome>-desktop-dark.mp4 e uma capa -poster.jpg de cada) e acrescente uma entrada em HOW. */
import { useEffect, useRef, useState } from 'react';

/* Todos os vídeos e capas da pasta, como endereços (o navegador só baixa o que for tocar). */
const FILES = import.meta.glob('../assets/como-funciona/*.{mp4,jpg}', { eager: true, query: '?url', import: 'default' });
const file = n => FILES['../assets/como-funciona/' + n];
/* Celular gravado em 390 × 640; computador em 800 × 600. */
const clip = name => ({
  mobile: { w: 390, h: 640, light: [file(name + '-light.mp4'), file(name + '-light-poster.jpg')], dark: [file(name + '-dark.mp4'), file(name + '-dark-poster.jpg')] },
  desktop: { w: 800, h: 600, light: [file(name + '-desktop-light.mp4'), file(name + '-desktop-light-poster.jpg')], dark: [file(name + '-desktop-dark.mp4'), file(name + '-desktop-dark-poster.jpg')] }
});

/* Por aba do projeto: proj = página do projeto, ativos = Criações, sobre = Sobre o projeto. */
export const HOW = {
  proj: {
    title: 'Como funciona a página do projeto',
    sections: [
      {
        title: 'O que fazer agora',
        text: 'O bloco “Agora” sempre mostra a próxima tarefa do projeto. O botão leva direto para ela. Para voltar, toque no nome do projeto no alto da tela.',
        alt: 'Vídeo: o bloco Agora, com a tarefa “Aguardando a equipe”, ganha destaque; a pessoa toca em Ver andamento, vê quem já respondeu e volta para a página do projeto.',
        ...clip('projeto-1')
      },
      {
        title: 'Quem já respondeu',
        text: 'Enquanto as respostas estão abertas, o cartão “Equipe” mostra quem já respondeu, sem mostrar o que cada pessoa escolheu. Quem organiza pode tocar em “Lembrar” para avisar quem falta.',
        alt: 'Vídeo: o cartão Equipe ganha destaque; o cursor passa por Ana (Respondeu), Bruno (Respondendo) e Carla (Não começou) e para no botão Lembrar.',
        ...clip('projeto-2')
      },
      {
        title: 'As etapas do projeto',
        text: 'O projeto passa por sete etapas, em ordem. O ✓ marca as etapas feitas, o círculo cheio é a etapa de agora e as apagadas abrem depois. Toque numa etapa para abrir.',
        alt: 'Vídeo: a lista de etapas ganha destaque; o cursor passa pelas etapas feitas, pela etapa atual e pelas que abrem depois, abre Criações e volta.',
        ...clip('projeto-3')
      },
      {
        title: 'Histórico do projeto',
        text: 'Tudo o que acontece no projeto fica registrado no histórico, com quem fez e quando. Toque em “Histórico do projeto” para abrir a lista.',
        alt: 'Vídeo: a pessoa abre o Histórico do projeto e a lista de registros, com nomes, ações, datas e horários, ganha destaque.',
        ...clip('projeto-4')
      }
    ]
  },
  ativos: {
    title: 'Como cadastrar as criações',
    text: 'Escolha o tipo, dê um nome e, se quiser, uma descrição e um link. Ao cadastrar, a criação já entra nas perguntas de todos.',
    alt: 'Vídeo: na página Criações, a pessoa escolhe o tipo Marca, digita o nome Logo e a descrição, toca em Cadastrar criação e o Logo aparece na lista de cadastradas.',
    ...clip('criacoes')
  },
  sobre: {
    title: 'Como responder sobre o projeto',
    text: 'São três perguntas sobre o projeto como um todo. As respostas são salvas sozinhas e todos da equipe podem ver. Depois, é só liberar as perguntas.',
    alt: 'Vídeo: na página Sobre o projeto, a pessoa escreve em nome de quem estão o domínio e as contas, escolhe Verbal no acordo, marca Sim no edital, preenche o documento e chega ao botão Liberar perguntas.',
    ...clip('sobre')
  }
};

const key = tab => 'mip:como-funciona:' + tab;
export const howSeen = tab => { try { return localStorage.getItem(key(tab)) === '1'; } catch { return true; } };
export const markHowSeen = tab => { try { localStorage.setItem(key(tab), '1'); } catch { /* sem armazenamento: abre de novo na próxima visita */ } };

const media = q => typeof window !== 'undefined' && window.matchMedia(q).matches;

export function HowVideo({ tab, onClose }) {
  const how = HOW[tab], parts = how.sections || [how], many = parts.length > 1;
  const dlg = useRef(), vids = useRef([]), bars = useRef([]), back = useRef(document.activeElement);
  const [i, setI] = useState(0), [playing, setPlaying] = useState(true);
  const last = i === parts.length - 1;
  /* A versão é escolhida ao abrir: largura da tela (a mesma do layout de computador) e tema do aparelho. */
  const [look] = useState(() => ({ size: media('(min-width: 768px)') ? 'desktop' : 'mobile', theme: media('(prefers-color-scheme: light)') ? 'light' : 'dark' }));
  const v = parts[0][look.size];
  useEffect(() => {
    const d = dlg.current, from = back.current;
    d.showModal();
    d.querySelector('.how-box').focus();
    return () => { if (d.open) d.close(); if (from?.isConnected) from.focus?.(); };
  }, []);
  /* Troca de capítulo: todos os vídeos já estão carregados (um em cima do outro), então a troca é na hora.
     O capítulo novo começa do início; os outros param. Sem som o navegador deixa tocar sozinho;
     se ainda assim recusar, o botão mostra "reproduzir".
     A barra do capítulo acompanha o vídeo quadro a quadro (sem passar pelo React, para não engasgar). */
  useEffect(() => {
    const el = vids.current[i], bar = bars.current[i];
    vids.current.forEach((x, n) => { if (x && n !== i) x.pause(); });
    el.muted = true; el.currentTime = 0;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    let raf;
    const tick = () => { if (bar && el.duration) bar.style.transform = `scaleX(${Math.min(1, el.currentTime / el.duration)})`; raf = requestAnimationFrame(tick); };
    tick();
    return () => { cancelAnimationFrame(raf); if (bar) bar.style.transform = ''; };
  }, [i]);
  const go = n => setI(Math.max(0, Math.min(parts.length - 1, n)));
  const toggle = () => { const el = vids.current[i]; if (el.paused) { el.play(); setPlaying(true); } else { el.pause(); setPlaying(false); } };
  return (
    <dialog ref={dlg} className="how" aria-labelledby="how-title" onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === dlg.current) onClose(); }}>
      <div className="how-box" tabIndex={-1}>
        <div className="how-head">
          <h2 id="how-title">{how.title}</h2>
          <button type="button" className="how-x" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        {many && (
          <div className="how-chapters" role="group" aria-label="Capítulos">
            {parts.map((s, n) => (
              <button type="button" key={s.title} className={'how-ch' + (n < i ? ' done' : n === i ? ' on' : '')} onClick={() => go(n)} aria-label={`Capítulo ${n + 1}: ${s.title}`} aria-current={n === i ? 'step' : undefined}>
                <span ref={el => { bars.current[n] = el; }} />
              </button>
            ))}
          </div>
        )}
        <div className="how-video">
          {parts.map((s, n) => {
            const src = s[look.size][look.theme];
            return (
              <video key={s.title || n} ref={el => { vids.current[n] = el; }} className={n === i ? 'on' : ''} aria-hidden={n !== i} src={src[0]} poster={src[1]} width={v.w} height={v.h}
                autoPlay={n === 0} muted loop={n === parts.length - 1} playsInline preload="auto" aria-label={s.alt} onClick={toggle}
                onEnded={() => { if (n === i && n < parts.length - 1) go(n + 1); }} />
            );
          })}
          <button type="button" className="how-play" onClick={toggle} aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}>
            {playing
              ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
              : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" /></svg>}
          </button>
        </div>
        {/* Os textos dos capítulos ocupam o mesmo lugar, para o pop-up não mudar de altura entre eles. */}
        <div className="how-texts" aria-live="polite">
          {parts.map((s, n) => (
            <div className="how-part" key={s.title} aria-hidden={n !== i}>
              {many && <h3><span>{n + 1} de {parts.length}</span> {s.title}</h3>}
              <p className="how-text">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="how-acts">
          {many && i > 0 && <button type="button" className="btn" onClick={() => go(i - 1)}>Voltar</button>}
          {many && !last
            ? <button type="button" className="btn pri" onClick={() => go(i + 1)}>Próximo</button>
            : <button type="button" className="btn pri" onClick={onClose}>Entendi</button>}
        </div>
      </div>
    </dialog>
  );
}
