/* Confirmação da equipe (Figma C13): quem já confirmou a proposta, e a proposta para ler, confirmar ou recusar.
   As regras (quem pode confirmar, recusar e editar) vêm de @mip/domain e da API, como antes. */
import { useState } from 'react';
import { QS, ansOf, approved, elig, fmt, fmtAns, isP, lastV, nm, pctTxt } from '@mip/domain';
import { AppButton, AuthField, Avatar, Chip, RadioRow } from '../../components/ds/index.js';
import { Panel, PanelHead, TextButton } from '../../components/journey/Shell.jsx';
import { Banner } from '../../components/ui.jsx';
import { useProject } from '../Project.jsx';
import { Fases } from './Painel.jsx';
import { keyOf, ptsOf, votesOf } from './pontos.js';
import checkBox from '../../assets/icons/checkbox-check.svg';

export const confirmedBy = (p, lv) => elig(p).filter(x => lv.conf[x]?.v === 'ok');
/* Editar durante a confirmação: só pede confirmação da edição quando alguém já confirmou. */
function editNote(p, lv, me) {
  const ns = confirmedBy(p, lv).map(x => (x === me ? 'você' : nm(p, x)));
  if (ns.length === 1 && ns[0] === 'você') return 'Você já confirmou. Se editar, vai precisar confirmar de novo.';
  const s = ns.length > 1 ? ns.slice(0, -1).join(', ') + ' e ' + ns.at(-1) : ns[0];
  return s.charAt(0).toUpperCase() + s.slice(1) + ' já ' + (ns.length > 1 ? 'confirmaram' : 'confirmou') + '. Se você editar, quem já confirmou precisa confirmar de novo.';
}

/* Uma versão da proposta: os pontos que divergiam, com o que mudou desde a anterior. */
function Versao({ v, curr }) {
  const { p } = useProject(), E = elig(p), pv = curr && p.versions.find(x => x.n === v.n - 1), as = approved(p);
  const chg = (aid, q) => {
    if (!pv) return false;
    const a = pv.snap[aid], b = v.snap[aid];
    if (!a) return true;
    if (q === 'semAcordo') return !!a.semAcordo !== !!b.semAcordo;
    if (q === 'pct') return pctTxt(p, a) !== pctTxt(p, b);
    if (q === 'externo') return (a.externo || '') !== (b.externo || '');
    return fmtAns(p, q, a.v[q]) !== fmtAns(p, q, b.v[q]);
  };
  const Item = ({ k, children, mudou }) => <div className="jr-ver-item"><div className="jr-person-text jr-grow"><span className="jr-muted type-app-small">{k}</span><span className="type-app-body">{children}</span></div>{mudou && <Chip tone="warn">mudou</Chip>}</div>;
  const ok = E.filter(x => v.conf[x]?.v === 'ok').length;
  return (
    <Panel>
      <PanelHead title={'Proposta ' + v.n} chip={curr ? <Chip tone="ok">Atual</Chip> : <Chip>Anterior</Chip>} />
      <p className="jr-muted type-app-small">Enviada {fmt(v.at)}{!curr && ' · ' + ok + ' de ' + E.length + ' confirmaram'}</p>
      {Object.entries(v.snap).map(([aid, s]) => {
        const a = as.find(x => x.id === aid), pts = a ? ptsOf(p, a) : s.qs;
        return (
          <div key={aid} className="jr-prop-group">
            {s.semAcordo ? <Item k={s.name + ' · situação'} mudou={chg(aid, 'semAcordo')}>Ainda sem acordo</Item> : (
              <>
                {pts.map(q => <Item key={q} k={QS[q].short + ' · ' + s.name} mudou={chg(aid, q)}>{fmtAns(p, q, s.v[q])}</Item>)}
                {s.externo && <Item k={'Titular pretendido fora da equipe · ' + s.name} mudou={chg(aid, 'externo')}>{s.externo}</Item>}
                <Item k={'Percentuais acordados · ' + s.name} mudou={chg(aid, 'pct')}>{pctTxt(p, s)}</Item>
              </>
            )}
            {s.texto && <p className="jr-muted type-app-small">{s.texto}</p>}
          </div>
        );
      })}
      {!curr && E.map(pid => { const c = v.conf[pid]; return <p key={pid} className="jr-muted type-app-small">{nm(p, pid)}: {c ? (c.v === 'ok' ? 'Confirmou' : 'Recusou: ' + c.comment) + ' · ' + fmt(c.at) : 'Pendente'}</p>; })}
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

  if (org && p.phase === 'confirmacao' && ui.flag.edit) {
    const nomes = ok.map(x => (x === me ? 'Você' : nm(p, x).split(' ')[0])), lista = nomes.length > 1 ? nomes.slice(0, -1).join(', ') + ' e ' + nomes.at(-1) : nomes[0];
    const editar = async (a, q) => { const r = await act('editok'); if (r) setUi({ dq: a.id, dstep: Math.max(0, ptsOf(p, a).indexOf(q)), dedit: null, flag: {} }); };
    return (
      <div className="jr-pj">
        <Fases />
        {ok.length > 0 && <Banner k="warn" title={lista + ' já ' + (ok.length > 1 ? 'confirmaram' : 'confirmou') + ' a Proposta ' + lv.n}>Se você salvar uma nova versão, {ok.length > 1 ? 'as ' + ok.length + ' precisam' : 'essa pessoa precisa'} confirmar de novo.</Banner>}
        <header className="jr-head"><h2 className="type-app-title">Editar proposta</h2><p className="jr-sub type-v2-body">Altere só o que a equipe precisa rever. A nova versão vira Proposta {lv.n + 1}.</p></header>
        <Panel>
          <PanelHead title="Pontos da proposta" />
          {approved(p).flatMap(a => ptsOf(p, a).map(q => (
            <div key={a.id + q} className="jr-ver-item">
              <div className="jr-person-text jr-grow"><span className="jr-muted type-app-small">{QS[q].short} · {a.name}</span><span className="type-app-body">{lv.snap[a.id]?.semAcordo ? 'Sem acordo' : fmtAns(p, q, lv.snap[a.id]?.v?.[q])}</span></div>
              <AppButton kind="small" onClick={() => editar(a, q)}>Editar</AppButton>
            </div>
          )))}
        </Panel>
        <div className="jr-modal-actions"><AppButton kind="secondary" onClick={() => setUi({ flag: {} })}>Cancelar</AppButton><AppButton onClick={() => act('editok')}>Salvar como Proposta {lv.n + 1}</AppButton></div>
      </div>
    );
  }
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

      <header className="jr-head"><h2 className="type-app-title">Proposta {lv.n} · {fim ? 'confirmada' : 'aguardando a equipe'}</h2><p className="jr-sub type-v2-body">Você está lendo a versão atual. O que mudou desde a anterior aparece marcado.</p></header>
      <Versao v={lv} curr />

      {can && (
        <Panel strong>
          {ui.flag.edit && org ? (
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
      {can && ui.flag.refusing && (
        <div className="jr-overlay" onClick={() => { setUi({ flag: {} }); setRa([]); setWhy(''); setErr({}); }}>
          <div className="jr-modal" role="dialog" aria-modal="true" aria-labelledby="rf-t" onClick={e => e.stopPropagation()}>
            <div className="jr-modal-text">
              <h2 id="rf-t" className="type-app-title-2">Recusar a proposta {lv.n}</h2>
              <p className="type-v2-body">Escolha as criações que você não aceita e conte o motivo. A equipe é avisada e {nm(p, p.org)} revisa.</p>
            </div>
            <div className="jr-qblock">
              <p className="type-app-title-3" id="rfa">Quais criações você recusa?</p>
              <div className="jr-opts" role="group" aria-labelledby="rfa">
                {Object.entries(lv.snap).map(([aid, sn]) => { const on = ra.includes(aid); return (
                  <label key={aid} className={'jr-optrow' + (on ? ' is-on' : '')}>
                    <input type="checkbox" className="sr" checked={on} onChange={() => setRa(on ? ra.filter(x => x !== aid) : [...ra, aid])} />
                    <span className="jr-box20" aria-hidden="true">{on && <img src={checkBox} alt="" width="12" height="12" />}</span>
                    <span className="type-app-body jr-grow">{sn.name}</span>
                  </label>
                ); })}
              </div>
              {err.refa && <p className="jr-err type-app-small" role="alert">{err.refa}</p>}
            </div>
            <div className="jr-qblock">
              <label htmlFor="rf" className="type-app-title-3">Motivo (obrigatório)</label>
              <p className="jr-muted type-app-small">Conte em uma ou duas frases por que você recusa.</p>
              <textarea id="rf" className="jr-area type-app-small" value={why} onChange={e => setWhy(e.target.value)} placeholder="Ex.: não combinamos esse percentual." autoFocus />
              {err.refuse && <p className="jr-err type-app-small" role="alert">{err.refuse}</p>}
            </div>
            <div className="jr-modal-actions">
              <AppButton kind="secondary" onClick={() => { setUi({ flag: {} }); setRa([]); setWhy(''); setErr({}); }}>Cancelar</AppButton>
              <AppButton kind="danger" onClick={() => act('refuse', { n: lv.n, assets: ra, comment: why })}>Recusar selecionadas</AppButton>
            </div>
          </div>
        </div>
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

/* D7 e D8: a pessoa convidada lê a proposta, marca o que concorda e confirma ou recusa uma criação.
   A API confirma ou recusa a proposta inteira; as marcas por ponto ficam só nesta tela. */
export function ConfirmarProposta() {
  const { p, me, act, err, setErr } = useProject(), lv = lastV(p), as = approved(p);
  const [oks, marcar] = useState([]);
  const [aj, setAj] = useState(null), [why, setWhy] = useState('');
  const pts = as.flatMap(a => ptsOf(p, a).map(q => ({ a, q, k: a.id + q })));
  const N = pts.length, primeira = pts.find(x => !oks.includes(x.k));
  const fechar = () => { setAj(null); setWhy(''); setErr({}); };
  return (
    <div className="jr-confirm">
      <div className="jr-confirm-col">
        <header className="jr-head">
          <div className="jr-row jr-row--start"><Chip>{p.name}</Chip><p className="jr-eyebrow type-v2-eyebrow">Confirmação · fase 4 de 5</p></div>
          <h1 className="jr-title jr-title--q type-app-title">Confira o que a equipe propôs</h1>
          <p className="jr-sub type-v2-body">{N ? `Estes são ${N === 1 ? 'o ponto' : 'os ' + N + ' pontos'} em que as respostas divergiam. Confirme se concorda ou peça um ajuste. Nada vira acordo até todos confirmarem.` : 'Confirme se a proposta representa o que a equipe combinou. Se algo precisar mudar, recuse e diga o quê.'}</p>
        </header>
        {N > 0 && <p className="type-app-small jr-sec">{oks.filter(k => pts.some(x => x.k === k)).length} de {N} pontos marcados por você (só neste aparelho)</p>}
        {N > 0 && <p className="jr-note type-app-small">As marcas “Você confirmou” por ponto são locais: servem só para você acompanhar a leitura. O que vale é o botão “Confirmar a proposta”, que confirma tudo.</p>}
        {pts.map(({ a, q, k }) => {
          const s = lv.snap[a.id], v = votesOf(p, a, q), mine = ansOf(p, me, a.id)?.sent?.[q], g = v.list.find(x => x.key === keyOf(q, s?.v?.[q])), feito = oks.includes(k);
          const diff = mine !== undefined && keyOf(q, mine) !== keyOf(q, s?.v?.[q]);
          return (
            <Panel key={k} strong={primeira?.k === k}>
              <div className="jr-row"><span className="jr-muted type-app-small">{QS[q].short} · {a.name}</span>{feito ? <Chip tone="ok">Você confirmou</Chip> : <Chip tone="warn">Aguardando você</Chip>}</div>
              <p className="type-app-title-2">{s?.semAcordo ? 'Sem acordo' : fmtAns(p, q, s?.v?.[q])}</p>
              <p className="jr-sec type-app-small">{diff ? (isP(q) ? 'Você votou: ' + fmtAns(p, q, mine) : 'Você votou diferente') + ' · ' : ''}{g ? g.who.length : 0} de {v.n} escolheram esta</p>
              {feito
                ? <div><TextButton onClick={() => marcar(oks.filter(x => x !== k))}>Mudar minha resposta (até todos confirmarem)</TextButton></div>
                : <div className="jr-row jr-row--start"><AppButton onClick={() => marcar([...oks, k])}>Concordo</AppButton><AppButton kind="secondary" onClick={() => { setAj(a.id); setErr({}); }}>Pedir ajuste</AppButton></div>}
            </Panel>
          );
        })}
        <div className="jr-bar">
          <span className="jr-muted type-app-small">“Confirmar a proposta” confirma todos os pontos de uma vez. As marcas “Você confirmou” por ponto não ficam salvas.</span>
          <div className="jr-bar-right">
            <AppButton kind="secondary" onClick={() => { setAj(as[0]?.id || null); setErr({}); }}>Recusar uma criação</AppButton>
            <AppButton onClick={() => act('conf', { n: lv.n })}>Confirmar a proposta</AppButton>
          </div>
        </div>
        {err._ && <p className="jr-err type-app-small" role="alert">{err._}</p>}
      </div>
      {aj && (
        <div className="jr-overlay" onClick={fechar}>
          <div className="jr-modal" role="dialog" aria-modal="true" aria-labelledby="aj-t" onClick={e => e.stopPropagation()}>
            <div className="jr-modal-text">
              <p className="jr-eyebrow type-v2-eyebrow">Recusar criação</p>
              <h2 id="aj-t" className="type-app-title-2">Qual criação você recusa?</h2>
              <p className="type-v2-body">Escolha a criação e conte o motivo. A equipe é avisada e pode editar a proposta.</p>
            </div>
            <div className="jr-opts" role="radiogroup" aria-labelledby="aj-t">{as.map(a => <RadioRow key={a.id} name="rc" label={a.name} checked={aj === a.id} onChange={() => setAj(a.id)} />)}</div>
            <AuthField label="Motivo (obrigatório)" placeholder="Conte em uma frase por que você recusa" value={why} onChange={e => setWhy(e.target.value)} />
            {(err.refuse || err.refa) && <p className="jr-err type-app-small" role="alert">{err.refuse || err.refa}</p>}
            <div className="jr-modal-actions">
              <AppButton kind="secondary" onClick={fechar}>Cancelar</AppButton>
              <AppButton kind="danger" onClick={() => act('refuse', { n: lv.n, assets: [aj], comment: why })}>Recusar criação</AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
