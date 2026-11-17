/* Preparar o projeto (Figma C2–C5): equipe, criações, sobre o projeto e revisar e liberar.
   Só quem organiza vê estas telas, enquanto o projeto está sendo preparado. As regras vêm de @mip/domain. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SOBRE, TYPES, approved, elig, nm, roleTxt, sobreErrors, sobreKeys } from '@mip/domain';
import { AppButton, Avatar, AuthField, Chip } from '../../components/ds/index.js';
import { AppFrame, Bar, Hint, Panel, PanelHead, StepHead, TextButton, Wizard } from '../../components/journey/Shell.jsx';
import { Banner, copyText } from '../../components/ui.jsx';
import { setupRail } from '../NewProject.jsx';
import { useProject } from '../Project.jsx';
import checkOk from '../../assets/icons/check-ok.svg';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/* ===== C2: Equipe ===== */
export function SetupEquipe() {
  const { p, act, err, say } = useProject(), nav = useNavigate();
  const [rm, setRm] = useState(null);
  const url = p.link.code ? location.origin + '/convite/' + p.link.code : '';
  const msg = `Vamos combinar na MIP quem é dono do que criamos no ${p.name}? Leva uns 10 minutos e suas respostas são só suas. Entre pelo link: ${url}`;
  const copy = async (text, what) => say(await copyText(text) ? what + ' copiado. Mande no grupo da equipe.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.');
  const askRemove = async pid => { const r = await act('remove', { pid }, `/api/projects/${p.id}/remove`); if (r?.confirmRemove) setRm(r.confirmRemove); };
  const doRemove = async () => { const r = await act('remove', { pid: rm.pid, confirm: true }, `/api/projects/${p.id}/remove`); if (r) setRm(null); };
  const chip = m => (m.pid === p.org ? <Chip>Organiza</Chip> : m.status === 'ativo' ? (m.elig ? <Chip>Participa</Chip> : <Chip tone="warn">Entrou depois das respostas</Chip>) : m.status === 'pendente' ? <Chip tone="warn">Convite pendente</Chip> : <Chip>Não responde</Chip>);
  const n = elig(p).length;
  return (
    <Wizard rail={setupRail(2)} hint={<Hint>Inclua todo mundo que contribuiu, até quem já saiu. Você pode convidar mais pessoas a qualquer momento.</Hint>}>
      <StepHead eyebrow="Passo 2 de 5" title="Convide quem criou com você" sub="Mande o link para o grupo da equipe. Cada pessoa entra, responde em particular e ninguém vê as respostas dos outros." />
      <div className="jr-fields">
        <Panel>
          <PanelHead title="Link de convite" chip={<Chip tone={p.link.active ? 'ok' : 'neutral'}>{p.link.active ? 'Ativo' : 'Desativado'}</Chip>} />
          <div className="jr-row">
            <div className="jr-copy-field type-app-body">{url.replace(/^https?:\/\//, '')}</div>
            <AppButton onClick={() => copy(url, 'Link')} disabled={!p.link.active}>Copiar link</AppButton>
          </div>
          <div className="jr-wrap jr-wrap--lg">
            <AppButton kind="secondary" href={'https://wa.me/?text=' + encodeURIComponent(msg)} target="_blank" rel="noopener noreferrer">WhatsApp</AppButton>
            <AppButton kind="secondary" href={'mailto:?subject=' + encodeURIComponent('Convite para o ' + p.name) + '&body=' + encodeURIComponent(msg)}>E-mail</AppButton>
            <AppButton kind="secondary" onClick={() => copy(msg, 'Mensagem')}>Copiar mensagem pronta</AppButton>
            <TextButton className="jr-push" onClick={() => act('toglink')}>{p.link.active ? 'Desativar link' : 'Ativar link'}</TextButton>
          </div>
          <div className="jr-box"><p className="jr-box-label type-app-caption">Mensagem pronta</p><p className="jr-box-text type-app-small">{msg}</p></div>
        </Panel>
        <Panel>
          <PanelHead title="Quem já está no projeto" chip={<Chip tone="accent">{plural(n, 'pessoa', 'pessoas')}</Chip>} />
          {p.members.map(m => (
            <div key={m.pid}>
              <div className="jr-row">
                <div className="jr-row jr-grow">
                  <Avatar name={nm(p, m.pid)} />
                  <div className="jr-person-text"><span className="type-app-body">{nm(p, m.pid)}{m.pid === p.org && ' (você)'}</span><span className="jr-muted type-app-small">{roleTxt(p, m.pid)}{p.people[m.pid]?.email ? ' · ' + p.people[m.pid].email : ''}</span></div>
                </div>
                <div className="jr-row">{chip(m)}{m.pid !== p.org && rm?.pid !== m.pid && <TextButton onClick={() => askRemove(m.pid)}>Remover</TextButton>}</div>
              </div>
              {rm?.pid === m.pid && (
                <Banner k="warn" action={<span className="jr-wrap"><AppButton kind="small" onClick={() => setRm(null)}>Cancelar</AppButton><AppButton kind="danger" onClick={doRemove}>Remover do projeto</AppButton></span>}>
                  Remover {rm.name} do projeto?{rm.sent ? ' As respostas que ' + rm.name + ' já enviou serão apagadas.' : ''} Para voltar, será preciso adicionar de novo.
                </Banner>
              )}
            </div>
          ))}
          {err.np && <p className="jr-err type-app-small" role="alert">{err.np}</p>}
          <p className="jr-muted type-app-small">Quando alguém abrir o link, aparece aqui. Você não precisa esperar: pode seguir para o próximo passo.</p>
        </Panel>
      </div>
      <Bar left={<AppButton kind="secondary" onClick={() => nav('/inicio')}>Voltar</AppButton>}
        right={<><TextButton onClick={() => act('setupnext')}>Convidar depois</TextButton><AppButton onClick={() => act('setupnext')}>Salvar e continuar</AppButton></>} />
    </Wizard>
  );
}

/* ===== C3: Criações ===== */
export function SetupCriacoes() {
  const { p, act, go, err, setErr } = useProject();
  const [f, setF] = useState({ type: '', name: '' }), [confirmDel, setConfirmDel] = useState(null);
  const ty = TYPES.find(x => x.k === f.type), as = approved(p);
  const add = async () => { const r = await act('addasset', { ...f, desc: '', link: '' }); if (r) setF({ type: '', name: '' }); };
  const del = async (aid, confirm) => { const r = await act('del', { aid, confirm }); setConfirmDel(r?.confirmDelete || null); };
  return (
    <Wizard rail={setupRail(3)} hint={<Hint>Escolher o tipo certo é importante: ele acrescenta perguntas próprias, como licença para código ou registro para marca.</Hint>}>
      <StepHead eyebrow="Passo 3 de 5" title="O que vocês criaram juntos?" sub="Cadastre cada coisa separadamente: um app, um logo, uma música. A equipe vai responder sobre cada uma." />
      <div className="jr-fields">
        <Panel>
          <PanelHead title="Já cadastradas" chip={<Chip tone="accent">{as.length}</Chip>} />
          {!as.length && <p className="jr-muted type-app-small">Nenhuma criação ainda.</p>}
          {as.map(a => (
            <div key={a.id}>
              <div className="jr-row jr-row--pad">
                <div className="jr-person-text jr-grow">
                  <span className="jr-row jr-row--start"><span className="type-app-title-3">{a.name}</span><Chip>{a.cat}</Chip></span>
                  <span className="jr-muted type-app-small">{a.desc || 'Sem descrição'}</span>
                </div>
                <TextButton onClick={() => del(a.id, false)}>Remover</TextButton>
              </div>
              {confirmDel?.aid === a.id && (
                <Banner k="warn" action={<span className="jr-wrap"><AppButton kind="danger" onClick={() => del(a.id, true)}>Confirmar exclusão</AppButton><AppButton kind="small" onClick={() => setConfirmDel(null)}>Cancelar</AppButton></span>}>
                  {plural(confirmDel.n, 'resposta será descartada', 'respostas serão descartadas')}. Deseja excluir “{a.name}”?
                </Banner>
              )}
              {err['d' + a.id] && <p className="jr-err type-app-small" role="alert">{err['d' + a.id]}</p>}
            </div>
          ))}
        </Panel>
        <Panel strong>
          <h2 className="type-app-title-3">Adicionar outra criação</h2>
          <p className="jr-label type-app-caption" id="tipo-label">Que tipo de criação é?</p>
          <div className="jr-wrap" role="radiogroup" aria-labelledby="tipo-label">
            {TYPES.map(x => <button key={x.k} type="button" role="radio" aria-checked={f.type === x.k} className={'jr-pill jr-pill--type type-app-small' + (f.type === x.k ? ' is-on' : '')} onClick={() => { setF({ ...f, type: x.k }); setErr({}); }}>{x.n}</button>)}
          </div>
          {err.ft && <p className="jr-err type-app-small" role="alert">{err.ft}</p>}
          {ty && <p className="jr-muted type-app-small">{ty.n}: {ty.ex}</p>}
          <AuthField label="Nome" placeholder={ty ? ty.ph : 'Ex.: Telas do app'} value={f.name} onChange={e => { setF({ ...f, name: e.target.value }); setErr({}); }} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
          {err.fn && <p className="jr-err type-app-small" role="alert">{err.fn}</p>}
          <div><AppButton kind="secondary" onClick={add}>Adicionar criação</AppButton></div>
        </Panel>
      </div>
      <Bar left={<AppButton kind="secondary" onClick={() => go('equipe')}>Voltar</AppButton>}
        right={<>{!as.length && <span className="jr-muted type-app-small">Cadastre pelo menos 1 criação para continuar.</span>}<AppButton disabled={!as.length} onClick={() => act('setupnext')}>Salvar e continuar</AppButton></>} />
    </Wizard>
  );
}

/* ===== C4: Sobre o projeto =====
   A primeira pergunta do Figma tem quatro campos; o domínio guarda uma resposta só (contas). Os quatro viram um texto "Rótulo: valor; …". */
const CONTAS = ['Domínio', 'Repositório de código', 'Redes sociais', 'Marca'];
const CONTAS_PH = ['Domínio: nome de quem registrou', 'Repositório de código: nome do titular', 'Redes sociais: nome do titular', 'Marca: nome de quem registrou'];
const splitContas = txt => { const o = {}; String(txt || '').split('; ').forEach(part => { const i = part.indexOf(': '); const k = CONTAS.find(c => part.startsWith(c + ': ')); if (k && i > 0) o[k] = part.slice(k.length + 2); }); return o; };
const joinContas = o => CONTAS.filter(c => (o[c] || '').trim()).map(c => c + ': ' + o[c].trim()).join('; ');
/* Rótulos do Figma para as opções guardadas pelo domínio. */
const ROTULO = { Nenhum: 'Não existe acordo', Verbal: 'Só acordo verbal', Escrito: 'Acordo escrito', Sim: 'Sim, existe contrato ou edital', Não: 'Não, nenhum se aplica', 'Não sei': 'Ainda não verifiquei' };

export function SetupSobre() {
  const { p, go, err, setErr, editSobre } = useProject(), s = p.sobre || {}, keys = sobreKeys(s);
  const contas = splitContas(s.contas);
  const next = () => { const e = sobreErrors(s); if (Object.keys(e).length) { setErr(e); return; } setErr({}); go('revisar'); };
  return (
    <Wizard rail={setupRail(4)} hint={<Hint>Não existe resposta certa. Se ainda não verificou, escolha “Ainda não verifiquei”: isso também vai para o registro como ponto a verificar.</Hint>}>
      <StepHead eyebrow="Passo 4 de 5" title="Três perguntas sobre o projeto" sub="Só você responde, uma vez. Isso ajuda a equipe a saber de onde está partindo. Leva cerca de 1 minuto." />
      <div className="jr-fields">
        {keys.map(k => {
          const q = SOBRE[k], v = s[k] || '';
          if (k === 'contas') {
            return (
              <Panel key={k}>
                <h2 className="type-app-title-3">Quem aparece como dono de cada conta do projeto?</h2>
                <p className="jr-muted type-app-small">Pense em quem fez o cadastro ou paga a conta. Se ainda não existe, escreva &ldquo;ainda não existe&rdquo;.</p>
                {CONTAS.map((c, i) => <input key={c} className="jr-input type-app-small" aria-label={c} placeholder={CONTAS_PH[i]} value={contas[c] || ''} onChange={e => { setErr({}); editSobre({ contas: joinContas({ ...contas, [c]: e.target.value }) }); }} />)}
                {err['sobre:contas'] && <p className="jr-err type-app-small" role="alert">{err['sobre:contas']}</p>}
              </Panel>
            );
          }
          if (q.kind === 'text') {
            return (
              <Panel key={k}>
                <h2 className="type-app-title-3">{q.label}</h2>
                <input className="jr-input type-app-small" aria-label={q.label} placeholder={q.ph} value={v} onChange={e => { setErr({}); editSobre({ [k]: e.target.value }); }} />
              </Panel>
            );
          }
          return (
            <Panel key={k}>
              <h2 className="type-app-title-3" id={'q-' + k}>{q.label}</h2>
              {q.hint && <p className="jr-muted type-app-small">{q.hint}</p>}
              <div className="jr-options-col" role="radiogroup" aria-labelledby={'q-' + k}>
                {q.opts.map(o => <button key={o} type="button" role="radio" aria-checked={v === o} className={'jr-opt type-app-small' + (v === o ? ' is-on' : '')} onClick={() => { setErr({}); editSobre({ [k]: o }); }}>{ROTULO[o] || o}</button>)}
              </div>
              {err['sobre:' + k] && <p className="jr-err type-app-small" role="alert">{err['sobre:' + k]}</p>}
            </Panel>
          );
        })}
      </div>
      <Bar left={<AppButton kind="secondary" onClick={() => go('ativos')}>Voltar</AppButton>} right={<AppButton onClick={next}>Salvar e continuar</AppButton>} />
    </Wizard>
  );
}

/* ===== C5: Revisar e liberar ===== */
export function SetupRevisar() {
  const { p, act, go } = useProject(), as = approved(p), keys = sobreKeys(p.sobre).filter(k => !SOBRE[k].optional);
  const feitas = keys.length - Object.keys(sobreErrors(p.sobre)).length;
  const nomes = as.map(a => a.name), lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes.at(-1) : nomes[0] || '';
  const Row = ({ title, text, to }) => (
    <Panel className="jr-panel--row">
      <div className="jr-row jr-grow"><span className="jr-tick"><img src={checkOk} alt="" width="12" height="12" /></span><div className="jr-person-text"><span className="type-app-title-3">{title}</span><span className="jr-muted type-app-small">{text}</span></div></div>
      <TextButton onClick={() => go(to)}>Editar</TextButton>
    </Panel>
  );
  const AGORA = ['Cada pessoa abre o link, entra e responde em particular.', 'Você acompanha quem já respondeu, sem ver as respostas.', 'Quando você encerrar, a equipe conversa só sobre o que divergiu.'];
  return (
    <Wizard rail={setupRail(5)} hint={<Hint>Você também responde. Ninguém vê as respostas de ninguém até você encerrar a coleta.</Hint>}>
      <StepHead eyebrow="Passo 5 de 5" title="Tudo pronto para liberar" sub="Confira o resumo. Depois que você liberar, cada pessoa recebe as perguntas e responde em particular." />
      <div className="jr-fields">
        <Row title="Projeto" text={p.name + (p.context ? ' · ' + p.context : '')} to="proj" />
        <Row title="Equipe" text={`${plural(elig(p).length, 'pessoa', 'pessoas')} no projeto · link de convite ${p.link.active ? 'ativo' : 'desativado'}`} to="equipe" />
        <Row title="Criações" text={`${plural(as.length, 'criação', 'criações')}: ${lista}`} to="ativos" />
        <Row title="Sobre o projeto" text={`${feitas} de ${keys.length} perguntas respondidas`} to="sobre" />
        <Panel>
          <p className="jr-eyebrow type-v2-eyebrow">O que acontece agora</p>
          {AGORA.map((t, i) => <p key={t} className="jr-step-line type-app-small"><span className="jr-num type-app-caption">{i + 1}</span>{t}</p>)}
        </Panel>
      </div>
      <Bar left={<AppButton kind="secondary" onClick={() => go('sobre')}>Voltar</AppButton>} right={<AppButton onClick={() => act('setupassets')}>Liberar perguntas para a equipe</AppButton>} />
    </Wizard>
  );
}

export const SetupFrame = ({ children }) => <AppFrame>{children}</AppFrame>;
