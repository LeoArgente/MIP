/* Andamento das respostas (Figma C8) e confirmação de encerrar a coleta (Figma C9).
   Quem respondeu, o que falta e o encerramento vêm de @mip/domain e da API, como antes. */
import { useEffect, useState } from 'react';
import { approved, ansOf, elig, nm, perfilDone } from '@mip/domain';
import { AppButton, Avatar, Chip } from '../../components/ds/index.js';
import { Panel, PanelHead, TextButton } from '../../components/journey/Shell.jsx';
import { Banner, copyText } from '../../components/ui.jsx';
import { useProject } from '../Project.jsx';
import { Fases } from './Painel.jsx';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/* Estado de uma resposta: enviada, com rascunho ou ainda sem começar. */
const estado = an => (an?.sent ? ['ok', 'Enviou'] : an && (an.step > 0 || Object.values(an.draft || {}).some(v => (Array.isArray(v) ? v.length : v && (typeof v !== 'object' || Object.keys(v).length)))) ? ['warn', 'Respondendo'] : ['neutral', 'Não começou']);

/* C9: pergunta antes de encerrar. */
function Encerrar({ miss, total, onCancel, onOk }) {
  useEffect(() => {
    const key = e => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [onCancel]);
  const quem = miss.length ? miss.join(', ') + (miss.length > 1 ? ' ficarão' : ' ficará') + ' como “Sem resposta”, nunca como concordância.' : `Todas as ${total} pessoas já responderam.`;
  return (
    <div className="jr-overlay" onClick={onCancel}>
      <div className="jr-modal" role="dialog" aria-modal="true" aria-labelledby="enc-t" aria-describedby="enc-d" onClick={e => e.stopPropagation()}>
        <span className="jr-modal-mark type-app-title-2" aria-hidden="true">!</span>
        <div className="jr-modal-text">
          <h2 id="enc-t" className="type-app-title-2">Encerrar a coleta de respostas?</h2>
          <p id="enc-d" className="type-v2-body">{quem} Ao encerrar, as respostas ficam travadas e a equipe vê o que concorda e o que diverge. Não dá para voltar atrás.</p>
        </div>
        <div className="jr-modal-actions">
          <AppButton kind="secondary" onClick={onCancel}>Ainda não</AppButton>
          <AppButton onClick={onOk} autoFocus>Sim, encerrar</AppButton>
        </div>
      </div>
    </div>
  );
}

export function Andamento() {
  const { p, me, org, act, go, ui, setUi, say } = useProject(), E = elig(p), as = approved(p), open = p.phase === 'coleta';
  const [grp, setGrp] = useState('');
  const miss = E.filter(pid => as.some(a => !ansOf(p, pid, a.id)?.sent));
  const sent = E.reduce((n, pid) => n + as.filter(a => ansOf(p, pid, a.id)?.sent).length, 0), total = E.length * as.length;
  const people = p.members.filter(m => m.status !== 'pendente');
  const copyGroup = async () => {
    const t = 'Pessoal, faltam respostas na MIP: ' + miss.map(x => nm(p, x)).join(', ') + '. Acesse ' + location.origin + '/p/' + p.id;
    setGrp(t); say(await copyText(t) ? 'Mensagem copiada. Cole no grupo da equipe.' : 'Selecione a mensagem abaixo e copie.');
  };
  const closeNow = async () => { setUi({ flag: {} }); await act('closeok'); };

  return (
    <div className="jr-pj">
      <Fases />
      {org && open && as.length > 0 && (
        <section className="jr-next" aria-labelledby="and-t">
          <div className="jr-next-text">
            <p className="jr-eyebrow type-v2-eyebrow">Seu próximo passo</p>
            <h2 id="and-t" className="type-app-title">{miss.length ? 'Faltam respostas de ' + plural(miss.length, 'pessoa', 'pessoas') : 'Todos responderam. Encerre a coleta para ver as respostas'}</h2>
            <p className="jr-sub type-v2-body">{miss.length ? 'Você pode encerrar mesmo assim. ' : ''}Depois de encerrar, ninguém muda mais as respostas e a equipe passa a comparar o que cada um disse. Isso não pode ser desfeito.</p>
          </div>
          <div className="jr-next-actions"><AppButton onClick={() => setUi({ flag: { close: true } })}>Encerrar e comparar respostas</AppButton></div>
        </section>
      )}
      {org && open && !as.length && <Banner k="warn" action={<AppButton kind="small" onClick={() => go('ativos')}>Ir para Criações</AppButton>}>Cadastre ao menos uma criação antes de encerrar as respostas.</Banner>}
      {!org && open && <Banner>Quem organiza encerra as respostas explicitamente, mesmo quando todos já responderam.</Banner>}
      {!open && (
        <section className="jr-next" aria-labelledby="and-t">
          <div className="jr-next-text">
            <p className="jr-eyebrow type-v2-eyebrow">Seu próximo passo</p>
            <h2 id="and-t" className="type-app-title">Respostas encerradas. Agora é hora de decidir</h2>
          </div>
          <div className="jr-next-actions"><AppButton onClick={() => go('decidir')}>Comparar respostas</AppButton></div>
        </section>
      )}
      <Panel>
        <PanelHead title="Quem respondeu o quê" chip={<Chip tone={total && sent === total ? 'ok' : 'warn'}>{sent} de {total} respostas enviadas</Chip>} />
        <div className="jr-table" role="table" aria-label="Quem respondeu o quê">
          <div className="jr-trow jr-thead type-v2-eyebrow" role="row">
            <span className="jr-tperson" role="columnheader">Pessoa</span>
            <div className="jr-tcols">
              <span role="columnheader">Sobre você</span>
              {as.map(a => <span key={a.id} role="columnheader">{a.name}</span>)}
            </div>
          </div>
          {people.map(m => {
            const isE = E.includes(m.pid), nome = nm(p, m.pid) + (m.pid === me ? ' (você)' : '');
            const falta = isE && as.some(a => !ansOf(p, m.pid, a.id)?.sent);
            return (
              <div className="jr-trow" role="row" key={m.pid}>
                <div className="jr-tperson" role="cell"><Avatar name={nm(p, m.pid)} /><span className="type-app-body jr-grow">{nome}</span>{org && open && falta && m.pid !== me && <TextButton onClick={() => act('remind', { pid: m.pid }, `/api/projects/${p.id}/remind`)}>Lembrar</TextButton>}</div>
                <div className="jr-tcols">
                  {isE ? <>
                    <span role="cell">{perfilDone(p, m.pid) ? <Chip tone="ok">Enviou</Chip> : <Chip>Não começou</Chip>}</span>
                    {as.map(a => { const [tone, txt] = estado(ansOf(p, m.pid, a.id)); return <span key={a.id} role="cell"><Chip tone={tone}>{txt}</Chip></span>; })}
                  </> : <span role="cell" className="jr-tall"><Chip>{m.status === 'naopart' ? 'Não responde' : 'Entrou depois'}</Chip></span>}
                </div>
              </div>
            );
          })}
        </div>
        {org && open && as.length > 0 && miss.length > 0 && <div className="jr-row jr-row--start"><TextButton onClick={copyGroup}>Copiar mensagem para o grupo</TextButton></div>}
        {grp && <p className="jr-muted type-app-small">{grp}</p>}
      </Panel>
      {ui.flag.close && <Encerrar miss={miss.map(x => nm(p, x))} total={E.length} onCancel={() => setUi({ flag: {} })} onOk={closeNow} />}
    </div>
  );
}
