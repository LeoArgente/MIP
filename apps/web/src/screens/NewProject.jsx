/* Criar projeto: nome da pessoa, nome do projeto e contexto. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import { Btn, Err, useToast } from '../components/ui.jsx';

export default function NewProject() {
  const { me, refresh } = useSession(), nav = useNavigate(), say = useToast();
  const [f, setF] = useState({ person: me?.name || '', name: '', context: '' }), [err, setErr] = useState({}), [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
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
    <>
      <Header />
      <main className="onboarding">
        <div><h1>Vamos começar pelo seu projeto.</h1><p>Dê um nome ao projeto e diga como prefere ser chamado. Na próxima tela, você poderá reunir a equipe.</p></div>
        <form onSubmit={submit} noValidate>
          <div className="field"><label htmlFor="person">Seu nome</label><input id="person" type="text" value={f.person} onChange={set('person')} placeholder="Como a equipe conhece você?" autoComplete="name" /><Err msg={err.person} /></div>
          <div className="field"><label htmlFor="pn">Nome do projeto</label><input id="pn" type="text" value={f.name} onChange={set('name')} placeholder="Ex.: Nosso aplicativo" /><Err msg={err.pn} /></div>
          <div className="field"><label htmlFor="pc">Breve contexto <span className="muted">(opcional)</span></label><input id="pc" type="text" value={f.context} onChange={set('context')} placeholder="O que sua equipe está criando?" /></div>
          <Err msg={err._} />
          <div className="acts"><button className="btn pri" disabled={busy}>Criar projeto</button><Btn onClick={() => nav('/')}>Voltar à apresentação</Btn></div>
        </form>
      </main>
    </>
  );
}
