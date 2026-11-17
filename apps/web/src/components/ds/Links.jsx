import { Link, NavLink } from 'react-router-dom';

/* Item do menu do header (Nav Item). O estado ativo vem do roteador (aria-current). */
export function NavItem({ to, children, ...rest }) {
  return <NavLink to={to} className="ds-nav-item type-site-nav-18" {...rest}>{children}</NavLink>;
}

/* Link com traço: "—— VER MAIS". O traço cresce no hover. */
export function LinkDash({ to, children, className = '', ...rest }) {
  const cls = 'ds-link-dash type-v2-link ' + className;
  return to ? <Link to={to} className={cls} {...rest}>{children}</Link> : <span className={cls} {...rest}>{children}</span>;
}
