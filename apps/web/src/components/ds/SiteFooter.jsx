import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import linkedin from '../../assets/icons/social-in.svg';
import instagram from '../../assets/icons/social-ig.svg';
import youtube from '../../assets/icons/social-yt.svg';

const NAV = [['/sobre', 'Sobre a MIP'], ['/proposito', 'Propósito'], ['/equipe', 'Equipe'], ['/contato', 'Contato']];
const PAGE = [['/sobre#organiza', 'O que a MIP organiza'], ['/sobre#funciona', 'Como funciona'], ['/sobre#memorial', 'O memorial'], ['/sobre#diferencial', 'O diferencial']];
const COPY = '© 2026 Backstage • MIP — My Intellectual Property. Todos os direitos reservados.';

function Column({ title, items }) {
  return (
    <nav className="ds-footer-col" aria-label={title}>
      <p className="ds-footer-head type-v2-site-eyebrow-12">{title}</p>
      {items.map(([to, label]) => <Link key={to} to={to} className="ds-footer-link type-v2-site-small-14">{label}</Link>)}
    </nav>
  );
}

/* Rodapé. No celular só aparecem as duas listas de navegação e o direito autoral. */
export default function SiteFooter() {
  return (
    <footer className="ds-footer">
      <div className="ds-footer-grid">
        <div className="ds-footer-brand">
          <Link to="/" aria-label="MIP, página inicial"><Logo /></Link>
          <p className="ds-footer-about type-v2-site-small-14">A MIP ajuda equipes a organizar contribuições, entendimentos e decisões sobre as criações de projetos colaborativos.</p>
          <div className="ds-footer-social">
            <span className="ds-social" role="img" aria-label="LinkedIn"><img src={linkedin} alt="" width="24" height="24" /></span>
            <span className="ds-social" role="img" aria-label="Instagram"><img src={instagram} alt="" width="24" height="24" /></span>
            <span className="ds-social" role="img" aria-label="YouTube"><img src={youtube} alt="" width="24" height="24" /></span>
          </div>
        </div>
        <Column title="Navegação" items={NAV} />
        <Column title="Na página Sobre a MIP" items={PAGE} />
        <div className="ds-footer-contact">
          <p className="ds-footer-head type-v2-site-eyebrow-12">Fale conosco</p>
          <Link to="/contato" className="ds-contact-box type-v2-button">Falar com a equipe</Link>
          <p className="ds-footer-copy type-v2-site-small-14">{COPY}</p>
        </div>
      </div>
      <p className="ds-footer-copy ds-footer-copy--mobile type-v2-site-small-14">{COPY}</p>
    </footer>
  );
}
