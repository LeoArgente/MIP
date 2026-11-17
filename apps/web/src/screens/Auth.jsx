/* Entrar e Criar conta (Figma: Autenticação). O acesso continua pelo link enviado ao e-mail (ou, na versão de teste, só nome e e-mail).
   A senha aparece como no Figma, mas nunca é lida, enviada, guardada nem registrada: o campo só existe na tela.
   Pendente de decisão de back-end: senha e entrada com Google/Apple (botões só visuais). */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthField, AuthTabs, Button, Checkbox, Field, LinkDash, Logo, SocialButton } from '../components/ds/index.js';
import { Banner, Err } from '../components/ui.jsx';
import { useSession } from '../session.jsx';
import { post } from '../api.js';
import marca from '../assets/img/auth-marca.webp';

const WAIT = 30;
const BENEFICIOS = ['Clareza sobre quem contribuiu', 'Organização para a sua equipe', 'Decisões documentadas em um só lugar'];

/* Força da senha: só devolve de 0 a 4; o texto digitado não fica guardado em lugar nenhum. */
const strength = v => (!v ? 0 : Math.min(4, (v.length >= 8) + /[a-z]/i.test(v) + /\d/.test(v) + (v.length >= 12 || /[^\w\s]/.test(v))));
const LEVEL = ['', 'fraca', 'média', 'boa', 'forte'];

function Overlay({ title, text, onClose }) {
  const box = useRef(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="site-overlay" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="site-popup site-popup--card" role="dialog" aria-modal="true" aria-labelledby="auth-done-title" onClick={e => e.stopPropagation()}>
        <h2 id="auth-done-title" className="site-popup-title type-v2-heading-h3">{title}</h2>
        <p className="site-popup-text type-v2-body">{text}</p>
        <button type="button" className="site-popup-close" onClick={onClose}><LinkDash>Fechar</LinkDash></button>
      </div>
    </div>
  );
}

export default function Auth({ mode }) {
  const signup = mode === 'criar';
  const [q] = useSearchParams(), next = q.get('next') || '/inicio', nav = useNavigate();
  const { config, loadConfig, refresh, setMe } = useSession();
  const [email, setEmail] = useState(''), [name, setName] = useState(''), [needName, setNeedName] = useState(false);
  const [err, setErr] = useState({}), [busy, setBusy] = useState(false), [sent, setSent] = useState(null), [wait, setWait] = useState(0);
  const [show, setShow] = useState(false), [score, setScore] = useState(0), [done, setDone] = useState(false);

  useEffect(() => { if (!wait) return undefined; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  useEffect(() => { setErr({}); setSent(null); setNeedName(false); setScore(0); setShow(false); }, [mode]);

  /* Entrada: versão de teste (nome e e-mail) ou link no e-mail. */
  const request = async () => {
    setBusy(true); setErr({});
    try {
      if (config.testLogin) {
        const me = await post('/api/auth/test-login', { name: name.trim(), email });
        setMe(me);
        if (signup) setDone(true); else nav(next, { replace: true });
      } else {
        setSent(await post('/api/auth/request', { email, name: signup ? name.trim() : '', next }));
        setWait(WAIT);
        if (signup) setDone(true);
      }
    } catch (x) {
      setErr(x.err || {});
      if (!signup && x.err?.name) setNeedName(true);
    }
    setBusy(false);
  };
  const submit = e => { e.preventDefault(); request(); };
  const closeDone = () => { setDone(false); if (config.testLogin) nav(next, { replace: true }); };

  const page = (
    <main className="auth-page">
      <section className="auth-brand" aria-label="MIP">
        <img className="auth-brand-img" src={marca} alt="" decoding="async" />
        <div className="auth-brand-shade" aria-hidden="true" />
        <Link to="/" aria-label="MIP, página inicial" className="auth-logo"><Logo /></Link>
        <div className="auth-brand-msg">
          <h2 className="type-v2-heading-h2">Organizem o que vocês criam.</h2>
          {BENEFICIOS.map(b => <p key={b} className="auth-benefit type-v2-body-small">{b}</p>)}
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-top"><Link to="/" aria-label="MIP, página inicial" className="auth-top-logo"><Logo /></Link><Link to="/" className="auth-back type-v2-body-small">← Voltar ao site</Link></div>

        <div className="auth-form-wrap">
          {!config.loaded ? null : config.failed ? (
            <div className="auth-state">
              <h1 className="auth-title type-v2-heading-h3">Entrar</h1>
              <p className="auth-sub type-v2-body">Não foi possível falar com o servidor da MIP. Verifique a conexão e tente de novo.</p>
              <Button variant="fill" onClick={() => { refresh(); loadConfig(); }}>Tentar de novo</Button>
            </div>
          ) : sent ? (
            <div className="auth-state">
              <h1 className="auth-title type-v2-heading-h3">Confira seu e-mail</h1>
              <p className="auth-sub type-v2-body">Enviamos um link de acesso para <b>{email}</b>. Ele vale por 30 minutos e funciona uma vez.</p>
              {sent.devLink && <Banner action={<a className="ds-app-btn ds-app-btn--small type-app-button" href={sent.devLink}>Entrar agora</a>}>Ambiente de teste: o e-mail não foi enviado.</Banner>}
              <ul className="auth-tips type-v2-body-small">
                <li>Procure por “MIP” na caixa de spam ou promoções.</li>
                <li>Confira se o endereço acima está certo.</li>
              </ul>
              <Err msg={err.email || err._} />
              <div className="auth-acts">
                <Button variant="fill" onClick={request} disabled={busy || wait > 0}>{wait > 0 ? `Reenviar link em ${wait} s` : 'Reenviar link'}</Button>
                <Button onClick={() => { setSent(null); setErr({}); }}>Usar outro e-mail</Button>
              </div>
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit} noValidate>
              <header className="auth-head">
                <h1 className="auth-title type-v2-heading-h3">{signup ? 'Comece sua jornada' : 'Bem-vindo de volta'}</h1>
                <p className="auth-sub type-v2-body">{signup ? 'Crie sua conta para registrar e organizar seus ativos com clareza.' : 'Entre para acompanhar seus registros e a sua equipe.'}</p>
              </header>
              <AuthTabs active={signup ? 'criar' : 'entrar'} />
              {q.get('expirado') && <Banner k="warn">Este link expirou ou já foi usado. Peça um novo abaixo.</Banner>}

              {(signup || needName) && <AuthField label={signup ? 'Nome completo' : 'Seu nome'} type="text" autoComplete="name" placeholder={signup ? 'Seu nome' : 'Como a equipe conhece você?'} value={name} onChange={e => { setName(e.target.value); setErr({}); }} />}
              {(signup || needName) && <Err msg={err.name} />}
              <AuthField label="E-mail" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" value={email} onChange={e => { setEmail(e.target.value); setErr({}); }} />
              <Err msg={err.email || err._} />
              <AuthField label="Senha" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'Crie uma senha' : 'Digite sua senha'}
                onInput={signup ? e => setScore(strength(e.target.value)) : undefined}
                action={show ? 'Ocultar' : 'Mostrar'} onAction={() => setShow(v => !v)} actionPressed={show} />

              {signup && (
                <div className="auth-strength" aria-live="polite">
                  <div className="auth-bars" aria-hidden="true">{[1, 2, 3, 4].map(n => <span key={n} className={'auth-bar' + (n <= score ? ' is-on' : '')} />)}</div>
                  <p className="type-v2-body-small">{score ? `Força da senha: ${LEVEL[score]}. ` : ''}Use 8 ou mais caracteres, com letras e números.</p>
                </div>
              )}
              {signup && (
                <div className="ds-auth-field">
                  <label htmlFor="auth-tipo" className="ds-auth-label type-v2-caption">Tipo de projeto</label>
                  <div className="ds-auth-box"><Field as="select" id="auth-tipo" className="auth-select" defaultValue=""><option value="">Selecione o tipo de projeto</option></Field></div>
                </div>
              )}

              {signup ? (
                <Checkbox label="Li e aceito os Termos de Uso e a Política de Privacidade" required />
              ) : (
                <div className="auth-options">
                  <Checkbox label="Lembrar de mim" />
                  <button type="button" className="auth-forgot type-v2-body-small">Esqueci minha senha</button>
                </div>
              )}

              <Button variant="fill" block type="submit" disabled={busy}>{busy ? 'Enviando…' : signup ? 'Criar conta' : 'Entrar'}</Button>

              <div className="auth-divider type-v2-caption"><span />{signup ? 'ou cadastre-se com' : 'ou continue com'}<span /></div>
              <div className="auth-social"><SocialButton initial="G" label="Google" /><SocialButton initial="A" label="Apple" /></div>
              <p className="auth-switch type-v2-body-small">
                <span>{signup ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}</span>
                <Link to={(signup ? '/entrar' : '/criar-conta') + (q.get('next') ? '?next=' + encodeURIComponent(q.get('next')) : '')}>{signup ? 'Entrar' : 'Criar conta'}</Link>
              </p>
            </form>
          )}
        </div>

        <footer className="auth-legal type-v2-caption"><span>Termos de uso</span><span>Política de privacidade</span></footer>
      </section>
    </main>
  );
  return (
    <>
      {page}
      {done && <Overlay title="Tudo certo!" text="Em breve você acessa o seu painel da MIP por aqui." onClose={closeDone} />}
    </>
  );
}
