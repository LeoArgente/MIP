/* Topo: marca à esquerda e conta à direita, em todas as telas. Dentro de uma etapa do projeto,
   "‹ Nome do projeto" aparece logo abaixo, para voltar à página do projeto.
   Sem conta: um botão que diz como se entra ("Entrar com e-mail").
   Com conta: botão com a inicial e o nome, que abre um menu com a conta, os projetos e "Sair da conta". */
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../session.jsx';
import { initials } from './ui.jsx';
import { useTutorial } from './Tutorial.jsx';
/* Logo como SVG no próprio HTML: usa a cor do texto (currentColor), então acompanha o tema claro e o escuro. */
import logo from '../assets/logo/mip.svg?raw';

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
          {me.admin && <button role="menuitem" onClick={() => go('/admin')}>Ver feedbacks</button>}
          <div className="menu-sep" role="separator" />
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>Sair da conta</button>
        </div>
      )}
    </div>
  );
}

/* Botão "?" do topo: abre a ajuda da tela, quando ela tem uma (onHelp; por exemplo, o vídeo da página do projeto);
   nas outras, o tutorial de primeiro uso. */
function HelpButton({ onHelp }) {
  const tutorial = useTutorial(), label = onHelp ? 'Como funciona esta página' : 'Ver tutorial';
  return (
    <button type="button" className="help-btn" onClick={onHelp || tutorial} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
        <circle cx="12" cy="17" r=".6" fill="currentColor" strokeWidth="1.6" />
      </svg>
    </button>
  );
}

export default function Header({ back, onHelp }) {
  const { me, logout, config } = useSession(), nav = useNavigate(), loc = useLocation();
  return (
    <header className="top">
      <div className="top-row">
        <button className="brand" onClick={() => nav('/')} aria-label="MIP, ir para o início"><span className="brand-logo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: logo }} /></button>
        <div className="top-actions">
          <HelpButton onHelp={onHelp} />
          {me ? <AccountMenu me={me} onLogout={async () => { await logout(); nav('/'); }} />
            : me === null && loc.pathname !== '/entrar' && <button className="btn sm" onClick={() => nav('/entrar' + (loc.pathname !== '/' ? '?next=' + encodeURIComponent(loc.pathname) : ''))}>{config.testLogin ? 'Entrar' : 'Entrar com e-mail'}</button>}
        </div>
      </div>
      {back && <button className="back-btn" onClick={back.onClick}>‹ {back.label}</button>}
    </header>
  );
}
