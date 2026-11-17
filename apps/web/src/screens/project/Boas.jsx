/* Boas-vindas de quem entrou por convite (Figma D2): três coisas antes de começar. */
import { useState } from 'react';
import { AppButton, AuthField } from '../../components/ds/index.js';
import { AppFrame, TextButton } from '../../components/journey/Shell.jsx';

const CARTOES = [
  ['Responda sobre você', 'Sua função e como contribuiu em cada criação.'],
  ['Fica tudo guardado', 'Suas respostas são salvas sozinhas. Volte quando quiser.'],
  ['Só o que diverge', 'Depois vocês conversam apenas sobre o que não bate.']
];

export function Boas({ name, onStart }) {
  const [n, setN] = useState(name || ''), [e, setE] = useState('');
  const go = async comecar => { if (!n.trim()) { setE('Diga como a equipe conhece você'); return; } await onStart(n.trim(), comecar); };
  const first = (name || n).trim().split(/\s+/)[0];
  return (
    <AppFrame>
      <main className="jr-welcome-d">
        <div className="jr-welcome-d-col">
          <header className="jr-head jr-head--center">
            <p className="jr-eyebrow type-v2-eyebrow">Boas-vindas{first ? ', ' + first : ''}</p>
            <h1 className="jr-title type-v2-heading-h3">Três coisas antes de começar</h1>
            <p className="jr-sub type-v2-body">É rápido e você pode parar quando quiser.</p>
          </header>
          <ol className="jr-cards3">
            {CARTOES.map(([t, d], i) => (
              <li key={t} className="jr-card3">
                <span className="jr-num3 type-app-title-3">{i + 1}</span>
                <h2 className="type-app-title-3">{t}</h2>
                <p className="jr-sec type-app-small">{d}</p>
              </li>
            ))}
          </ol>
          {!(name || '').trim() && (
            <div className="jr-fields">
              <AuthField label="Como a equipe conhece você?" autoComplete="name" value={n} onChange={x => { setN(x.target.value); setE(''); }} onKeyDown={x => x.key === 'Enter' && go(true)} />
              {e && <p className="jr-err type-app-small" role="alert">{e}</p>}
            </div>
          )}
          <div className="jr-stack jr-stack--center">
            <AppButton onClick={() => go(true)}>Começar a responder</AppButton>
            <TextButton onClick={() => go(false)}>Ir para o painel do projeto</TextButton>
          </div>
        </div>
      </main>
    </AppFrame>
  );
}
