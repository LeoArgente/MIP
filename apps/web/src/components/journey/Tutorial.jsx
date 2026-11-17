import { useEffect, useRef, useState } from 'react';
import { AppButton } from '../ds/index.js';
import checkOk from '../../assets/icons/check-ok.svg';
import radioMark from '../../assets/icons/radio-checked.svg';

const Phase = ({ n, title, text, first }) => (
  <li className="tut-phase">
    <span className={'tut-phase-dot type-app-caption' + (first ? ' is-on' : '')}>{n}</span>
    <span className="tut-phase-title type-app-title-3">{title}</span>
    <span className="tut-phase-text type-app-small">{text}</span>
  </li>
);
const Idea = ({ n, title, text }) => (
  <li className="tut-idea">
    <span className="tut-idea-dot type-app-caption">{n}</span>
    <span className="type-app-title-3">{title}</span>
    <span className="type-app-small tut-idea-text">{text}</span>
  </li>
);
const Tip = ({ title, text }) => <li className="tut-tip"><span className="type-app-title-3">{title}</span><span className="type-app-small tut-tip-text">{text}</span></li>;
const Radio = ({ on, label }) => (
  <div className={'ds-radio tut-radio' + (on ? ' is-on' : '')}>
    <span className="ds-radio-dot">{on && <img className="ds-radio-mark tut-mark" src={radioMark} alt="" />}</span>
    <span className="ds-radio-label type-app-body">{label}</span>
  </div>
);

const STEPS = [
  {
    eyebrow: 'O que é a MIP', title: 'Registre com a equipe quem criou o quê',
    text: 'A MIP ajuda vocês a combinar, de forma simples, quem é dono de cada criação. No final, todos confirmam e fica um documento guardado.',
    art: (
      <>
        <ul className="tut-ideas">
          <Idea n="1" title="Vocês criam juntos" text="um app, um logo, uma música" />
          <Idea n="2" title="Cada um responde" text="em particular, sem pressão" />
          <Idea n="3" title="Todos confirmam" text="e vira um documento" />
        </ul>
        <p className="tut-note type-app-caption">A MIP organiza as decisões da equipe. Ela não substitui contrato, advogado ou registro oficial.</p>
      </>
    )
  },
  {
    eyebrow: 'Como funciona', title: 'São 5 fases, uma de cada vez',
    text: 'Você nunca precisa decidir tudo de uma vez. Em cada fase a MIP mostra só a próxima ação.',
    art: (
      <ol className="tut-phases">
        <Phase first n="1" title="Preparação" text="Você · cerca de 5 min" />
        <Phase n="2" title="Respostas" text="Cada pessoa · cerca de 10 min" />
        <Phase n="3" title="Conversa" text="Equipe · só o que diverge" />
        <Phase n="4" title="Confirmação" text="Todos · 2 min" />
        <Phase n="5" title="Acordo" text="Documento final para guardar" />
      </ol>
    )
  },
  {
    eyebrow: 'Como você vai responder', title: 'Perguntas curtas, no seu ritmo',
    text: 'Cada criação tem poucas perguntas, em partes. Não existe resposta certa: dizer que ainda precisa verificar também vale.',
    art: (
      <div className="tut-split">
        <ul className="tut-tips">
          <Tip title="Em partes curtas" text="Uma criação por vez, com poucas perguntas por tela." />
          <Tip title="É privado" text="Ninguém vê suas respostas até todos terminarem." />
          <Tip title="Salva sozinho" text="Pode sair e voltar quando quiser: nada se perde." />
        </ul>
        <div className="tut-example">
          <p className="type-v2-eyebrow tut-example-label">EXEMPLO</p>
          <p className="type-app-small">Existe algum contrato ou edital sobre o que criaram?</p>
          <Radio label="Sim, existe" />
          <Radio on label="Não, nenhum se aplica" />
          <Radio label="Ainda não verifiquei" />
        </div>
      </div>
    )
  },
  {
    eyebrow: 'Tudo pronto', title: 'Vamos criar o seu projeto',
    text: 'Leva cerca de 5 minutos e você pode parar e continuar depois. Pode rever este tutorial quando quiser, pelo botão de ajuda.',
    art: (
      <div className="tut-next">
        <p className="type-v2-eyebrow tut-example-label">NOS PRÓXIMOS MINUTOS VOCÊ VAI</p>
        {['Dar um nome ao projeto', 'Convidar a equipe', 'Listar o que vocês criaram'].map(t => (
          <p key={t} className="tut-next-item type-app-body"><span className="tut-next-dot"><img src={checkOk} alt="" width="12" height="12" /></span>{t}</p>
        ))}
      </div>
    ),
    last: 'Começar meu projeto'
  }
];

/* Tutorial de primeira vez: 4 telas em uma janela sobre o fundo escurecido. */
export default function Tutorial({ onDone, onSkip }) {
  const [i, setI] = useState(0), box = useRef(null), s = STEPS[i];
  useEffect(() => { box.current?.focus(); }, [i]);
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onSkip(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onSkip]);
  return (
    <div className="tut-overlay">
      <div ref={box} tabIndex={-1} className="tut" role="dialog" aria-modal="true" aria-labelledby="tut-title">
        <div className="tut-top">
          <div className="tut-dots" aria-hidden="true">{STEPS.map((_, n) => <span key={n} className={'tut-dot' + (n === i ? ' is-now' : n < i ? ' is-past' : '')} />)}</div>
          <button type="button" className="jr-link type-app-small" onClick={onSkip}>Pular tutorial</button>
        </div>
        <div className="tut-text">
          <p className="type-v2-eyebrow tut-eyebrow">{s.eyebrow}</p>
          <h2 id="tut-title" className="type-app-title tut-title">{s.title}</h2>
          <p className="type-v2-body tut-sub">{s.text}</p>
        </div>
        <div className="tut-art">{s.art}</div>
        <div className="tut-actions">
          <div>{i > 0 && <AppButton kind="secondary" onClick={() => setI(i - 1)}>Voltar</AppButton>}</div>
          <div className="tut-actions-right">
            <span className="type-app-small tut-count">{i + 1} de {STEPS.length}</span>
            <AppButton onClick={() => (s.last ? onDone() : setI(i + 1))}>{s.last || 'Próximo'}</AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
