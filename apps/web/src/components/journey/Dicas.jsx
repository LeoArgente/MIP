/* Dicas contextuais (Figma K1 a K3 e R1 e R2): um cartão ao lado de cada parte da tela, na primeira vez.
   O que já foi visto fica guardado neste navegador (só uma conveniência: sem ele, as dicas aparecem de novo). */
import { useEffect, useLayoutEffect, useState } from 'react';
import { AppButton } from '../ds/index.js';
import { TextButton } from './Shell.jsx';

const KEY = id => 'mip.dicas.' + id;
const visto = id => { try { return !!localStorage.getItem(KEY(id)); } catch { return false; } };
const marcar = id => { try { localStorage.setItem(KEY(id), '1'); } catch { /* sem armazenamento */ } };

export const DICAS_PAINEL = [
  { sel: '.jr-fases', onde: 'abaixo', title: 'Aqui você vê em que fase está', text: 'O projeto tem 5 fases. A marcada em branco é onde vocês estão agora e as verdes já foram concluídas.' },
  { sel: '.jr-next', onde: 'abaixo', title: 'Sempre existe um próximo passo', text: 'Esta caixa mostra a única coisa que você precisa fazer agora. Se não souber por onde ir, comece por ela.' },
  { sel: '.jr-two > :first-child', onde: 'abaixo', title: 'Acompanhe sua equipe', text: 'Veja quem já respondeu. Você só vê o andamento: as respostas de cada pessoa ficam privadas até o fim.' }
];
export const DICAS_RESPONDER = [
  { sel: '.jr-rail--q', onde: 'direita', title: 'Você sempre sabe onde está', text: 'Aqui aparecem as partes que você vai responder e o quanto já andou. As concluídas ficam marcadas em verde.' },
  { sel: '.jr-top--q .ds-app-btn', onde: 'abaixo-fim', title: 'Pode parar quando quiser', text: 'Suas respostas são salvas sozinhas. Toque em Salvar e sair e continue depois, de onde parou.' }
];

/* Rótulos do último passo de cada sequência (como no Figma). */
const FIM = { painel: 'Entendi', responder: 'Entendi, vamos lá' };

export default function Dicas({ id, passos }) {
  const [i, setI] = useState(-1), [pos, setPos] = useState(null);
  useEffect(() => {
    if (visto(id)) return undefined;
    const t = setTimeout(() => setI(0), 700);
    return () => clearTimeout(t);
  }, [id]);

  const alvo = i >= 0 ? document.querySelector(passos[i].sel) : null;
  useLayoutEffect(() => {
    if (!alvo) { setPos(null); return undefined; }
    alvo.scrollIntoView({ block: 'center', behavior: 'instant' });
    const calc = () => {
      const r = alvo.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 32), o = passos[i].onde;
      let left = o === 'direita' ? r.right + 24 : o === 'abaixo-fim' ? r.right - w : r.left, top = o === 'direita' ? r.top : r.bottom + 16;
      if (o === 'direita' && left + w > window.innerWidth - 16) { left = r.left; top = r.bottom + 16; }
      setPos({ left: Math.max(16, Math.min(left, window.innerWidth - w - 16)), top: Math.max(16, Math.min(top, window.innerHeight - 220)), w });
    };
    calc();
    window.addEventListener('resize', calc); window.addEventListener('scroll', calc, { passive: true });
    alvo.classList.add('is-dica');
    return () => { window.removeEventListener('resize', calc); window.removeEventListener('scroll', calc); alvo.classList.remove('is-dica'); };
  }, [alvo, i, passos]);

  const fechar = () => { marcar(id); setI(-1); };
  if (i < 0 || !pos) return null;
  const ultimo = i === passos.length - 1, p = passos[i];
  return (
    <aside className="jr-dica" role="dialog" aria-label={`Dica ${i + 1} de ${passos.length}`} style={{ left: pos.left, top: pos.top, width: pos.w }}>
      <div className="jr-row">
        <p className="jr-eyebrow type-v2-eyebrow">Dica {i + 1} de {passos.length}</p>
        {!ultimo && <TextButton onClick={fechar}>Pular</TextButton>}
      </div>
      <h2 className="type-app-title-3">{p.title}</h2>
      <p className="jr-sec type-app-small">{p.text}</p>
      <div className="jr-row">
        <span className="jr-dica-dots" aria-hidden="true">{passos.map((_, k) => <span key={k} className={k === i ? 'is-now' : k < i ? 'is-past' : ''} />)}</span>
        <AppButton onClick={() => (ultimo ? fechar() : setI(i + 1))}>{ultimo ? FIM[id] : 'Próxima'}</AppButton>
      </div>
    </aside>
  );
}
