import { useId } from 'react';
import { Link } from 'react-router-dom';
import checkMark from '../../assets/icons/checkbox-check.svg';

/* Campo de autenticação: rótulo acima, caixa escura e ação opcional à direita (ex.: Mostrar). */
export function AuthField({ label, action, onAction, actionPressed, className = '', ...input }) {
  const id = useId();
  return (
    <div className={'ds-auth-field ' + className}>
      <label htmlFor={id} className="ds-auth-label type-v2-caption">{label}</label>
      <div className="ds-auth-box">
        <input id={id} className="ds-auth-input type-v2-body-small" {...input} />
        {action && <button type="button" className="ds-auth-action type-v2-caption" onClick={onAction} aria-pressed={actionPressed}>{action}</button>}
      </div>
    </div>
  );
}

/* Campo simples do formulário de contato (Field v2). */
export function Field({ as: Tag = 'input', className = '', ...props }) {
  return <Tag className={'ds-field type-v2-body-small ' + className} {...props} />;
}

export function Checkbox({ label, ...input }) {
  return (
    <label className="ds-check type-v2-body-small">
      <input type="checkbox" className="sr" {...input} />
      <span className="ds-check-box"><img className="ds-check-mark" src={checkMark} alt="" /></span>
      <span>{label}</span>
    </label>
  );
}

/* Botão de login social: só visual, sem ação. */
export function SocialButton({ initial, label }) {
  return (
    <button type="button" className="ds-social-btn">
      <span className="ds-social-btn-icon type-v2-caption" aria-hidden="true">{initial}</span>
      <span className="type-v2-body-small">{label}</span>
    </button>
  );
}

/* Abas Entrar / Criar conta: cada uma é uma rota. */
export function AuthTabs({ active }) {
  const tab = (key, to, label) => <Link to={to} className="ds-tab type-v2-button" aria-current={active === key ? 'page' : undefined}>{label}</Link>;
  return <nav className="ds-tabs" aria-label="Entrar ou criar conta">{tab('entrar', '/entrar', 'Entrar')}{tab('criar', '/criar-conta', 'Criar conta')}</nav>;
}
