import { useEffect, useState } from 'react';
import hero1 from '../../assets/img/home-hero-1.webp';
import hero2 from '../../assets/img/home-hero-2.webp';
import hero3 from '../../assets/img/home-hero-3.webp';

const SLIDES = [hero1, hero2, hero3];
const INTERVAL = 6000;

/* Hero da Home: 3 imagens em fusão (crossfade), troca sozinha a cada 6 s. O texto é o mesmo nos 3 slides. */
export default function Hero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => { if (!document.hidden) setI(n => (n + 1) % SLIDES.length); }, INTERVAL);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="hero" aria-label="Apresentação">
      {SLIDES.map((src, n) => (
        <div key={src} className={`hero-slide hero-slide--${n + 1}` + (n === i ? ' is-active' : '')} aria-hidden="true">
          <img src={src} alt="" decoding="async" fetchPriority={n === 0 ? 'high' : 'low'} />
        </div>
      ))}
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-fade" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-title type-v2-display-hero">Grandes ideias são<br className="hero-br" /> construídas em equipe.<br className="hero-br" /> A clareza também.</h1>
        <p className="hero-lead type-site-lead-20">Organize hoje o que sua equipe está criando para avançar com mais segurança nas decisões de amanhã.</p>
        <p className="hero-body type-site-hero-body-16">Em um projeto colaborativo, contribuições, expectativas e decisões nem sempre estão tão claras quanto parecem. A MIP ajuda sua equipe a reunir essas informações, reconhecer diferentes entendimentos e identificar o que ainda precisa ser combinado.</p>
      </div>
    </section>
  );
}
