/* Convite por link (Figma D0 e D1): mostra o projeto e, com a conta aberta, entra na equipe.
   Sem conta: cria a conta pelo link no e-mail (ou nome e e-mail na versão de teste). A senha digitada nunca é lida nem enviada. */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useSession } from '../session.jsx';
import { AppButton, AuthField, Avatar, Checkbox, Logo } from '../components/ds/index.js';
import { Panel } from '../components/journey/Shell.jsx';
import { Banner, useToast } from '../components/ui.jsx';

const PASSOS = [
  ['Entrar com seu e-mail', 'É rápido: só confirmar o endereço do convite.'],
  ['Responder sobre as criações', 'Você pode parar e continuar depois.'],
  ['Confirmar o que a equipe decidir', 'Você aprova ou pede ajuste em cada ponto.']
];

function Top({ right }) {
  return (
    <header className="jr-top">
      <div className="jr-top-row"><Link to="/" aria-label="MIP, página inicial"><Logo /></Link>{right}</div>
    </header>
  );
}

function useConvite() {
  const { code } = useParams(), nav = useNavigate(), say = useToast();
  const [info, setInfo] = useState(null), [err, setErr] = useState({});
  useEffect(() => { get('/api/invite/' + code).then(setInfo).catch(x => setErr(x.err || {})); }, [code]);
  const join = async () => {
    try { const r = await post('/api/invite/' + code + '/join'); say(r.result.notice); nav('/p/' + r.id); } catch (x) { setErr(x.err || {}); }
  };
  return { code, info, err, setErr, join };
}

/* D0: convite recebido */
export default function Invite() {
  const { code, info, err, join } = useConvite(), { me } = useSession(), nav = useNavigate();
  const aceitar = () => (me ? join() : nav(`/convite/${code}/conta`));
  return (
    <div className="jr-page">
      <Top />
      <main className="jr-invite">
        {err._ && !info ? <Banner k="bad">{err._}</Banner> : info && (
          <div className="jr-invite-col">
            <div className="jr-row jr-row--start">
              <span className="jr-avatar-lg"><Avatar name={info.org} /></span>
              <div className="jr-person-text"><span className="type-app-title-3">{info.org} convidou você</span><span className="jr-sec type-app-small">para participar do projeto {info.name}</span></div>
            </div>
            <header className="jr-head">
              <p className="jr-eyebrow type-v2-eyebrow">Convite · leva cerca de 10 minutos</p>
              <h1 className="jr-title type-v2-heading-h3">Vamos registrar juntos quem criou o quê</h1>
              <p className="jr-sub type-v2-body">Você responde algumas perguntas sobre o que fez no projeto. Depois a equipe compara as respostas e decide só o que divergiu.</p>
            </header>
            <Panel><h2 className="type-app-title-3">{info.name}</h2></Panel>
            <section className="jr-stack-lg" aria-labelledby="inv-how">
              <p id="inv-how" className="jr-eyebrow type-v2-eyebrow">O que você vai fazer</p>
              {PASSOS.map(([t, d], i) => (
                <div key={t} className="jr-row jr-row--start jr-row--top">
                  <span className="jr-num jr-num--lg type-app-caption">{i + 1}</span>
                  <div className="jr-person-text jr-grow"><span className="type-app-title-3">{t}</span><span className="jr-sec type-app-small">{d}</span></div>
                </div>
              ))}
            </section>
            <p className="jr-note type-app-small">Suas respostas só aparecem para a equipe depois que todos terminarem. Ninguém vê o que você escreveu antes disso.</p>
            {!info.active ? <Banner k="warn">Este convite não está mais ativo. Peça um novo link a {info.org}.</Banner> : (
              <div className="jr-stack jr-stack--center">
                <AppButton className="jr-block" onClick={aceitar}>Aceitar convite e começar</AppButton>
                <Link to="/" className="jr-link type-app-small">Não reconheço este projeto</Link>
              </div>
            )}
            {(err.link || err._) && <p className="jr-err type-app-small" role="alert">{err.link || err._}</p>}
          </div>
        )}
      </main>
    </div>
  );
}

/* D1: criar conta pelo convite */
export function ConviteConta() {
  const { code, info, err, setErr, join } = useConvite(), { config, setMe } = useSession();
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [termos, setTermos] = useState(false);
  const [busy, setBusy] = useState(false), [sent, setSent] = useState(null);
  const submit = async e => {
    e.preventDefault(); setErr({});
    if (!termos) { setErr({ _: 'Aceite os termos de uso e a política de privacidade para continuar.' }); return; }
    setBusy(true);
    try {
      if (config.testLogin) { setMe(await post('/api/auth/test-login', { name: name.trim(), email })); await join(); }
      else setSent(await post('/api/auth/request', { email, name: name.trim(), next: '/convite/' + code }));
    } catch (x) { setErr(x.err || {}); }
    setBusy(false);
  };
  const right = <span className="jr-row type-app-small"><span className="jr-muted">Já tem conta?</span><Link to={'/entrar?next=' + encodeURIComponent('/convite/' + code)} className="jr-link">Entrar</Link></span>;
  return (
    <div className="jr-page">
      <Top right={right} />
      <main className="jr-invite jr-invite--form">
        {sent ? (
          <div className="jr-invite-col jr-invite-col--form">
            <header className="jr-head"><p className="jr-eyebrow type-v2-eyebrow">Seu acesso</p><h1 className="jr-title jr-title--q type-app-title">Confira seu e-mail</h1><p className="jr-sub type-v2-body">Enviamos um link de acesso para <b>{email}</b>. Ele vale por 30 minutos e funciona uma vez.</p></header>
            {sent.devLink && <Banner action={<AppButton kind="small" href={sent.devLink}>Entrar agora</AppButton>}>Ambiente de teste: o e-mail não foi enviado.</Banner>}
            <AppButton kind="secondary" onClick={() => setSent(null)}>Usar outro e-mail</AppButton>
          </div>
        ) : (
          <form className="jr-invite-col jr-invite-col--form" onSubmit={submit} noValidate>
            <header className="jr-head">
              <p className="jr-eyebrow type-v2-eyebrow">Seu acesso</p>
              <h1 className="jr-title jr-title--q type-app-title">Crie sua conta para entrar no {info?.name || 'projeto'}</h1>
              <p className="jr-sub type-v2-body">Informe seu nome e e-mail. Enviamos um link para você entrar, sem senha.</p>
            </header>
            <div className="jr-fields">
              <AuthField label="Seu nome" type="text" autoComplete="name" value={name} onChange={e => { setName(e.target.value); setErr({}); }} />
              {err.name && <p className="jr-err type-app-small" role="alert">{err.name}</p>}
              <AuthField label="Seu e-mail" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} placeholder="voce@exemplo.com" value={email} onChange={e => { setEmail(e.target.value); setErr({}); }} />
              {err.email && <p className="jr-err type-app-small" role="alert">{err.email}</p>}
              <Checkbox label="Li e aceito os termos de uso e a política de privacidade" checked={termos} onChange={e => { setTermos(e.target.checked); setErr({}); }} />
            </div>
            {err._ && <p className="jr-err type-app-small" role="alert">{err._}</p>}
            <AppButton type="submit" className="jr-block" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link de acesso'}</AppButton>
            <p className="jr-center type-app-small">Sem senha: você entra pelo link enviado ao seu e-mail.</p>
          </form>
        )}
      </main>
    </div>
  );
}
