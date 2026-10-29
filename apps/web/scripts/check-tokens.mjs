/* Confere se o CSS e os estilos dos componentes seguem os design tokens (@mip/tokens):
   - toda var(--…) usada existe;
   - tamanho de texto só pela escala (var(--text-*-size)), exceto ilustrações;
   - espaçamentos em px são múltiplos de 4 (traços de até 2 px são permitidos).
   Uso: npm run check -w @mip/web. Sai com código 1 se encontrar problema. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tokensCss = readFileSync(join(root, '../../packages/tokens/dist/tokens.css'), 'utf8');
const appCss = readFileSync(join(root, 'src/styles/app.css'), 'utf8');
/* Ilustrações desenhadas com texto (logotipo e ícones), que não são texto de leitura. */
const FONT_OK = ['.intro-art', '.art-core', '.auth-icon'];
const SPACE = /^(padding|margin|gap|row-gap|column-gap|top|right|bottom|left|inset|min-height|height|min-width|width)/;
const problems = [];

const defined = new Set([...tokensCss.matchAll(/(--[\w-]+)\s*:/g), ...appCss.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const lineOf = (text, i) => text.slice(0, i).split('\n').length;

for (const m of appCss.matchAll(/var\((--[\w-]+)/g)) if (!defined.has(m[1])) problems.push(`app.css:${lineOf(appCss, m.index)}  token inexistente ${m[1]}`);

const noComments = appCss.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
for (const r of noComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const sel = r[1].trim().split('\n').pop().trim();
  for (const d of r[2].split(';')) {
    const [prop, ...rest] = d.split(':'); if (!rest.length) continue;
    const p = prop.trim(), v = rest.join(':').trim(), at = `app.css:${lineOf(noComments, r.index + r[1].length + r[2].indexOf(d))}`;
    if (p === 'font-size' && !/^var\(--text-[\w-]+-size\)$|^inherit$/.test(v) && !FONT_OK.some(s => sel.includes(s))) problems.push(`${at}  ${sel}: font-size ${v} fora da escala`);
    if (SPACE.test(p)) for (const n of v.matchAll(/(-?\d*\.?\d+)px/g)) if (Math.abs(+n[1]) > 2 && +n[1] % 4) problems.push(`${at}  ${sel}: ${p} ${v} fora da grade de 4 px`);
  }
}

const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.jsx') ? [join(dir, e.name)] : []));
for (const f of walk(join(root, 'src'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/style=\{\{([^}]*)\}\}/g))
    for (const k of m[1].matchAll(/(margin\w*|padding\w*|gap|fontSize)\s*:\s*(\d+)/g))
      if (k[1] === 'fontSize' || (+k[2] > 2 && +k[2] % 4)) problems.push(`${relative(root, f)}:${lineOf(src, m.index)}  style ${k[1]}: ${k[2]} ${k[1] === 'fontSize' ? 'fora da escala' : 'fora da grade de 4 px'}`);
}

if (problems.length) { console.error(problems.length + ' problema(s) com os design tokens:\n' + problems.join('\n')); process.exit(1); }
console.log('Design tokens: tudo certo (' + defined.size + ' variáveis definidas).');
