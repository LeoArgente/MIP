/* Confirmação da equipe (Figma C13): quem já confirmou a proposta, e a proposta para ler, confirmar ou recusar.
   As regras (quem pode confirmar, recusar e editar) vêm de @mip/domain e da API, como antes. */
import { useState } from 'react';
import { QS, ansOf, approved, elig, fmt, fmtAns, lastV, nm, pctTxt, partTxt } from '@mip/domain';
import { AppButton, AuthField, Avatar, Chip } from '../../components/ds/index.js';
import { Panel, PanelHead } from '../../components/journey/Shell.jsx';
import { Banner } from '../../components/ui.jsx';
import { useProject } from '../Project.jsx';
import { Fases } from './Painel.jsx';
import { keyOf, ptsOf, votesOf } from './pontos.js';
import checkBox from '../../assets/icons/checkbox-check.svg';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
export const confirmedBy = (p, lv) => elig(p).filter(x => lv.conf[x]?.v === 'ok');
/* Editar durante a confirmação: só pede confirmação da edição quando alguém já confirmou. */
function editNote(p, lv, me) {
  const ns = confirmedBy(p, lv).map(x => (x === me ? 'você' : nm(p, x)));
  if (ns.length === 1 && ns[0] === 'você') return 'Você já confirmou. Se editar, vai precisar confirmar de novo.';
  const s = ns.length > 1 ? ns.slice(0, -1).join(', ') + ' e ' + ns.at(-1) : ns[0];
  return s.charAt(0).toUpperCase() + s.slice(1) + ' já ' + (ns.length > 1 ? 'confirmaram' : 'confirmou') + '. Se você editar, quem já confirmou precisa confirmar de novo.';
}

/* Uma versão da proposta: criação por criação, com o que mudou desde a anterior. */
function Versao({ v, curr }) {
  const { p } = useProject(), E = elig(p), pv = curr && p.versions.find(x => x.n === v.n - 1);
  const chg = (aid, q) => {
    if (!pv) return false;
    const a = pv.snap[aid], b = v.snap[aid];
    if (!a) return true;
    if (q === 'semAcordo') return !!a.semAcordo !== !!b.semAcordo;
    if (q === 'pct') return pctTxt(p, a) !== pctTxt(p, b);
    if (q === 'externo') return (a.externo || '') !== (b.externo || '');
    return fmtAns(p, q, a.v[q]) !== fmtAns(p, q, b.v[q]);
  };
  const Mk = ({ x }) => (x ? <Chip tone="warn">mudou</Chip> : null);
  const Row = ({ k, children }) => <div className="jr-ans"><span className="jr-ans-k type-app-caption">{k}</span><span className="type-app-small jr-grow">{children}</span></div>;
  const nChg = pv ? Object.keys(v.snap).reduce((t, aid) => t + (chg(aid, 'semAcordo') ? 1 : v.snap[aid].qs.filter(q => chg(aid, q)).length + (chg(aid, 'pct') ? 1 : 0) + (chg(aid, 'externo') ? 1 : 0)), 0) : 0;
  return (
    <Panel>
      <PanelHead title={'Proposta ' + v.n} chip={<span className="jr-row jr-row--start">{curr ? <Chip tone="accent">Atual</Chip> : <Chip>Anterior</Chip>}<span className="jr-muted type-app-caption">{fmt(v.at)}</span></span>} />
      {pv && <p className="jr-muted type-app-small">{nChg ? plural(nChg, 'ponto mudou', 'pontos mudaram') + ' desde a proposta ' + pv.n + '.' : 'Nada mudou desde a proposta ' + pv.n + '.'}</p>}
      {Object.entries(v.snap).map(([aid, s]) => (
        <div key={aid} className="jr-prop-group">
          <div className="jr-row jr-row--start"><h3 className="type-app-title-3">{s.name}</h3><Chip>{s.cat}</Chip></div>
          {s.semAcordo ? <Row k="Situação">Ainda sem acordo <Mk x={chg(aid, 'semAcordo')} /></Row> : (
            <>
              {s.part && <Row k="Participação percebida">{partTxt(p, s.part)}</Row>}
              {s.qs.map(q => <Row key={q} k={QS[q].short}>{fmtAns(p, q, s.v[q])} <Mk x={chg(aid, q)} /></Row>)}
              {s.externo && <Row k="Titular pretendido fora da equipe">{s.externo} <Mk x={chg(aid, 'externo')} /></Row>}
              <Row k="Percentuais acordados">{pctTxt(p, s)} <Mk x={chg(aid, 'pct')} /></Row>
            </>
          )}
          {s.texto && <p className="jr-muted type-app-small">{s.texto}</p>}
        </div>
      ))}
      {!curr && (
        <>
          {E.map(pid => { const c = v.conf[pid]; return <Row key={pid} k={nm(p, pid)}>{c ? (c.v === 'ok' ? 'Confirmou' : 'Recusou: ' + c.comment) + ' · ' + fmt(c.at) : 'Pendente'}</Row>; })}
          <p className="jr-muted type-app-small">Versão anterior, disponível apenas para consulta.</p>
        </>
      )}
    </Panel>
  );
}

export function Confirmacao() {
  const { p, me, org, act, err, setErr, ui, setUi, go } = useProject(), lv = lastV(p);
  const [ra, setRa] = useState([]), [why, setWhy] = useState('');
  if (!lv) return <Banner>Ainda não há proposta para confirmar. Quem organiza registra as decisões primeiro.</Banner>;
  const E = elig(p), c = lv.conf[me], ok = confirmedBy(p, lv), falta = E.length - ok.length, allOk = !falta;
  const sem = Object.values(lv.snap).filter(s => s.semAcordo).map(s => s.name), refs = E.filter(x => lv.conf[x]?.v === 'no');
  const can = p.phase === 'confirmacao' && E.includes(me) && !c;
  const pontos = approved(p).reduce((n, a) => n + ptsOf(p, a).length, 0);
  const startEdit = () => (ok.length ? setUi({ flag: { edit: true } }) : act('editok'));
  const lembrar = pid => act('remind', { pid }, `/api/projects/${p.id}/remind`);
  const fim = p.phase === 'consolidado';

  return (
    <div className="jr-pj">
      <Fases />
      <section className="jr-next" aria-labelledby="cf-t">
        <div className="jr-next-text">
          <p className="jr-eyebrow type-v2-eyebrow">{fim ? 'Acordo concluído' : 'Aguardando a equipe'}</p>
          <h2 id="cf-t" className="type-app-title">{fim ? 'Todas as pessoas confirmaram' : allOk ? 'Todos confirmaram a proposta' : (falta === 1 ? 'Falta 1 pessoa confirmar' : 'Faltam ' + falta + ' pessoas confirmarem') + ' a proposta'}</h2>
          <p className="jr-sub type-v2-body">{fim ? 'O registro do acordo está disponível.' : 'Quando todos confirmarem, o acordo é registrado automaticamente. Você receberá um e-mail.'}</p>
        </div>
        {fim && <div className="jr-next-actions"><AppButton onClick={() => go('memorial')}>Ver registro do acordo</AppButton></div>}
      </section>
      {refs.length > 0 && !fim && <Banner k="bad">{refs.map(k => nm(p, k) + ' recusou a proposta ' + lv.n + ': "' + lv.conf[k].comment + '"').join(' ')}</Banner>}
      {p.phase === 'confirmacao' && allOk && sem.length > 0 && <Banner k="warn" action={org && <AppButton kind="small" onClick={startEdit}>Reabrir proposta</AppButton>}>Todos confirmaram, mas {sem.join(', ')} ficou sem acordo. {org ? 'Quando a equipe decidir, reabra a proposta e registre a decisão.' : 'Quando a equipe decidir, ' + nm(p, p.org) + ' envia uma nova proposta.'}</Banner>}
      {p.phase === 'confirmacao' && !E.includes(me) && <Banner>Você não responde desta vez: entrou depois do fim das respostas ou foi tirado delas.</Banner>}
      {p.phase === 'confirmacao' && c && !allOk && <Banner>Sua confirmação foi registrada. Aguarde a posição das demais pessoas; ausência de resposta não significa concordância.</Banner>}

      <Panel>
        <PanelHead title="Quem confirmou" chip={<Chip>{ok.length} de {E.length}</Chip>} />
        {E.map(pid => {
          const x = lv.conf[pid];
          return (
            <div key={pid} className="jr-row jr-conf-row">
              <div className="jr-row jr-row--start jr-grow">
                <Avatar name={nm(p, pid)} />
                <div className="jr-person-text"><span className="type-app-body">{nm(p, pid)}{pid === me && ' (você)'}</span>{x && <span className="jr-muted type-app-caption">{fmt(x.at)}</span>}{x?.comment && <span className="jr-muted type-app-small">{x.comment}</span>}</div>
              </div>
              <div className="jr-state">
                {!x && org && p.phase === 'confirmacao' && pid !== me && <AppButton kind="small" onClick={() => lembrar(pid)}>Lembrar {nm(p, pid).split(' ')[0]}</AppButton>}
                {x ? (x.v === 'ok' ? <Chip tone="ok">{'Confirmou' + (pontos ? (pontos === 1 ? ' o ponto' : ' os ' + pontos + ' pontos') : '')}</Chip> : <Chip tone="bad">Recusou</Chip>) : <Chip tone="warn">Ainda não confirmou</Chip>}
              </div>
            </div>
          );
        })}
      </Panel>

      <Versao v={lv} curr />

      {can && (
        <Panel strong>
          {ui.flag.refusing ? (
            <>
              <PanelHead title={'Recusar a proposta ' + lv.n} />
              <p className="type-app-title-3" id="rfa">O que precisa mudar?</p>
              <p className="jr-muted type-app-small">Marque as criações. Elas voltam para {nm(p, p.org)} revisar.</p>
              <div className="jr-opts" role="group" aria-labelledby="rfa">
                {Object.entries(lv.snap).map(([aid, s]) => { const on = ra.includes(aid); return (
                  <label key={aid} className={'jr-optrow' + (on ? ' is-on' : '')}>
                    <input type="checkbox" className="sr" checked={on} onChange={() => setRa(on ? ra.filter(x => x !== aid) : [...ra, aid])} />
                    <span className="jr-box20" aria-hidden="true">{on && <img src={checkBox} alt="" width="12" height="12" />}</span>
                    <span className="type-app-body jr-grow">{s.name}</span>
                  </label>
                ); })}
              </div>
              {err.refa && <p className="jr-err type-app-small" role="alert">{err.refa}</p>}
              <label htmlFor="rf" className="type-app-title-3">Por quê?</label>
              <textarea id="rf" className="jr-area type-app-small" value={why} onChange={e => setWhy(e.target.value)} placeholder="Ex.: Acho que a divisão do Backend deveria seguir a contribuição" autoFocus />
              {err.refuse && <p className="jr-err type-app-small" role="alert">{err.refuse}</p>}
              <p className="jr-muted type-app-small">A equipe vê seu nome e o motivo. A proposta volta para ajuste e todos confirmam a nova versão.</p>
              <div className="jr-modal-actions">
                <AppButton kind="secondary" onClick={() => { setUi({ flag: {} }); setRa([]); setWhy(''); setErr({}); }}>Cancelar</AppButton>
                <AppButton kind="danger" onClick={() => act('refuse', { n: lv.n, assets: ra, comment: why })}>Enviar recusa</AppButton>
              </div>
            </>
          ) : ui.flag.edit && org ? (
            <>
              <PanelHead title="Editar proposta" />
              <p className="jr-muted type-app-small">{editNote(p, lv, me)}</p>
              <div className="jr-modal-actions"><AppButton kind="secondary" onClick={() => setUi({ flag: {} })}>Cancelar</AppButton><AppButton onClick={() => act('editok')}>Editar proposta</AppButton></div>
            </>
          ) : (
            <>
              <PanelHead title="Seu posicionamento" />
              <p className="jr-muted type-app-small">{org ? 'Você montou esta proposta. Confirme se ela está certa, ou edite antes que todos se posicionem.' : 'Confirme se a proposta representa o que a equipe combinou. Se algo precisar mudar, recuse e diga o quê.'}</p>
              <div className="jr-modal-actions">
                {org ? <AppButton kind="secondary" onClick={startEdit}>Editar proposta</AppButton> : <AppButton kind="secondary" onClick={() => setUi({ flag: { refusing: true } })}>Recusar</AppButton>}
                <AppButton onClick={() => act('conf', { n: lv.n })}>Confirmar proposta</AppButton>
              </div>
            </>
          )}
        </Panel>
      )}
      {org && p.phase === 'confirmacao' && !can && (ui.flag.edit ? (
        <Panel strong><PanelHead title="Editar proposta" /><p className="jr-muted type-app-small">{editNote(p, lv, me)}</p><div className="jr-modal-actions"><AppButton kind="secondary" onClick={() => setUi({ flag: {} })}>Cancelar</AppButton><AppButton onClick={() => act('editok')}>Editar proposta</AppButton></div></Panel>
      ) : <div><AppButton kind="secondary" onClick={startEdit}>Editar proposta</AppButton></div>)}

      {p.versions.length > 1 && (
        <details className="jr-more">
          <summary className="type-app-small">Versões anteriores ({p.versions.length - 1})</summary>
          <div className="jr-fields">{p.versions.slice(0, -1).reverse().map(v => <Versao v={v} key={v.n} />)}</div>
        </details>
      )}
    </div>
  );
}

/* D7 e D8: a pessoa convidada lê a proposta, confirma ou pede ajuste (a API confirma ou recusa a proposta inteira). */
export function ConfirmarProposta() {
  const { p, me, act, err, setErr } = useProject(), lv = lastV(p), as = approved(p);
  const [aj, setAj] = useState(null), [why, setWhy] = useState('');
  const pts = as.flatMap(a => ptsOf(p, a).map(q => ({ a, q })));
  const N = pts.length, txt = N === 1 ? 'o ponto' : 'os ' + N + ' pontos';
  const fechar = () => { setAj(null); setWhy(''); setErr({}); };
  return (
    <div className="jr-confirm">
      <div className="jr-confirm-col">
        <header className="jr-head">
          <div className="jr-row jr-row--start"><Chip>{p.name}</Chip><p className="jr-eyebrow type-v2-eyebrow">Confirmação · fase 4 de 5</p></div>
          <h1 className="jr-title jr-title--q type-app-title">Confira o que a equipe propôs</h1>
          <p className="jr-sub type-v2-body">{N ? `Estes são ${N === 1 ? 'o ponto' : 'os ' + N + ' pontos'} em que as respostas divergiam. Confirme se concorda ou peça um ajuste. Nada vira acordo até todos confirmarem.` : 'Confirme se a proposta representa o que a equipe combinou. Se algo precisar mudar, recuse e diga o quê.'}</p>
        </header>
        {pts.map(({ a, q }) => {
          const s = lv.snap[a.id], v = votesOf(p, a, q), mine = ansOf(p, me, a.id)?.sent?.[q], g = v.list.find(x => x.key === keyOf(q, s?.v?.[q]));
          return (
            <Panel key={a.id + q}>
              <div className="jr-row"><span className="jr-muted type-app-small">{QS[q].short} · {a.name}</span></div>
              <p className="type-app-title-2">{s?.semAcordo ? 'Sem acordo' : fmtAns(p, q, s?.v?.[q])}</p>
              <p className="jr-sec type-app-small">{mine !== undefined && 'Você votou: ' + fmtAns(p, q, mine) + ' · '}{g ? g.who.length : 0} de {v.n} escolheram esta</p>
              <div><AppButton kind="secondary" onClick={() => { setAj({ a, q }); setErr({}); }}>Pedir ajuste</AppButton></div>
            </Panel>
          );
        })}
        <div className="jr-bar"><span className="jr-muted type-app-small">Pode voltar depois: o que você confirmou fica salvo.</span><AppButton onClick={() => act('conf', { n: lv.n })}>{N ? 'Confirmar ' + txt : 'Confirmar proposta'}</AppButton></div>
        {err._ && <p className="jr-err type-app-small" role="alert">{err._}</p>}
      </div>
      {aj && (
        <div className="jr-overlay" onClick={fechar}>
          <div className="jr-modal" role="dialog" aria-modal="true" aria-labelledby="aj-t" onClick={e => e.stopPropagation()}>
            <div className="jr-modal-text">
              <p className="jr-eyebrow type-v2-eyebrow">Pedir ajuste · {QS[aj.q].short} ({aj.a.name})</p>
              <h2 id="aj-t" className="type-app-title-2">O que você mudaria?</h2>
              <p className="type-v2-body">A proposta atual é “{fmtAns(p, aj.q, lv.snap[aj.a.id]?.v?.[aj.q])}”. Explique em uma frase. A equipe será avisada.</p>
            </div>
            <AuthField label="Sua explicação (opcional)" placeholder="Ex.: prefiro que fique sem venda até lançarmos" value={why} onChange={e => setWhy(e.target.value)} autoFocus />
            {(err.refuse || err.refa) && <p className="jr-err type-app-small" role="alert">{err.refuse || err.refa}</p>}
            <div className="jr-modal-actions">
              <AppButton kind="secondary" onClick={fechar}>Cancelar</AppButton>
              <AppButton onClick={() => act('refuse', { n: lv.n, assets: [aj.a.id], comment: why })}>Enviar pedido de ajuste</AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
