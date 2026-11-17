import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo.jsx';
import Button from './Button.jsx';
import { NavItem } from './Links.jsx';
import useHideOnScroll from '../../hooks/useHideOnScroll.js';

const ITEMS = [
  ['/sobre', 'Sobre a MIP'],
  ['/proposito', 'Propósito'],
  ['/equipe', 'Equipe'],
  ['/contato', 'Contato']
];

/* Header "liquid glass" fixo. No celular, o menu desliza da direita. */
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const burger = useRef(null), close = useRef(null), bar = useRef(null);
  const hidden = useHideOnScroll(bar, open);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); burger.current?.focus(); } };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    close.current?.focus();
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header ref={bar} className={'ds-header' + (hidden ? ' is-hidden' : '')}>
      <div className="ds-header-bar">
        <Link to="/" aria-label="MIP, página inicial"><Logo /></Link>
        <nav className="ds-header-nav" aria-label="Principal">
          {ITEMS.map(([to, label]) => <NavItem key={to} to={to}>{label}</NavItem>)}
        </nav>
        <Button to="/entrar" cta className="ds-header-cta">ENTRAR</Button>
        <button ref={burger} type="button" className="ds-burger" aria-label="Abrir menu" aria-expanded={open} aria-controls="ds-menu" onClick={() => setOpen(true)}>
          <Menu size={28} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <div id="ds-menu" className={'ds-menu' + (open ? ' is-open' : '')} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
        <div className="ds-menu-top">
          <Logo />
          <button ref={close} type="button" className="ds-burger" aria-label="Fechar menu" onClick={() => { setOpen(false); burger.current?.focus(); }}>
            <X size={24} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        <nav className="ds-menu-items" aria-label="Menu">
          {ITEMS.map(([to, label]) => <Link key={to} to={to} className="ds-menu-item type-v2-heading-h3-mobile">{label}</Link>)}
        </nav>
        <Button to="/entrar" block>Entrar</Button>
      </div>
    </header>
  );
}
