/* Peças de interface usadas em todas as telas. */
import { createContext, useCallback, useContext, useRef, useState } from 'react';

export const Chip = ({ children, k }) => <span className={'chip ' + (k || '')}>{children}</span>;
export const Banner = ({ children, k, action }) => <div className={'banner ' + (k || '')} role={k === 'bad' ? 'alert' : undefined}><span>{children}</span>{action}</div>;
export const Err = ({ msg }) => (msg ? <div className="err" role="alert">{msg}</div> : null);
export const Head = ({ title, sub }) => <div className="head"><h2>{title}</h2>{sub && <p>{sub}</p>}</div>;
/* Ação do projeto em andamento (nome da ação ou null). Enquanto houver uma, os botões ficam desativados
   e o que foi clicado mostra o indicador com o que está acontecendo ("Enviando…"). */
export const BusyCtx = createContext(null);
export function Btn({ kind = '', children, onClick, disabled, busyLabel, ...rest }) {
  const busy = useContext(BusyCtx), [mine, setMine] = useState(false), ref = useRef(), width = useRef();
  const click = e => {
    const r = onClick?.(e);
    if (r && typeof r.then === 'function') {
      width.current = ref.current?.offsetWidth;
      setMine(true);
      r.finally(() => setMine(false));
    }
  };
  const on = mine && !!busy;
  return (
    <button ref={ref} type="button" className={'btn ' + kind} onClick={click} disabled={disabled || !!busy} aria-busy={on || undefined} style={on && width.current ? { minWidth: width.current } : undefined} {...rest}>
      {on && <span className="spin" aria-hidden="true" />}
      {on ? busyLabel || busy.label : children}
    </button>
  );
}
export function Progress({ value }) {
  return <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: value + '%' }} /></div>;
}
/* Barra de ações no fim do cartão principal. */
export function ActionBar({ note, k, children }) {
  if (!note && !children) return null;
  return <div className={'actionbar ' + (k || '')}>{note && <p className="note">{note}</p>}{children && <div className="acts">{children}</div>}</div>;
}

/* Mensagens rápidas que somem sozinhas. */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [t, setT] = useState(null), timer = useRef();
  const say = useCallback((text, kind) => {
    if (!text) return;
    setT({ text, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={say}>
      {children}
      <div className="toast" aria-live="polite">{t && <div className={t.kind || ''}>{t.text}</div>}</div>
    </ToastCtx.Provider>
  );
}

/* Copia texto. A área de transferência moderna só existe em HTTPS ou localhost;
   no endereço da rede local (http://192.168...), usa o método antigo. */
export async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch { /* tenta o método antigo */ }
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}
