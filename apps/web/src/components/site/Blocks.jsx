import { Link } from 'react-router-dom';
import { IconTile } from '../ds/index.js';

/* Seção do site: faixa com margem lateral de 64 px (20 no celular). */
export function Section({ id, children, className = '' }) {
  return <section id={id} className={'site-section ' + className}>{children}</section>;
}

/* Cabeçalho de seção: eyebrow, título e apoio opcional. */
export function SectionHead({ eyebrow, title, lead, center = false, titleClass = '' }) {
  return (
    <header className={'site-head' + (center ? ' site-head--center' : '')}>
      <p className="site-eyebrow type-v2-site-eyebrow-12">{eyebrow}</p>
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
