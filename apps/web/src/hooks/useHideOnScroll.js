import { useEffect, useState } from 'react';

const TOP = 80, STEP = 8;

/* Esconde o cabeçalho ao rolar para baixo e mostra ao rolar para cima.
   Fica sempre visível perto do topo, com o menu aberto (lock), com foco dentro dele ou com um modal aberto. */
export default function useHideOnScroll(ref, lock = false) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY, frame = 0;
    const blocked = () => lock || ref.current?.contains(document.activeElement) || !!document.querySelector('dialog[open], [aria-modal="true"]:not([aria-hidden="true"])');
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < TOP || blocked()) { setHidden(false); last = y; return; }
      if (Math.abs(y - last) < STEP) return;
      setHidden(y > last);
      last = y;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const show = () => setHidden(false);
    const node = ref.current;
    window.addEventListener('scroll', onScroll, { passive: true });
    node?.addEventListener('focusin', show);
    update();
    return () => { window.removeEventListener('scroll', onScroll); node?.removeEventListener('focusin', show); if (frame) cancelAnimationFrame(frame); };
  }, [ref, lock]);

  return hidden && !lock;
}
