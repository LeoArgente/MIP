/* Criar projeto (Figma C1): passo 1 de 5, "Dê um nome ao seu projeto". */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppButton, AuthField } from '../components/ds/index.js';
import { AppFrame, Bar, Hint, Rail, StepHead, Wizard } from '../components/journey/Shell.jsx';
import { post } from '../api.js';
import { useSession } from '../session.jsx';
import { useToast } from '../components/ui.jsx';

export const SETUP_STEPS = ['Seu projeto', 'Equipe', 'Criações', 'Sobre o projeto', 'Revisar e liberar'];
export const setupRail = now => <Rail title="Preparar o projeto" count={`${now} de 5 passos`} value={now} total={5} items={SETUP_STEPS.map((label, i) => ({ label, state: i + 1 < now ? 'done' : i + 1 === now ? 'now' : 'later' }))} />;

const ATALHOS = ['Aplicativo ou site', 'Marca e identidade', 'Trabalho de faculdade', 'Música ou áudio', 'Produto físico'];

export default function NewProject() {
  const { refresh } = useSession(), nav = useNavigate(), say = useToast();
  const [f, setF] = useState({ name: '', context: '' }), [err, setErr] = useState({}), [busy, setBusy] = useState(false);
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErr({}); };
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr({});
    try {
      const { id } = await post('/api/projects', f);
      await refresh();
      say('Projeto criado. Primeiro, adicione quem participou.');
      nav('/p/' + id + '/equipe');
    } catch (x) { setErr(x.err); setBusy(false); }
  };
  return (
    <AppFrame>
      <form onSubmit={submit} noValidate>
        <Wizard rail={setupRail(1)} hint={<Hint>Use o nome que a equipe já usa no dia a dia, como o nome do app, da banda ou do trabalho.</Hint>}>
          <StepHead eyebrow="Passo 1 de 5" title="Dê um nome ao seu projeto" sub="É o nome que sua equipe vai ver no convite. Você pode mudar depois." />
          <div className="jr-fields">
            <AuthField label="Nome do projeto" placeholder="Ex.: App Rotas" value={f.name} onChange={set('name')} autoFocus />
            {err.pn && <p className="jr-err type-app-small" role="alert">{err.pn}</p>}
            <AuthField label="O que a equipe está criando? (opcional)" placeholder="Conte em uma frase" value={f.context} onChange={set('context')} />
            <div className="jr-box jr-box--bare">
              <p className="jr-label type-app-caption">Ou escolha um ponto de partida</p>
              <div className="jr-wrap">{ATALHOS.map(a => { const on = f.context === a; return <button key={a} type="button" className={'jr-pill type-app-small' + (on ? ' is-on' : '')} aria-pressed={on} onClick={() => setF({ ...f, context: on ? '' : a })}>{a}</button>; })}</div>
            </div>
            {err._ && <p className="jr-err type-app-small" role="alert">{err._}</p>}
          </div>
          <Bar left={<span className="type-app-small">Salvo automaticamente</span>} right={<AppButton type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar e continuar'}</AppButton>} />
        </Wizard>
      </form>
    </AppFrame>
  );
}
