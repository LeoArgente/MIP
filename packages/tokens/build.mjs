// Gera dist/tokens.css (variáveis CSS) e dist/tokens.js (objeto JS) a partir de tokens.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const t = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));
mkdirSync(join(here, 'dist'), { recursive: true });

const vars = (prefix, obj) => Object.entries(obj).filter(([k]) => !k.startsWith('$')).map(([k, v]) => `  --${prefix}-${k}: ${v};`).join('\n');
/* Tamanhos em rem (base 16 px), para acompanhar o tamanho de fonte escolhido no navegador. */
const rem = px => +(px / 16).toFixed(4) + 'rem';
const entries = obj => Object.entries(obj).filter(([k]) => !k.startsWith('$'));

/* Estilos de texto do Figma: tracking vem em % no Figma e vira em (valor / 100). */
const styles = entries(t.font.style);
const style = styles.map(([k, v]) => [
  `  --type-${k}-size: ${rem(v.size)};`,
  /* O Figma arredonda a entrelinha para px inteiros (28 px × 1,3 = 36 px), então o CSS faz igual. */
  `  --type-${k}-line: ${rem(Math.round(v.size * v.line))};`,
  `  --type-${k}-weight: ${v.weight};`,
  `  --type-${k}-tracking: ${+(v.tracking / 100).toFixed(4)}em;`
].join('\n')).join('\n');

/* Legado: escala antiga. No computador (a partir de 768 px), tamanho e entrelinha da escala do macOS. */
const legacy = entries(t.font.text);
const text = legacy.map(([k, v]) => [
  `  --text-${k}-size: ${rem(v.size)};`,
  `  --text-${k}-line: ${rem(v.line)};`,
  `  --text-${k}-weight: ${v.weight};`,
  `  --text-${k}-tracking: ${v.tracking};`
].join('\n')).join('\n');
const textMac = legacy.map(([k, v]) => `    --text-${k}-size: ${rem(v.mac[0])};\n    --text-${k}-line: ${rem(v.mac[1])};`).join('\n');

const css = `/* Gerado por packages/tokens/build.mjs. Não edite à mão: altere tokens.json. */
:root {
  color-scheme: dark;
${vars('primitive', t.color.primitive)}
${vars('color', t.color.semantic)}
${vars('color', t.color.legacy)}
  --font-base: ${t.font.family.base};
${style}
${text}
${vars('spacing', t.spacing)}
${vars('radius', t.radius)}
${vars('effect', t.effect)}
${vars('space', t.space)}
${vars('shadow', t.shadow)}
${vars('size', t.size)}
}
@media (min-width: 768px) {
  :root {
${textMac}
  }
}
/* Estilos de texto do Figma, prontos para uso como classe. */
${styles.map(([k]) => `.type-${k}{font-family:var(--font-base);font-size:var(--type-${k}-size);font-weight:var(--type-${k}-weight);line-height:var(--type-${k}-line);letter-spacing:var(--type-${k}-tracking)}`).join('\n')}
/* Legado. */
${legacy.map(([k]) => `.t-${k}{font-family:var(--font-base);font-size:var(--text-${k}-size);font-weight:var(--text-${k}-weight);line-height:var(--text-${k}-line);letter-spacing:var(--text-${k}-tracking)}`).join('\n')}
`;

writeFileSync(join(here, 'dist', 'tokens.css'), css);
writeFileSync(join(here, 'dist', 'tokens.js'), `// Gerado por build.mjs\nexport default ${JSON.stringify(t, null, 2)};\n`);
console.log('tokens: dist/tokens.css e dist/tokens.js gerados');
