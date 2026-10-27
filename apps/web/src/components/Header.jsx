/* Topo: marca à esquerda e conta à direita.
   Sem conta: um botão que diz como se entra ("Entrar com e-mail").
   Com conta: botão com a inicial e o nome, que abre um menu com a conta, os projetos e "Sair". */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../session.jsx';

const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();

function AccountMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false), box = useRef(), nav = useNavigate();
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') { setOpen(false); box.current?.querySelector('.account-btn')?.focus(); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  const go = path => { setOpen(false); nav(path); };
  return (
    <div className="account" ref={box}>
      <button className="account-btn" aria-label={"Conta de " + me.name} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="avatar" aria-hidden="true">{initials(me.name)}</span>
        <span className="account-name">{me.name}</span>
        <span className="chev" aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head"><b>{me.name}</b><span>{me.email}</span></div>
          <button role="menuitem" onClick={() => go('/')}>Meus projetos</button>
          <button role="menuitem" onClick={() => go('/novo')}>Criar projeto</button>
          <div className="menu-sep" role="separator" />
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>Sair</button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { me, logout, config } = useSession(), nav = useNavigate(), loc = useLocation();
  return (
    <header className="top">
      <button className="brand" onClick={() => nav('/')} aria-label="MIP, ir para o início">MIP</button>
      {me ? <AccountMenu me={me} onLogout={async () => { await logout(); nav('/'); }} />
        : me === null && loc.pathname !== '/entrar' && <button className="btn sm" onClick={() => nav('/entrar' + (loc.pathname !== '/' ? '?next=' + encodeURIComponent(loc.pathname) : ''))}>{config.testLogin ? 'Entrar' : 'Entrar com e-mail'}</button>}
    </header>
  );
}
