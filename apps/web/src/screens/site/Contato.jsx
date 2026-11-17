import { useEffect, useRef, useState } from 'react';
import { Button, Field, LinkDash } from '../../components/ds/index.js';
import { InnerHero, Section } from '../../components/site/Blocks.jsx';
import hero from '../../assets/img/chamada-final.webp';
import imagem from '../../assets/img/contato.webp';
import tile from '../../assets/icons/site/contato.svg';

/* Mensagem de confirmação: fundo preto a 60% que fecha ao clicar fora (ou com Esc). */
function Sent({ onClose }) {
  const box = useRef(null);
  useEffect(() => {
    box.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="site-overlay" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="site-popup" role="dialog" aria-modal="true" aria-labelledby="sent-title" onClick={e => e.stopPropagation()}>
        <h2 id="sent-title" className="site-popup-title type-v2-heading-h3">Mensagem enviada</h2>
        <p className="site-popup-text type-v2-body">Obrigado! A equipe Backstage entrará em contato em breve.</p>
        <button type="button" className="site-popup-close" onClick={onClose}><LinkDash>Fechar</LinkDash></button>
      </div>
    </div>
  );
}

export default function Contato() {
  const [sent, setSent] = useState(false);
  const submit = e => { e.preventDefault(); e.currentTarget.reset(); setSent(true); };
  return (
    <>
      <InnerHero image={hero} breadcrumb="Home  /  Contato" title="Contato" />
      <Section className="site-section--contact">
        <div className="site-contact">
          <div className="site-contact-image"><img src={imagem} alt="" width="1024" height="1024" decoding="async" /></div>
          <form className="site-form" onSubmit={submit}>
            <p className="site-form-eyebrow type-v2-eyebrow">Contato</p>
            <h2 className="site-form-title type-v2-heading-h3">O futuro começa<br />nos bastidores</h2>
            <div className="site-form-row">
              <Field name="nome" placeholder="Nome*" aria-label="Nome" required autoComplete="name" />
              <Field name="email" type="email" placeholder="E-mail*" aria-label="E-mail" required autoComplete="email" />
            </div>
            <Field name="telefone" type="tel" placeholder="Telefone" aria-label="Telefone" autoComplete="tel" />
            <Field as="select" name="tipo" aria-label="Tipo de projeto" defaultValue="">
              <option value="">— Selecione o tipo de projeto —</option>
            </Field>
            <Field as="textarea" name="mensagem" className="ds-field--area" placeholder="Conte em poucas palavras o que vocês estão construindo" aria-label="Sobre o projeto" />
            <Button variant="fill" type="submit">Enviar</Button>
            <span className="site-form-tile" aria-hidden="true"><img src={tile} alt="" width="24" height="24" /></span>
          </form>
        </div>
      </Section>
      {sent && <Sent onClose={() => setSent(false)} />}
    </>
  );
}
