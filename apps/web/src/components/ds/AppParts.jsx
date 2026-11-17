import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import Logo from './Logo.jsx';
import radioMark from '../../assets/icons/radio-checked.svg';

const initials = n => (n || '?').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();

/* Etiqueta de situação: neutral (padrão), accent, ok, warn ou bad. */
export function Chip({ tone = 'neutral', children }) {
  return <span className={'ds-chip type-app-caption' + (tone === 'neutral' ? '' : ` ds-chip--${tone === 'accent' ? 'accent' : tone}`)}>{children}</span>;
}

/* Botão do app: primary (padrão), secondary, small ou danger. */
export function AppButton({ kind = 'primary', to, href, className = '', children, ...rest }) {
  const cls = `ds-app-btn type-app-button${kind === 'primary' ? '' : ` ds-app-btn--${kind}`} ${className}`;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return to ? <Link to={to} className={cls} {...rest}>{children}</Link> : <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Avatar({ name }) {
  return <span className="ds-avatar type-app-caption" aria-hidden="true">{initials(name)}</span>;
}

/* Opção de escolha única. */
export function RadioRow({ label, ...input }) {
  return (
    <label className="ds-radio">
      <input type="radio" className="sr" {...input} />
      <span className="ds-radio-dot"><img className="ds-radio-mark" src={radioMark} alt="" /></span>
      <span className="ds-radio-label type-app-body">{label}</span>
    </label>
  );
}

/* Barra do app: marca à esquerda, conta à direita e, dentro de uma etapa, "‹ Nome do projeto" abaixo. */
export function AppTopbar({ name, back }) {
  return (
    <div className="ds-topbar">
      <div className="ds-topbar-row">
        <Link to="/" aria-label="MIP, página inicial"><Logo /></Link>
        <div className="ds-topbar-account">
          <Avatar name={name} />
          <span className="type-app-caption">{name}</span>
          <ChevronDown className="ds-topbar-chevron" size={12} strokeWidth={1.6} absoluteStrokeWidth aria-hidden="true" />
        </div>
      </div>
      {back && (
        <Link to={back.to} className="ds-topbar-back type-app-small">
          <ChevronLeft className="ds-topbar-chevron" size={12} strokeWidth={1.6} absoluteStrokeWidth aria-hidden="true" />
          {back.label}
        </Link>
      )}
    </div>
  );
}
