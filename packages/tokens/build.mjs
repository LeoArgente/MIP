// Gera dist/tokens.css (variáveis CSS) e dist/tokens.js (objeto JS) a partir de tokens.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));
mkdirSync(join(here, 'dist'), { recursive: true });

const vars = (prefix, obj) => Object.entries(obj).map(([k, v]) => `  --${prefix}-${k}: ${v};`).join('\n');
const text = Object.entries(t.font.text).map(([k, v]) => [
  `  --text-${k}-size: ${v.size};`,
  `  --text-${k}-weight: ${v.weight};`,
  `  --text-${k}-line: ${v.line};`,
  `  --text-${k}-tracking: ${v.tracking};`
].join('\n')).join('\n');

const css = `/* Gerado por packages/tokens/build.mjs. Não edite à mão: altere tokens.json. */
:root {
  color-scheme: dark;
${vars('color', t.color.dark)}
  --font-base: ${t.font.family.base};
${text}
${vars('space', t.space)}
${vars('radius', t.radius)}
${vars('shadow', t.shadow)}
${vars('size', t.size)}
}
@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
${vars('color', t.color.light).replace(/^/gm, '  ')}
    --shadow-soft: 0 10px 30px rgba(0,0,0,.06);
    --shadow-float: 0 18px 40px rgba(0,0,0,.12);
  }
}
/* Estilos de texto da escala tipográfica. */
${Object.keys(t.font.text).map(k => `.t-${k}{font-family:var(--font-base);font-size:var(--text-${k}-size);font-weight:var(--text-${k}-weight);line-height:var(--text-${k}-line);letter-spacing:var(--text-${k}-tracking)${k === 'label' ? ';text-transform:uppercase' : ''}}`).join('\n')}
`;

writeFileSync(join(here, 'dist', 'tokens.css'), css);
writeFileSync(join(here, 'dist', 'tokens.js'), `// Gerado por build.mjs\nexport default ${JSON.stringify(t, null, 2)};\n`);
console.log('tokens: dist/tokens.css e dist/tokens.js gerados');
