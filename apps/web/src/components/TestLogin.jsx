/* Entrada da versão de teste: nome e e-mail, sem confirmação por e-mail. */
import { useState } from 'react';
import { post } from '../api.js';
import { useSession } from '../session.jsx';
import { Err } from './ui.jsx';

export default function TestLogin({ label = 'Entrar', onDone }) {
  const { setMe } = useSession();
  const [f, setF] = useState({ name: '', email: '' }), [err, setErr] = useState({}), [busy, setBusy] = useState(false);
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({}); };
  const submit = async e => {
    e.preventDefault(); setBusy(true);
    try { const me = await post('/api/auth/test-login', f); setMe(me); await onDone?.(me); } catch (x) { setErr(x.err); setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate>
      <div className="field">
        <label htmlFor="tname">Seu nome</label>
        <input id="tname" type="text" autoComplete="name" value={f.name} onChange={set('name')} placeholder="Como a equipe conhece você?" autoFocus />
        <Err msg={err.name} />
      </div>
      <div className="field">
        <label htmlFor="temail">E-mail</label>
        <input id="temail" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} value={f.email} onChange={set('email')} placeholder="nome@email.com" />
        <Err msg={err.email || err._} />
      </div>
      <button className="btn pri block" disabled={busy}>{busy ? 'Entrando…' : label}</button>
      <p className="muted small">Versão de teste: não enviamos e-mail de confirmação. Use sempre o mesmo e-mail para voltar aos seus projetos.</p>
    </form>
  );
}
