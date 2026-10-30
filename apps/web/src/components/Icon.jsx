/* Ícones SVG no próprio HTML (como a logo): usam a cor do texto (currentColor) e o tamanho da fonte (1em).
   Arquivos em assets/icons (Font Awesome Pro, licença comercial). */
import chevronDown from '../assets/icons/chevron-down.svg?raw';
import chevronLeft from '../assets/icons/chevron-left.svg?raw';
import chevronRight from '../assets/icons/chevron-right.svg?raw';
import chevronUp from '../assets/icons/chevron-up.svg?raw';

const ICONS = { 'chevron-down': chevronDown, 'chevron-left': chevronLeft, 'chevron-right': chevronRight, 'chevron-up': chevronUp };

export default function Icon({ name, className = '' }) {
  return <span className={('icon ' + className).trim()} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}
