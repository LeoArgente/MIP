import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { Avatar, Logo } from '../ds/index.js';
import { useSession } from '../../session.jsx';
import checkOk from '../../assets/icons/check-ok.svg';

/* Barra do app: marca, conta (com menu) e, dentro de uma etapa, "‹ Nome do projeto" logo abaixo. */
export function JourneyTopbar({ back }) {
  const { me, logout } = useSession(), nav = useNavigate();
  const [open, setOpen] = useState(false), box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const go = path => { setOpen(false); nav(path); };
  return (
    <header className="jr-top">
      <div className="jr-top-row">
        <Link to="/inicio" aria-label="MIP, ir para o início"><Logo /></Link>
        {me && (
          <div className="jr-account" ref={box}>
            <button type="button" className="jr-account-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
              <Avatar name={me.name} />
              <span className="type-app-caption">{me.name}</span>
              <ChevronDown size={12} strokeWidth={1.6} absoluteStrokeWidth aria-hidden="true" />
            </button>
            {open && (
              <div className="jr-menu" role="menu">
                <div className="jr-menu-head"><b className="type-app-caption">{me.name}</b><span className="type-app-small">{me.email}</span></div>
                <button type="button" role="menuitem" className="type-app-small" onClick={() => go('/inicio')}>Meus projetos</button>
                <button type="button" role="menuitem" className="type-app-small" onClick={() => go('/novo')}>Criar projeto</button>
                {me.admin && <button type="button" role="menuitem" className="type-app-small" onClick={() => go('/admin')}>Ver feedbacks</button>}
                <button type="button" role="menuitem" className="type-app-small" onClick={async () => { setOpen(false); await logout(); nav('/'); }}>Sair da conta</button>
              </div>
            )}
          </div>
        )}
      </div>
      {back && (
        <button type="button" className="jr-back type-app-small" onClick={back.onClick}>
          <ChevronLeft size={12} strokeWidth={1.6} absoluteStrokeWidth aria-hidden="true" />{back.label}
        </button>
      )}
    </header>
  );
}

export function AppFrame({ back, children }) {
  return <div className="jr-page"><JourneyTopbar back={back} />{children}</div>;
}

/* Trilho de passos (esquerda): título, "n de m passos", barra e a lista com feito / agora / depois. */
export function Rail({ title, count, value, total, items }) {
  return (
    <aside className="jr-rail" aria-label={title}>
      <p className="jr-eyebrow type-v2-eyebrow">{title}</p>
      {count && <p className="jr-muted type-app-small">{count}</p>}
      {total > 0 && <div className="jr-progress" role="progressbar" aria-valuemin="0" aria-valuemax={total} aria-valuenow={value}><span style={{ width: (100 * value / total) + '%' }} /></div>}
      <ol className="jr-steps">
        {items.map((it, i) => (
          <li key={it.label} className={'jr-step is-' + (it.state || 'later')} aria-current={it.state === 'now' ? 'step' : undefined}>
            <span className="jr-dot type-app-caption">{it.state === 'done' ? <img src={checkOk} alt="" width="12" height="12" /> : i + 1}</span>
            <span className={it.state === 'now' ? 'type-app-title-3' : 'type-app-body'}>{it.label}</span>
            {it.sub && <span className="jr-muted type-app-small jr-step-sub">{it.sub}</span>}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function Hint({ title = 'Dica', children }) {
  return (
    <aside className="jr-hint">
      <p className="type-v2-eyebrow">{title}</p>
      <p className="type-app-small">{children}</p>
    </aside>
  );
}

/* Corpo com trilho à esquerda, conteúdo no meio e dica à direita. */
export function Wizard({ rail, hint, children, wide = false }) {
  return (
    <main className="jr-body">
      {rail}
      <div className={'jr-main' + (wide ? ' jr-main--wide' : '')}>{children}</div>
      {hint}
    </main>
  );
}

export function StepHead({ eyebrow, title, sub, as: H = 'h1' }) {
  return (
    <header className="jr-head">
      <p className="jr-eyebrow type-v2-eyebrow">{eyebrow}</p>
      <H className="jr-title type-v2-heading-h3">{title}</H>
      {sub && <p className="jr-sub type-v2-body">{sub}</p>}
    </header>
  );
}

/* Barra de ações no fim do passo: o que fica à esquerda e o que fica à direita. */
export function Bar({ left, right }) {
  return <div className="jr-bar"><div className="jr-bar-left">{left}</div><div className="jr-bar-right">{right}</div></div>;
}

export const Panel = ({ strong = false, className = '', children }) => <section className={'jr-panel' + (strong ? ' jr-panel--strong' : '') + ' ' + className}>{children}</section>;
export const PanelHead = ({ title, chip }) => <div className="jr-panel-head"><h2 className="type-app-title-3">{title}</h2>{chip}</div>;
export const TextButton = ({ children, className = '', ...rest }) => <button type="button" className={'jr-link type-app-small ' + className} {...rest}>{children}</button>;
