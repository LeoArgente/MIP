import { Band, InnerHero, Section, SplitPanel } from '../../components/site/Blocks.jsx';
import hero from '../../assets/img/hero-interno-proposito.webp';
import missao from '../../assets/img/proposito-missao.webp';

/* Título à esquerda (460 px) e texto à direita. */
function TwoCols({ eyebrow, title, children }) {
  return (
    <Section>
      <div className="site-two">
        <header className="site-head site-two-head site-two-head--wide">
          <p className="site-eyebrow type-v2-site-eyebrow-12">{eyebrow}</p>
          <h2 className="site-title type-site-title-28">{title}</h2>
        </header>
        <div className="site-two-text site-muted type-v2-site-body-16">{children}</div>
      </div>
    </Section>
  );
}

export default function Proposito() {
  return (
    <>
      <InnerHero image={hero} breadcrumb="Home  /  Propósito" title="Propósito" />

      <SplitPanel className="site-section--first" eyebrow="Nossa missão" title="Ajudar equipes a construir juntas com mais clareza sobre o que criam." image={missao}>
        <p className="site-muted type-v2-site-body-16">Organizar contribuições, entendimentos e acordos deve fazer parte do desenvolvimento de um projeto colaborativo, e não só do momento em que ele cresce ou enfrenta mudanças.</p>
      </SplitPanel>

      <TwoCols eyebrow="O que nos motivou" title="Boas ideias avançam rápido. Conversas importantes nem sempre acompanham.">
        <p>Questões sobre quem criou algo, a quem pertencem os direitos e como as criações poderão ser usadas costumam ficar para depois.</p>
        <p>Mas elas não desaparecem: voltam quando a equipe muda, o produto evolui ou surgem parcerias e oportunidades de mercado.</p>
      </TwoCols>

      <TwoCols eyebrow="O que queremos transformar" title="Fazer da clareza parte do processo de criação.">
        <p>Queremos que equipes empreendedoras organizem as informações sobre suas criações desde as primeiras etapas: registrando contribuições, trocando perspectivas e identificando o que precisa ser conversado.</p>
      </TwoCols>

      <Band eyebrow="Nossa visão" title="Uma cultura de colaboração que também valoriza a clareza." text="Porque criar em equipe também envolve reconhecer pessoas, contribuições e responsabilidades." label="Começar agora" to="/novo" />
    </>
  );
}
