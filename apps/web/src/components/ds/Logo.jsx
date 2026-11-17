import logo from '../../assets/logo/mip.svg?raw';
import symbol from '../../assets/logo/mip-simbolo.svg?raw';

/* Logo MIP (branco, herda a cor do texto). A altura vem de --logo-h; a proporção é a do Figma. */
export default function Logo({ symbolOnly = false, className = '' }) {
  return <span className={'ds-logo ' + className} role="img" aria-label="MIP — My Intellectual Property" dangerouslySetInnerHTML={{ __html: symbolOnly ? symbol : logo }} />;
}
