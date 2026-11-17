import { Button } from '../../components/ds/index.js';
import Hero from '../../components/site/Hero.jsx';
import { InfoCard, Section, SectionHead, TextLink } from '../../components/site/Blocks.jsx';
import equipe from '../../assets/img/equipe-backstage.webp';
import chamada from '../../assets/img/chamada-final.webp';
import convergencia from '../../assets/icons/site/convergencia.svg';
import divergencia from '../../assets/icons/site/divergencia.svg';
import pendencia from '../../assets/icons/site/pendencia.svg';
import pessoa from '../../assets/icons/site/pessoa.svg';
import historico from '../../assets/icons/site/historico.svg';
import foguete from '../../assets/icons/site/foguete.svg';
import universidade from '../../assets/icons/site/universidade.svg';
import instituicao from '../../assets/icons/site/instituicao.svg';
import lapis from '../../assets/icons/site/lapis.svg';
import olho from '../../assets/icons/site/olho.svg';
import ideia from '../../assets/icons/site/ideia.svg';

const SITUACOES = [
  ['Um integrante deixa o projeto.', 'Ele pode continuar usando o código que ajudou a desenvolver?'],
  ['Uma pessoa criou a marca.', 'Isso significa que a marca pertence a ela ou ao projeto?'],
  ['Surge uma oportunidade de investimento.', 'Todos têm o mesmo entendimento sobre a quem pertencem as criações?'],
  ['Parte da solução foi desenvolvida na universidade.', 'Existem direitos ou regras institucionais a considerar?'],
  ['Uma decisão foi tomada verbalmente.', 'Como a equipe poderá consultá-la daqui a alguns meses?']
];

export default function Home() {
  return (
    <>
      <Hero />

      <Section className="site-section--first">
        <div className="site-panel site-split">
          <div className="site-split-text">
            <h2 className="type-site-title-28">Criar juntos não significa estar de acordo.</h2>
            <p className="type-v2-site-body-16">Uma boa ideia pode ser construída em equipe. As dúvidas sobre ela também.</p>
            <p className="site-muted type-v2-site-body-16">Quando várias pessoas constroem um projeto, nem sempre está claro quem criou o quê, a quem pertencem as criações e como elas poderão ser utilizadas.</p>
          </div>
          <div className="site-split-image"><img src={equipe} alt="Equipe Backstage" width="1152" height="928" loading="lazy" decoding="async" /></div>
        </div>
      </Section>

      <Section>
        <div className="site-two">
          <header className="site-head site-two-head">
            <p className="site-eyebrow type-v2-site-eyebrow-12">O problema</p>
            <h2 className="site-title type-site-title-28">O que ainda não foi combinado pode virar um problema.</h2>
            <p className="site-lead-text type-v2-site-body-16">Sua equipe já conversou sobre estas situações?</p>
          </header>
          <ol className="site-list">
            {SITUACOES.map(([titulo, texto], n) => (
              <li key={titulo} className="site-list-item">
                <span className="site-list-num type-v2-site-eyebrow-12">{String(n + 1).padStart(2, '0')}</span>
                <div className="site-list-text">
                  <h3 className="type-site-item-title-16">{titulo}</h3>
                  <p className="site-muted type-v2-site-small-14">{texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="A solução" title="Mais do que registrar informações. Entender onde sua equipe está de acordo." lead="A MIP reúne as perspectivas de cada integrante para mostrar:" titleClass="site-title--760" />
        <div className="site-cards">
          <InfoCard icon={convergencia} title="Convergências" text="O que todos entendem da mesma forma." />
          <InfoCard icon={divergencia} title="Divergências" text="Onde há versões ou expectativas diferentes." />
          <InfoCard icon={pendencia} title="Pendências" text="O que ainda precisa ser conversado." />
        </div>
        <TextLink to="/sobre">Saiba mais na página Sobre a MIP</TextLink>
      </Section>

      <Section>
        <SectionHead eyebrow="Benefícios" title="Menos suposições. Mais clareza para avançar." />
        <div className="site-grid">
          <InfoCard row icon={pessoa} title="Reconheça quem contribuiu" text="Dê visibilidade à participação de cada integrante." />
          <InfoCard row icon={divergencia} title="Identifique divergências mais cedo" text="Perceba diferenças enquanto ainda há espaço para conversar." />
          <InfoCard row icon={historico} title="Não dependa apenas da memória" text="Consulte informações e entendimentos ao longo do projeto." />
          <InfoCard row icon={foguete} title="Esteja preparado para novas etapas" text="Organize informações para mudanças na equipe, acordos e parcerias." />
        </div>
      </Section>

      <Section>
        <div className="site-panel site-center">
          <p className="site-eyebrow type-v2-site-eyebrow-12">O diferencial</p>
          <h2 className="site-title site-title--820 type-site-title-28">A MIP não decide quem tem razão. Ela mostra o que precisa ser conversado.</h2>
          <p className="site-lead-text site-lead-text--640 type-v2-site-body-16">Porque decisões construídas em equipe começam com a compreensão do que cada pessoa fez, entende e espera.</p>
          <ul className="site-chips">
            {[[lapis, 'FEZ'], [olho, 'ENTENDE'], [ideia, 'ESPERA']].map(([src, label]) => (
              <li key={label} className="site-chip type-v2-site-eyebrow-12"><img src={src} alt="" width="16" height="16" />{label}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <SectionHead eyebrow="Para quem é a MIP" title="Para quem está construindo algo que pode crescer." />
        <div className="site-cards">
          <InfoCard icon={universidade} title="Equipes universitárias empreendedoras" text="Que transformam trabalhos e pesquisas acadêmicas em soluções com potencial de mercado." />
          <InfoCard icon={foguete} title="Startups em estágio inicial" text="Que precisam organizar criações, contribuições e entendimentos desde cedo." />
          <InfoCard icon={instituicao} title="Incubadoras, universidades e aceleradoras" text="Que apoiam equipes e buscam uma organização mais consciente da propriedade intelectual." />
        </div>
      </Section>

      <Section className="site-only-mobile">
        <div className="site-moment">
          <SectionHead eyebrow="Nosso momento atual" title="Uma solução em desenvolvimento, baseada em necessidades reais." lead="Em uma pesquisa exploratória com 34 participantes, 25 relataram não ter acordos, contar apenas com acordos verbais ou não ter chegado a uma definição. Agora, estamos testando a usabilidade do protótipo e avaliando aspectos jurídicos da proposta." />
          <div className="site-moment-nums">
            {[['34', 'participantes na pesquisa'], ['25', 'sem acordo definido'], ['4', 'entrevistas exploratórias']].map(([n, l]) => (
              <div key={l} className="site-moment-num"><p className="type-site-stat-28">{n}</p><p className="site-muted type-v2-site-small-14">{l}</p></div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="site-section--last">
        <div className="site-cta">
          <img className="site-cta-bg" src={chamada} alt="" width="1264" height="848" loading="lazy" decoding="async" />
          <h2 className="site-cta-title type-site-title-28">Sua equipe está construindo o futuro do projeto. Mas o que já foi combinado?</h2>
          <p className="site-cta-text type-v2-site-body-16">Descubra o que está claro e o que ainda gera dúvidas.</p>
          <div className="site-cta-buttons">
            <Button variant="ghost" to="/sobre">Quero conhecer a MIP</Button>
            <Button variant="ghost" to="/contato">Participar dos testes</Button>
          </div>
        </div>
      </Section>
    </>
  );
}
