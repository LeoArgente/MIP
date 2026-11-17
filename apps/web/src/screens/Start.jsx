/* Início (Figma C0): "Como você quer começar?" — criar um projeto ou entrar por um convite.
   Na primeira vez aparece o tutorial (T1–T4). Quem já tem projetos vê a lista logo abaixo. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppButton, AuthField, Chip } from '../components/ds/index.js';
import { AppFrame, Panel, PanelHead, TextButton } from '../components/journey/Shell.jsx';
import Tutorial from '../components/journey/Tutorial.jsx';
import { get } from '../api.js';
import { useSession } from '../session.jsx';
import marca from '../assets/img/auth-marca.webp';
import checkOk from '../assets/icons/check-ok.svg';

const PASSOS = ['Dar nome ao projeto', 'Convidar a equipe', 'Listar o que criaram'];
const COMO = [
  ['Cada pessoa responde em particular', 'Ninguém vê suas respostas até o fim. Sem pressão e sem influência.'],
  ['A equipe conversa só sobre o que diverge', 'O que todos concordaram já fica combinado. Só falta decidir o resto.'],
  ['Todos confirmam e vira um documento', 'Um registro do acordo para a equipe guardar e usar em uma formalização futura.']
];

export default function Start() {
  const { me, update } = useSession(), nav = useNavigate();
  const [mine, setMine] = useState([]), [tut, setTut] = useState(false), [link, setLink] = useState(''), [err, setErr] = useState('');
  useEffect(() => { get('/api/projects').then(setMine).catch(() => setMine([])); }, []);
  useEffect(() => { if (me && !me.seenWelcome) setTut(true); }, [me]);

  const seen = async () => { setTut(false); if (me && !me.seenWelcome) await update({ seenWelcome: true }).catch(() => {}); };
  const startFromTutorial = async () => { await seen(); nav('/novo'); };
  /* Aceita o link inteiro ou só o código do convite. */
  const enter = e => {
    e.preventDefault();
    const m = link.trim().match(/convite\/([\w-]+)/i) || link.trim().match(/^([\w-]{4,})$/);
    if (!m) { setErr('Esse link de convite não parece certo.'); return; }
    nav('/convite/' + m[1]);
  };
  const first = (me?.name || '').split(' ')[0];

  return (
    <AppFrame>
      <main className="jr-start">
        <div className="jr-start-col">
          <section className="jr-welcome" aria-labelledby="start-title">
            <img className="jr-welcome-img" src={marca} alt="" decoding="async" />
            <div className="jr-welcome-shade" aria-hidden="true" />
            <p className="jr-eyebrow type-v2-eyebrow">Boas-vindas, {first}</p>
            <h1 id="start-title" className="jr-title type-v2-heading-h3">Como você quer começar?</h1>
            <p className="jr-sub type-v2-body">Em poucos minutos sua equipe terá um acordo claro sobre quem é dono do quê.</p>
            <TextButton onClick={() => setTut(true)}>Ver o tutorial de novo</TextButton>
          </section>

          <div className="jr-options">
            <section className="jr-option jr-option--main" aria-labelledby="opt-new">
              <div className="jr-row"><span className="jr-circle type-app-title-2" aria-hidden="true">+</span><Chip tone="accent">Recomendado para quem organiza</Chip></div>
              <h2 id="opt-new" className="type-app-title-2">Criar um projeto</h2>
              <p className="type-v2-body">Você organiza, convida a equipe e registra o acordo. Leva cerca de 5 minutos para preparar e não precisa terminar de uma vez.</p>
              <ul className="jr-checks">{PASSOS.map(t => <li key={t} className="jr-check type-app-small"><span className="jr-check-dot"><img src={checkOk} alt="" width="12" height="12" /></span>{t}</li>)}</ul>
              <AppButton to="/novo" className="jr-block">Criar meu projeto</AppButton>
            </section>
            <form className="jr-option" aria-labelledby="opt-invite" onSubmit={enter} noValidate>
              <div className="jr-row"><span className="jr-circle type-app-title-2" aria-hidden="true">↗</span></div>
              <h2 id="opt-invite" className="type-app-title-2">Tenho um convite</h2>
              <p className="type-v2-body">Alguém da sua equipe mandou um link? Cole aqui e entre no projeto para responder.</p>
              <AuthField label="Link do convite" placeholder="mip.app/convite/…" value={link} onChange={e => { setLink(e.target.value); setErr(''); }} />
              {err && <p className="jr-err type-app-small" role="alert">{err}</p>}
              <AppButton kind="secondary" type="submit" className="jr-block">Entrar no projeto</AppButton>
            </form>
          </div>

          {mine.length > 0 && (
            <Panel>
              <PanelHead title="Seus projetos" chip={<Chip tone="accent">{mine.length}</Chip>} />
              {mine.map(p => (
                <div key={p.id} className="jr-row">
                  <Link to={'/p/' + p.id} className="type-app-title-3 jr-plain">{p.name}</Link>
                  <AppButton kind="small" to={'/p/' + p.id}>Abrir</AppButton>
                </div>
              ))}
            </Panel>
          )}

          <section className="jr-how" aria-labelledby="how-title">
            <h2 id="how-title" className="jr-eyebrow type-v2-eyebrow">Como a MIP funciona</h2>
            <ol className="jr-how-steps">
              {COMO.map(([t, d], i) => (
                <li key={t} className="jr-how-step">
                  <div className="jr-how-num"><span className="type-app-caption">{i + 1}</span><span /></div>
                  <p className="type-app-title-3">{t}</p>
                  <p className="type-app-small">{d}</p>
                </li>
              ))}
            </ol>
          </section>
          <p className="jr-center type-app-small">A MIP organiza as decisões da equipe. Ela não substitui contrato, advogado ou registro oficial.</p>
        </div>
      </main>
      {tut && <Tutorial onDone={startFromTutorial} onSkip={seen} />}
    </AppFrame>
  );
}
