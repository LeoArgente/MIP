/* Entrar com e-mail: a pessoa recebe um link de acesso (sem senha).
   Depois do envio, a tela diz para onde foi, quanto tempo vale e o que fazer se não chegar. */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSession } from '../session.jsx';
import TestLogin from '../components/TestLogin.jsx';
import { post } from '../api.js';
import Header from '../components/Header.jsx';
import { Btn, Err, Banner } from '../components/ui.jsx';

const WAIT = 30;

export default function Login() {
  const [q] = useSearchParams(), next = q.get('next') || '/', { config } = useSession(), nav = useNavigate();
  const [email, setEmail] = useState(''), [err, setErr] = useState({}), [sent, setSent] = useState(null), [busy, setBusy] = useState(false), [wait, setWait] = useState(0);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const request = async () => {
    setBusy(true); setErr({});
    try { setSent(await post('/api/auth/request', { email, next })); setWait(WAIT); } catch (x) { setErr(x.err); }
    setBusy(false);
  };
  const submit = e => { e.preventDefault(); request(); };
  if (config.testLogin) return (
    <>
      <Header />
      <main className="onboarding auth">
        <div><h1>Entrar</h1><p>Digite seu nome e e-mail. Se você foi convidado, use o mesmo e-mail do convite.</p></div>
        <TestLogin label="Entrar" onDone={() => nav(next, { replace: true })} />
      </main>
    </>
  );
  return (
    <>
      <Header />
      <main className="onboarding auth">
        {sent ? (
          <>
            <div className="auth-icon" aria-hidden="true">✉</div>
            <div><h1>Confira seu e-mail</h1><p>Enviamos um link de acesso para <b className="ink">{email}</b>. Ele vale por 30 minutos e funciona uma vez.</p></div>
            {sent.devLink && <Banner action={<a className="btn sm" href={sent.devLink}>Entrar agora</a>}>Ambiente de teste: o e-mail não foi enviado.</Banner>}
            <div className="form">
              <p className="title">Não chegou?</p>
              <ul className="auth-tips">
                <li>Procure por “MIP” na caixa de spam ou promoções.</li>
                <li>Confira se o endereço acima está certo.</li>
              </ul>
              <Err msg={err.email || err._} />
              <div className="acts">
                <Btn kind="pri" onClick={request} disabled={busy || wait > 0}>{wait > 0 ? `Reenviar link em ${wait} s` : 'Reenviar link'}</Btn>
                <Btn onClick={() => { setSent(null); setErr({}); }}>Usar outro e-mail</Btn>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <h1>Entrar com e-mail</h1>
              <p>Sem senha: enviamos um link de acesso para o seu e-mail. Se você foi convidado, use o mesmo e-mail do convite.</p>
            </div>
            {q.get('expirado') && <Banner k="warn">Este link expirou ou já foi usado. Peça um novo abaixo.</Banner>}
            <form onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="email">E-mail</label>
                <input id="email" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={email} onChange={e => { setEmail(e.target.value); setErr({}); }} placeholder="nome@email.com" autoFocus />
                <Err msg={err.email || err._} />
              </div>
              <button className="btn pri block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link de acesso'}</button>
              <p className="muted small">Com a conta, você vê só os projetos em que participa. Suas respostas continuam em particular.</p>
            </form>
          </>
        )}
      </main>
    </>
  );
}
