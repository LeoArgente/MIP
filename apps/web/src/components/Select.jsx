/* Lista de escolha (botão que abre opções): o mesmo visual em todos os navegadores, no lugar do <select> nativo.
   Teclado: ↓, ↑, Enter ou Espaço abrem; setas, Home e End movem; Enter escolhe; Esc fecha; digitar uma letra pula
   para a opção que começa com ela. Um clique fora fecha. */
import { useEffect, useId, useRef, useState } from 'react';

const Chevron = () => <svg className="select-chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Check = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

/* options: [{ value, label, count? }] */
export default function Select({ value, onChange, options, label }) {
  const [open, setOpen] = useState(false), [act, setAct] = useState(0), box = useRef(), btn = useRef(), list = useRef(), id = useId();
  const cur = Math.max(0, options.findIndex(o => o.value === value)), sel = options[cur];
  const show = () => { setAct(cur); setOpen(true); };
  const close = () => { setOpen(false); btn.current?.focus(); };
  const choose = i => { onChange(options[i].value); close(); };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const out = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', out);
    return () => document.removeEventListener('pointerdown', out);
  }, [open]);
  useEffect(() => { if (open) list.current?.querySelector('[data-i="' + act + '"]')?.scrollIntoView({ block: 'nearest' }); }, [open, act]);

  const onBtnKey = e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); show(); } };
  const onListKey = e => {
    const n = options.length, k = e.key;
    if (k === 'Tab') { setOpen(false); return; }
    if (k === 'ArrowDown') setAct(i => Math.min(n - 1, i + 1));
    else if (k === 'ArrowUp') setAct(i => Math.max(0, i - 1));
    else if (k === 'Home') setAct(0);
    else if (k === 'End') setAct(n - 1);
    else if (k === 'Enter' || k === ' ') choose(act);
    else if (k === 'Escape') close();
    else if (k.length === 1) {
      const starts = o => o.label.toLowerCase().startsWith(k.toLowerCase());
      const after = options.findIndex((o, i) => i > act && starts(o)), j = after >= 0 ? after : options.findIndex(starts);
      if (j >= 0) setAct(j);
    } else return;
    e.preventDefault();
  };

  return (
    <div className="select" ref={box}>
      <button type="button" ref={btn} className="select-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label + ': ' + sel.label} onClick={() => (open ? close() : show())} onKeyDown={onBtnKey}>
        <span className="select-val">{sel.label}</span>
        {sel.count != null && <span className="select-n">{sel.count}</span>}
        <Chevron />
      </button>
      {open && (
        <ul ref={list} className="select-list" role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={id + '-' + act} onKeyDown={onListKey}>
          {options.map((o, i) => (
            <li key={o.value} id={id + '-' + i} data-i={i} role="option" aria-selected={i === cur} className={i === act ? 'on' : undefined} onPointerMove={() => act !== i && setAct(i)} onClick={() => choose(i)}>
              <span className="select-check">{i === cur && <Check />}</span>
              <span className="select-label">{o.label}</span>
              {o.count != null && <span className="select-n">{o.count}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
