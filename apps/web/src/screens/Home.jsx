/* Início: projetos da pessoa ("Retome de onde parou") e apresentação da MIP. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import { Btn } from '../components/ui.jsx';

const HOME_STEPS = [
  ['Preparar', 'Adicione a equipe e cadastre o que vocês criaram.'],
  ['Responder', 'Cada pessoa responde em particular, em poucos minutos.'],
  ['Decidir', 'A equipe vê só onde as respostas diferem e combina.'],
  ['Confirmar', 'Cada integrante confirma a proposta.'],
  ['Registrar', 'O acordo fica registrado para a equipe guardar.']
];

export default function Home() {
  const { me } = useSession(), nav = useNavigate();
  const [mine, setMine] = useState([]);
  useEffect(() => { if (me) get('/api/projects').then(setMine).catch(() => setMine([])); else setMine([]); }, [me]);
  const start = () => nav(me ? '/novo' : '/entrar?next=/novo');
  const cta = <Btn kind="pri" onClick={start}>Começar minha jornada</Btn>;
  return (
    <>
      <Header />
      <main className="landing">
        {mine.length > 0 && (
          <section>
            <div className="landing-section-head"><h2>Retome de onde parou.</h2><Btn onClick={start}>Criar outro projeto</Btn></div>
            <div className="landing-project-list">
              {mine.map(p => (
                <div className="landing-project" key={p.id}>
                  <div><h3>{p.name}</h3><p><b>{p.task.label}.</b> {p.task.note}</p></div>
                  <Btn kind="pri" onClick={() => nav('/p/' + p.id + (p.task.tab === 'proj' ? '' : '/' + p.task.tab))}>{p.task.cta || 'Abrir projeto'}</Btn>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="landing-hero">
          <div className="landing-copy">
            <h1>O que a equipe cria merece uma conversa clara desde o começo.</h1>
            <p>A MIP ajuda vocês a reconhecer contribuições, conversar sobre quem é dono e registrar decisões com transparência.</p>
            <div className="landing-actions">{!mine.length && cta}<a href="#etapas">Conhecer as etapas ↓</a></div>
          </div>
          <div className="landing-art" aria-hidden="true">
            <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-core">mip.</span><span className="art-caption">criar · conversar · decidir</span>
          </div>
        </section>
        <section className="landing-reason">
          <h2>Boas decisões começam com perspectivas visíveis.</h2>
          <p>Em projetos colaborativos, cada pessoa pode entender de um jeito quem criou, quem deve ser dono e como o trabalho poderá ser usado no futuro. Conversar cedo ajuda a evitar suposições e a documentar o que a equipe realmente decidiu.</p>
        </section>
        <section id="etapas">
          <div className="landing-section-head"><h2>Cinco passos, uma conversa de cada vez.</h2><p>A página do projeto sempre mostra o que fazer agora.</p></div>
          <div className="landing-steps">
            {HOME_STEPS.map(([t, d], i) => <div className="landing-step" key={t}><span className="step-number">{String(i + 1).padStart(2, '0')}</span><div><h3>{t}</h3><p>{d}</p></div></div>)}
          </div>
        </section>
        <section className="landing-outcome">
          <h2>Um registro do acordo da equipe.</h2>
          <p>Um registro das contribuições, da proposta, das confirmações e dos pontos que ainda precisem de acordo. Ele prepara a conversa para formalização futura, sem substituir um contrato ou registro oficial.</p>
          {!mine.length && cta}
        </section>
      </main>
    </>
  );
}
