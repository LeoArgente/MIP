/* Convite por link: mostra o projeto e, com a conta aberta, entra na equipe. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../api.js';
import { useSession } from '../session.jsx';
import Header from '../components/Header.jsx';
import TestLogin from '../components/TestLogin.jsx';
import { Banner, Btn, Err, useToast } from '../components/ui.jsx';

export default function Invite() {
  const { code } = useParams(), { me, config } = useSession(), nav = useNavigate(), say = useToast();
  const [info, setInfo] = useState(null), [err, setErr] = useState({});
  useEffect(() => { get('/api/invite/' + code).then(setInfo).catch(x => setErr(x.err)); }, [code]);
  const join = async () => {
    try { const r = await post('/api/invite/' + code + '/join'); say(r.result.notice); nav('/p/' + r.id); } catch (x) { setErr(x.err); }
  };
  return (
    <>
      <Header />
      <main className="onboarding">
        {err._ && !info ? <Banner k="bad">{err._}</Banner> : info && (
          <>
            <div><h1>Convite para {info.name}</h1><p>{info.org} convidou você. Cada pessoa responde em particular, e ninguém vê suas respostas até o fim.</p></div>
            <div className="form">
              {!info.active ? <Banner k="warn">Este convite não está mais ativo. Peça um novo link a {info.org}.</Banner>
                : me ? <div className="acts"><Btn kind="pri" onClick={join}>Entrar no projeto</Btn></div>
                  : config.testLogin ? <TestLogin label="Entrar no projeto" onDone={join} />
                    : <div className="acts"><Btn kind="pri" onClick={() => nav('/entrar?next=' + encodeURIComponent('/convite/' + code))}>Entrar com e-mail</Btn></div>}
              <Err msg={err.link || err._} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
