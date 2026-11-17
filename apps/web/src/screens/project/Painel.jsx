/* Painel do projeto (Figma C6): cabeçalho, abas, trilha de fases, próximo passo, equipe e atividade.
   As regras (próxima tarefa, quem respondeu, histórico) vêm de @mip/domain, como antes. */
import { approved, ansOf, elig, fmt, nm, phaseName, taskFor, secInfo } from '@mip/domain';
import { AppButton, Avatar, Chip } from '../../components/ds/index.js';
import { Panel, PanelHead, TextButton } from '../../components/journey/Shell.jsx';
import { Satisfaction } from '../../components/Feedback.jsx';
import { useProject } from '../Project.jsx';
import { TIPS } from '../ProjectScreens.jsx';
import checkOk from '../../assets/icons/check-ok.svg';

const FASES = [['Preparação', ''], ['Respostas', 'Cada pessoa responde'], ['Conversa', 'Só o que diverge'], ['Confirmação', 'Todos confirmam'], ['Acordo', 'Documento final']];
/* Em que fase o projeto está (0 a 4). */
export const faseIdx = p => (p.phase === 'coleta' ? (p.setupStep === 'resp' ? 1 : 0) : { encerrada: 2, decisao: 2, confirmacao: 3, consolidado: 4 }[p.phase] ?? 1);
const qposOf = (p, me) => Object.fromEntries(Object.entries(p.answers[me] || {}).map(([aid, an]) => [aid, an.step]));
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

/* Abas do projeto: Resumo, Equipe, Criações, Respostas, Decisões e Registro. */
export const TABS = [['proj', 'Resumo'], ['equipe', 'Equipe'], ['ativos', 'Criações'], ['resp', 'Respostas'], ['decidir', 'Decisões'], ['memorial', 'Registro']];
const ABA_DE = { sobre: 'ativos', coleta: 'resp', conf: 'decidir' };

export function ProjectHeader() {
  const { p, me, org, tab, go } = useProject(), fase = phaseName(p);
  const ativa = ABA_DE[tab] || tab;
  const tone = p.phase === 'consolidado' ? 'ok' : p.phase === 'coleta' && p.setupStep === 'resp' ? 'warn' : 'neutral';
  const people = p.members.filter(m => m.status !== 'pendente');
  const on = k => (k === 'proj' ? true : secInfo(p, me, k === 'ativos' ? 'ativos' : k).on);
  return (
    <div className="jr-pjhead">
      <div className="jr-row">
        <div className="jr-person-text">
          <p className="jr-eyebrow type-v2-eyebrow">Projeto</p>
          <div className="jr-row jr-row--start jr-pjname">
            <h1 className="jr-title type-v2-heading-h3">{p.name}</h1>
            <Chip tone="accent">{org ? 'Você organiza' : 'Você participa'}</Chip>
            <Chip tone={tone}>{fase}</Chip>
          </div>
        </div>
        <div className="jr-row">
          <div className="jr-wrap">{people.slice(0, 3).map(m => <Avatar key={m.pid} name={nm(p, m.pid)} />)}{people.length > 3 && <span className="ds-avatar type-app-caption">+{people.length - 3}</span>}</div>
          {org && <AppButton kind="secondary" onClick={() => go('equipe')}>Convidar pessoas</AppButton>}
        </div>
      </div>
      <nav className="jr-tabs" aria-label="Abas do projeto">
        {TABS.map(([k, n]) => on(k)
          ? <button key={k} type="button" className={'jr-tab ' + (k === ativa ? 'is-on type-app-title-3' : 'type-app-body')} aria-current={k === ativa ? 'page' : undefined} onClick={() => go(k)}>{n}</button>
          : <span key={k} className="jr-tab is-off type-app-body">{n}</span>)}
      </nav>
    </div>
  );
}

export function Fases() {
  const { p } = useProject(), idx = faseIdx(p), fim = p.phase === 'consolidado';
  return (
    <ol className="jr-fases" aria-label="Fases do projeto">
      {FASES.map(([nome, sub], i) => {
        const st = i < idx || (fim && i === 4) ? 'done' : i === idx ? 'now' : 'later';
        return (
          <li key={nome} className={'jr-fase is-' + st} aria-current={st === 'now' ? 'step' : undefined}>
            <div className="jr-fase-mark"><span className="jr-dot type-app-caption">{st === 'done' ? <img src={checkOk} alt="" width="12" height="12" /> : i + 1}</span>{i < 4 && <span className="jr-fase-line" />}</div>
            <span className={st === 'now' ? 'type-app-title-3' : 'type-app-body jr-sec'}>{nome}</span>
            <span className="jr-muted type-app-small">{st === 'done' ? 'Concluída' : sub || 'Preparar o projeto'}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ProximoPasso() {
  const { p, me, go, setUi, ui } = useProject(), t = taskFor(p, me, qposOf(p, me)), as = approved(p);
  const feitas = as.filter(a => ansOf(p, me, a.id)?.sent).length;
  const start = () => { if (t.tab === 'resp') { const nx = as.find(a => !ansOf(p, me, a.id)?.sent); if (nx) setUi({ qasset: nx.id, qstep: ansOf(p, me, nx.id)?.step || 0 }); } go(t.tab); };
  const tip = TIPS[t.tab];
  return (
    <section className="jr-next" aria-labelledby="next-title">
      <div className="jr-next-text">
        <p className="jr-eyebrow type-v2-eyebrow">Seu próximo passo</p>
        <h2 id="next-title" className="type-app-title">{t.label}</h2>
        <p className="jr-sub type-v2-body">{t.note}</p>
        {t.tab === 'resp' && as.length > 0 && <div className="jr-row jr-row--start"><span className="jr-sec type-app-small">{feitas} de {plural(as.length, 'criação', 'criações')}</span><Chip tone={feitas === as.length ? 'ok' : feitas ? 'warn' : 'neutral'}>{feitas === as.length ? 'Respondeu' : feitas ? 'Respondendo' : 'Não começou'}</Chip></div>}
      </div>
      {t.tab !== 'proj' && (
        <div className="jr-next-actions">
          <AppButton onClick={start}>{t.cta || 'Continuar'}</AppButton>
          {tip && <TextButton onClick={() => setUi({ tipOpen: ui.tipOpen === t.tab ? null : t.tab })}>Como funciona?</TextButton>}
        </div>
      )}
      {tip && ui.tipOpen === t.tab && <ol className="jr-next-tip type-app-small">{tip.map(x => <li key={x}>{x}</li>)}</ol>}
    </section>
  );
}

function EquipeCard() {
  const { p, me, org, act } = useProject(), E = elig(p), as = approved(p), open = p.phase === 'coleta' && p.setupStep === 'resp';
  const resp = E.filter(x => as.length && as.every(a => ansOf(p, x, a.id)?.sent)).length;
  return (
    <Panel className="jr-grow">
      <PanelHead title="Equipe" chip={<Chip>{resp} de {E.length} {E.length === 1 ? 'já respondeu' : 'já responderam'}</Chip>} />
      {p.members.filter(m => m.status !== 'pendente').map(m => {
        const isE = E.includes(m.pid), sent = as.filter(a => ansOf(p, m.pid, a.id)?.sent).length, done = as.length && sent === as.length;
        const pct = as.length ? (100 * sent / as.length) : 0;
        return (
          <div key={m.pid} className="jr-row">
            <div className="jr-row jr-grow">
              <Avatar name={nm(p, m.pid)} />
              <div className="jr-person-text jr-grow">
                <span className="type-app-body">{nm(p, m.pid)}{m.pid === me && ' (você)'}</span>
                <div className="jr-bar-mini" aria-hidden="true"><span className={done ? 'is-ok' : ''} style={{ width: Math.max(pct, 0.6) + '%' }} /></div>
              </div>
            </div>
            <div className="jr-state">
              {!isE ? <Chip>Não responde</Chip> : done ? <Chip tone="ok">Respondeu</Chip> : sent ? <Chip tone="warn">Respondendo</Chip> : <Chip>Não começou</Chip>}
              {org && open && isE && !done && m.pid !== me && <TextButton onClick={() => act('remind', { pid: m.pid }, `/api/projects/${p.id}/remind`)}>Lembrar</TextButton>}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

function Atividade() {
  const { p } = useProject();
  return (
    <Panel className="jr-activity">
      <h2 className="type-app-title-3">Atividade recente</h2>
      {p.history.slice(0, 6).map((x, i) => (
        <div key={x.id || i} className="jr-event">
          <span className="jr-event-dot" aria-hidden="true" />
          <div className="jr-person-text"><span className="type-app-small">{(x.who === 'sistema' ? 'Sistema' : nm(p, x.who)) + ' ' + x.text}</span><span className="jr-muted type-app-caption">{fmt(x.at)}</span></div>
        </div>
      ))}
      {!p.history.length && <p className="jr-muted type-app-small">Sem registros.</p>}
    </Panel>
  );
}

export function Painel() {
  const { p } = useProject();
  return (
    <div className="jr-pj">
      <Fases />
      <ProximoPasso />
      {p.phase === 'consolidado' && <Satisfaction projectId={p.id} where="hub" />}
      <div className="jr-two">
        <EquipeCard />
        <Atividade />
      </div>
    </div>
  );
}
