import { TeamCard } from '../../components/ds/index.js';
import { InnerHero, Section } from '../../components/site/Blocks.jsx';
import hero from '../../assets/img/hero-interno-sobre.webp';

const MEMBROS = [
  ['Marília (Liz)', 'Produto e Gestão'],
  ['Nononha', 'Pesquisa e Experiência'],
  ['Louise', 'Negócios e Estratégia'],
  ['Henrique', 'Inteligência de Mercado'],
  ['Leo', 'Tecnologia e Inovação'],
  ['Victor', 'Propriedade Intelectual e Regulamentação'],
  ['Isabela (Bela)', 'Design e Comunicação']
];

export default function Equipe() {
  return (
    <>
      <InnerHero image={hero} breadcrumb="Home  /  Equipe" title="Equipe" />

      <Section className="site-section--first">
        <div className="site-panel site-panel--bordered site-intro">
          <p className="site-eyebrow type-v2-site-eyebrow-12">Apresentação</p>
          <h2 className="site-title type-site-title-28">Diferentes perspectivas. Um propósito em comum.</h2>
          <p className="site-lead-text type-v2-site-body-16">A MIP é desenvolvida por uma equipe multidisciplinar: produto, pesquisa, negócios, tecnologia, propriedade intelectual e comunicação.</p>
        </div>
      </Section>

      <Section className="site-section--team">
        <h2 className="site-title type-site-title-28">Integrantes</h2>
        <div className="site-team">
          {MEMBROS.map(([nome, funcao]) => <TeamCard key={nome} site name={nome} role={funcao} />)}
        </div>
      </Section>
    </>
  );
}
