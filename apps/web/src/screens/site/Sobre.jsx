import { Band, InfoCard, InnerHero, Section, SectionHead, SplitPanel } from '../../components/site/Blocks.jsx';
import hero from '../../assets/img/hero-interno-sobre.webp';
import apresentacao from '../../assets/img/sobre-apresentacao.webp';
import memorial from '../../assets/img/sobre-memorial.webp';
import pessoa from '../../assets/icons/site/pessoa.svg';
import instituicao from '../../assets/icons/site/instituicao.svg';
import organizacao from '../../assets/icons/site/organizacao.svg';
import direitos from '../../assets/icons/site/direitos.svg';
import acordos from '../../assets/icons/site/acordos.svg';
import convergencia from '../../assets/icons/site/convergencia.svg';
import divergencia from '../../assets/icons/site/divergencia.svg';
import pendencia from '../../assets/icons/site/pendencia.svg';

const ORGANIZA = [
  [pessoa, 'O projeto e seus integrantes', 'Quem está envolvido no desenvolvimento.'],
  [instituicao, 'As criações do projeto', 'Códigos, marcas, designs, pesquisas e outros materiais.'],
  [organizacao, 'As contribuições individuais', 'A participação de cada integrante.'],
  [direitos, 'Os entendimentos sobre direitos e uso', 'Autoria, titularidade e condições de uso.'],
  [acordos, 'Os acordos e as questões pendentes', 'O que foi combinado e o que ainda falta definir.']
];

const ETAPAS = [
  ['Conheça o que está sendo construído', 'Reúna informações sobre o projeto, as pessoas e as criações.'],
  ['Registre contribuições e perspectivas', 'Cada participante informa o que fez e o que entende sobre autoria, titularidade e uso.'],
  ['Identifique pontos em comum e diferenças', 'Compare as respostas para ver consensos, divergências e pendências.'],
  ['Organize os registros em um memorial', 'Reúna os entendimentos e as questões identificadas no processo.']
];

export default function Sobre() {
  return (
    <>
      <InnerHero image={hero} breadcrumb="Home  /  Sobre a MIP" title="Sobre a MIP" />

      <SplitPanel className="site-section--first" eyebrow="Apresentação" title="Uma visão mais clara das criações do seu projeto." image={apresentacao}>
        <div className="site-paras type-v2-site-body-16">
          <p>A MIP é uma plataforma que ajuda equipes universitárias e startups em estágio inicial a organizar informações sobre a propriedade intelectual de projetos colaborativos.</p>
          <p>A MIP reúne contribuições e entendimentos da equipe e mostram o que ainda precisa ser discutido.</p>
        </div>
      </SplitPanel>

      <Section id="organiza">
        <SectionHead eyebrow="O que a MIP organiza" title="As informações por trás de cada criação." />
        <ul className="site-iconlist">
          {ORGANIZA.map(([icon, titulo, texto]) => (
            <li key={titulo} className="site-iconlist-item">
              <span className="ds-icon-tile" aria-hidden="true"><img src={icon} alt="" width="24" height="24" loading="lazy" /></span>
              <div className="site-list-text">
                <h3 className="type-site-item-title-16">{titulo}</h3>
                <p className="site-muted type-v2-site-small-14">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="funciona">
        <SectionHead eyebrow="Como funciona" title="Um processo guiado, em quatro etapas." />
        <ol className="site-cards site-steps">
          {ETAPAS.map(([titulo, texto], n) => (
            <li key={titulo} className="site-card">
              <p className="site-step-num type-site-step-30">{String(n + 1).padStart(2, '0')}</p>
              <h3 className="site-card-title type-site-item-title-16">{titulo}</h3>
              <p className="site-card-body type-v2-site-small-14">{texto}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHead eyebrow="A visão coletiva" title="Onde as perspectivas se encontram." lead="Não basta saber o que cada pessoa pensa." />
        <div className="site-cards">
          <InfoCard icon={convergencia} title="Convergências" text="Entendimentos compatíveis entre os participantes." />
          <InfoCard icon={divergencia} title="Divergências" text="Perspectivas diferentes sobre uma mesma questão." />
          <InfoCard icon={pendencia} title="Pendências" text="Decisões que ainda precisam ser esclarecidas." />
        </div>
        <p className="site-muted type-v2-site-body-16">Identificar essas situações não significa determinar quem está juridicamente correto.</p>
      </Section>

      <SplitPanel id="memorial" imageFirst eyebrow="O memorial" title="Um registro para consultar e continuar construindo." image={memorial}
        notice="Não substitui contratos, registros oficiais ou orientação jurídica. Reflete as declarações dos participantes e não comprova, por si só, autoria ou titularidade.">
        <p className="site-muted type-v2-site-body-16">O memorial reúne as informações registradas pelos participantes, seus entendimentos e as questões identificadas. A equipe pode consultá-lo, retomar conversas e usá-lo como referência para decisões futuras.</p>
      </SplitPanel>

      <Band eyebrow="Nosso diferencial" title="A MIP organiza perspectivas, não apenas arquivos." text="O objetivo não é decidir pela equipe, mas ajudá-la a compreender melhor sua situação e organizar os próximos passos." label="Começar agora" to="/novo" id="diferencial" />
    </>
  );
}
