/* Início: mesma estrutura e textos da Home do protótipo (vHome), lapidada.
   Com projetos, eles vêm primeiro e a apresentação continua logo abaixo; sem projetos, a apresentação é a tela principal. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import { Btn, Chip } from '../components/ui.jsx';
import simbolo from '../assets/logo/mip-simbolo.svg?raw';

const HOME_STEPS = [
  ['Preparar', 'Adicione a equipe e cadastre o que vocês criaram.'],
  ['Responder', 'Cada pessoa responde em particular, em poucos minutos.'],
  ['Decidir', 'A equipe vê só onde as respostas diferem e combina.'],
  ['Confirmar', 'Cada integrante confirma a proposta.'],
  ['Registrar', 'O acordo fica registrado para a equipe guardar.']
];
const phaseKind = ph => (ph === 'consolidado' ? 'ok' : ph === 'coleta' ? '' : 'warn');

/* Prévia do registro do acordo, feita em código. */
function RecordPreview() {
  return (
    <div className="rec" aria-hidden="true">
      <p className="rec-title">REGISTRO DO ACORDO</p>
      <p>Projeto: App Rotas</p>
      <p>Situação da proposta 2: confirmada por todos</p>
      <span className="rec-gap" />
      <p className="rec-title">SITUAÇÃO POR CRIAÇÃO</p>
      <p>Logo (Marca)</p>
      <p className="rec-dim">· Titularidade pretendida: Ana, Bruno</p>
      <p className="rec-dim">· Uso comercial: só com acordo de todos os donos</p>
      <span className="rec-gap" />
      <p className="rec-hash">Código de verificação · 9f2c…a71e</p>
    </div>
  );
}

export default function Home() {
  const { me } = useSession(), nav = useNavigate();
  /* null enquanto a lista carrega, para a apresentação não aparecer e sumir em seguida. */
  const [mine, setMine] = useState(null);
  useEffect(() => { if (me) { setMine(null); get('/api/projects').then(setMine).catch(() => setMine([])); } else setMine([]); }, [me]);
  const start = () => nav(me ? '/novo' : '/entrar?next=/novo');
  if (me === undefined) return <Header />;
  /* A lista pode levar alguns segundos: mostra o lugar dela já, em vez de uma tela vazia. */
  if (me && mine === null) return (
    <>
      <Header />
      <main className="landing has-projects" aria-busy="true">
        <section className="landing-projects">
          <div className="landing-section-head"><h2>Seus projetos</h2></div>
          <div className="landing-project-list">{[0, 1].map(i => <div className="landing-project" key={i}><span className="proj-mark skel" /><div className="landing-project-text"><span className="skel skel-line" /><span className="skel skel-line short" /></div></div>)}</div>
          <p className="sr" role="status">Buscando seus projetos</p>
        </section>
      </main>
    </>
  );
  const has = mine.length > 0;
  const cta = <Btn kind="pri lg" onClick={start}>Começar minha jornada</Btn>;
  return (
    <>
      <Header />
      <main className={'landing' + (has ? ' has-projects' : '')}>
        {has && (
          <section className="landing-projects" aria-labelledby="retome">
            <div className="landing-section-head">
              <h2 id="retome">Seus projetos</h2>
              <Btn onClick={start}>Criar outro projeto</Btn>
            </div>
            <div className="landing-project-list">
              {mine.map(p => (
                <div className="landing-project" key={p.id}>
                  <span className="proj-mark" aria-hidden="true">{p.name.trim().charAt(0).toUpperCase()}</span>
                  <div className="landing-project-text">
                    <div className="landing-project-title"><h3>{p.name}</h3>{p.phaseName !== p.task.label && <Chip k={phaseKind(p.phase)}>{p.phaseName}</Chip>}</div>
                    <p><b>{p.task.label}.</b> {p.task.note}</p>
                  </div>
                  <Btn kind="pri" onClick={() => nav('/p/' + p.id)}>Ver projeto</Btn>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="landing-hero">
          <div className="landing-copy">
            <h1><span>Criaram juntos.</span> <span>Combinem juntos.</span></h1>
            <p>A MIP ajuda vocês a reconhecer contribuições, conversar sobre quem é dono e registrar decisões com transparência.</p>
            <div className="landing-actions">{!has && cta}<a href="#etapas">Conhecer as etapas ↓</a></div>
          </div>
          <div className="landing-art" aria-hidden="true">
            <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-core" dangerouslySetInnerHTML={{ __html: simbolo }} /><span className="art-caption">criar · conversar · decidir</span>
          </div>
        </section>

        <section className="landing-reason">
          <h2>Boas decisões começam com perspectivas visíveis.</h2>
          <p>Em projetos colaborativos, cada pessoa pode entender de um jeito quem criou, quem deve ser dono e como o trabalho poderá ser usado no futuro. Conversar cedo ajuda a evitar suposições e a documentar o que a equipe realmente decidiu.</p>
        </section>

        <section id="etapas" className="landing-journey" aria-labelledby="passos">
          <div className="landing-section-head">
            <h2 id="passos">Cinco passos, uma conversa de cada vez.</h2>
            <p>A página do projeto sempre mostra o que fazer agora.</p>
          </div>
          <ol className="landing-steps">
            {HOME_STEPS.map(([t, d], i) => (
              <li className="landing-step" key={t}>
                <span className="step-number">{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-outcome">
          <div className="landing-outcome-text">
            <h2>Um registro do acordo da equipe.</h2>
            <p>Um registro das contribuições, da proposta, das confirmações e dos pontos que ainda precisem de acordo. Ele prepara a conversa para formalização futura, sem substituir um contrato ou registro oficial.</p>
            {!has && cta}
          </div>
          <RecordPreview />
        </section>

      </main>
    </>
  );
}
