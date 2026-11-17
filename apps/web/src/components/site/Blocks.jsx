import { Link } from 'react-router-dom';
import { Button, HeroText, IconTile } from '../ds/index.js';
import chamada from '../../assets/img/chamada-final.webp';
import info from '../../assets/icons/site/info.svg';

/* Seção do site: faixa com margem lateral de 64 px (20 no celular). */
export function Section({ id, children, className = '' }) {
  return <section id={id} className={'site-section ' + className}>{children}</section>;
}

/* Cabeçalho de seção: eyebrow, título e apoio opcional. */
export function SectionHead({ eyebrow, title, lead, center = false, titleClass = '' }) {
  return (
    <header className={'site-head' + (center ? ' site-head--center' : '')}>
      {eyebrow && <p className="site-eyebrow type-v2-site-eyebrow-12">{eyebrow}</p>}
      <h2 className={'site-title type-site-title-28 ' + titleClass}>{title}</h2>
      {lead && <p className="site-lead-text type-v2-site-body-16">{lead}</p>}
    </header>
  );
}

/* Cartão com ícone: empilhado (padrão) ou em linha. */
export function InfoCard({ icon, title, text, row = false }) {
  return (
    <article className={'site-card' + (row ? ' site-card--row' : '')}>
      <IconTile><img src={icon} alt="" width="24" height="24" loading="lazy" /></IconTile>
      <div className="site-card-text">
        <h3 className="site-card-title type-site-card-title-18">{title}</h3>
        <p className="site-card-body type-v2-site-small-14">{text}</p>
      </div>
    </article>
  );
}

/* Link sublinhado em caixa-alta ("Saiba mais na página Sobre a MIP"). */
export function TextLink({ to, children }) {
  return <Link to={to} className="site-textlink type-v2-link">{children}</Link>;
}

/* Hero das páginas internas: imagem, escurecimento, degradê e título que sobe e aparece. */
export function InnerHero({ image, breadcrumb, title }) {
  return (
    <section className="inner-hero">
      <img className="inner-hero-img" src={image} alt="" decoding="async" fetchPriority="high" />
      <div className="inner-hero-shade" aria-hidden="true" />
      <div className="inner-hero-fade" aria-hidden="true" />
      <HeroText breadcrumb={breadcrumb} title={title} />
    </section>
  );
}

/* Painel com texto e imagem lado a lado (a imagem pode vir antes). */
export function SplitPanel({ id, className = '', eyebrow, title, children, image, imageFirst = false, notice }) {
  return (
    <Section id={id} className={className}>
      <div className={'site-panel site-split site-split--cover' + (imageFirst ? ' site-split--reverse' : '')}>
        <div className="site-split-text site-split-text--tight">
          <p className="site-eyebrow type-v2-site-eyebrow-12">{eyebrow}</p>
          <h2 className="site-title type-site-title-28">{title}</h2>
          {children}
          {notice && (
            <div className="site-notice">
              <img src={info} alt="" width="20" height="20" />
              <p className="type-v2-site-small-14">{notice}</p>
            </div>
          )}
        </div>
        <div className="site-split-image"><img src={image} alt="" width="1024" height="1024" loading="lazy" decoding="async" /></div>
      </div>
    </Section>
  );
}

/* Faixa com imagem: eyebrow, título, apoio e botão. */
export function Band({ id, eyebrow, title, text, label, to }) {
  return (
    <Section id={id} className="site-section--band">
      <div className="site-cta site-cta--band">
        <img className="site-cta-bg" src={chamada} alt="" width="1264" height="848" loading="lazy" decoding="async" />
        <p className="site-eyebrow type-v2-site-eyebrow-12">{eyebrow}</p>
        <h2 className="site-cta-title type-site-title-28">{title}</h2>
        <p className="site-cta-text type-v2-site-body-16">{text}</p>
        <Button variant="ghost" to={to}>{label}</Button>
      </div>
    </Section>
  );
}
