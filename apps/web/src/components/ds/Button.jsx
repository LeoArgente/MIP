import { Link } from 'react-router-dom';

/* Botão v2 do site: variant outline (padrão), fill ou ghost. cta = chamada do header (16/700).
   Com `to` vira link do roteador, com `href` vira âncora, senão é <button>. */
export default function Button({ variant = 'outline', cta = false, block = false, to, href, className = '', children, ...rest }) {
  const cls = ['ds-btn', cta ? 'ds-btn--cta type-site-cta-16' : 'type-v2-button', !cta && variant !== 'outline' && `ds-btn--${variant}`, block && 'ds-btn--block', className].filter(Boolean).join(' ');
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}
