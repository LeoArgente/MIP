import { Link } from 'react-router-dom';
import { LinkDash } from './Links.jsx';

/* Quadrado de destaque com ícone. */
export function IconTile({ children }) {
  return <span className="ds-icon-tile" aria-hidden="true">{children}</span>;
}

/* Número de destaque com ícone e legenda. */
export function Stat({ icon, number, label }) {
  return (
    <div className="ds-stat">
      {icon}
      <p className="type-v2-stat">{number}</p>
      <p className="ds-stat-label type-v2-caption">{label}</p>
    </div>
  );
}

/* Cartão de serviço: imagem, barra de título com ícone e corpo. */
export function FeatureCard({ to, icon, title, text, linkLabel, image, imageAlt = '' }) {
  const body = (
    <>
      {image ? <img className="ds-feature-image" src={image} alt={imageAlt} loading="lazy" /> : <div className="ds-feature-image" />}
      <div className="ds-feature-bar">
        <IconTile>{icon}</IconTile>
        <h3 className="ds-feature-title type-v2-card-title">{title}</h3>
      </div>
      <div className="ds-feature-body">
        <p className="ds-feature-text type-v2-body-small">{text}</p>
        <LinkDash>{linkLabel}</LinkDash>
      </div>
    </>
  );
  return to ? <Link to={to} className="ds-feature">{body}</Link> : <article className="ds-feature">{body}</article>;
}

/* Cartão de integrante da equipe (retrato placeholder quando não há foto). */
export function TeamCard({ name, role, photo, site = false }) {
  return (
    <figure className={'ds-team' + (site ? ' ds-team--site' : '')}>
      {photo ? <img className="ds-team-photo" src={photo} alt={name} loading="lazy" /> : <div className="ds-team-photo" role="img" aria-label={'Retrato de ' + name} />}
      <p className="ds-team-name type-v2-name">{name}</p>
      <p className={'ds-team-role ' + (site ? 'type-v2-site-small-14' : 'type-v2-body-small')}>{role}</p>
    </figure>
  );
}

/* Título animado das páginas internas (sobe e aparece em 0,9 s). */
export function HeroText({ breadcrumb, title }) {
  return (
    <div className="ds-hero-text">
      <p className="ds-hero-crumb type-v2-caption">{breadcrumb}</p>
      <h1 className="ds-hero-title type-v2-display-hero">{title}</h1>
    </div>
  );
}
