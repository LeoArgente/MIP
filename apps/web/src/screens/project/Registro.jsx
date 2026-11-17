/* Registro do acordo (Figma C14): o documento com as decisões, o código de verificação e as ações para guardar.
   O texto e o código (hash) vêm das cópias geradas por @mip/domain e pela API, como antes. */
import { useEffect } from 'react';
import { QS, elig, fmtAns, lastV, memorialText, nm, pctTxt } from '@mip/domain';
import { AppButton } from '../../components/ds/index.js';
import { Panel } from '../../components/journey/Shell.jsx';
import { Banner, copyText } from '../../components/ui.jsx';
import { Satisfaction, markSeen } from '../../components/Feedback.jsx';
import { useProject } from '../Project.jsx';
import { Fases } from './Painel.jsx';
import checkOk from '../../assets/icons/check-ok.svg';

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const lista = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' e ' + xs.at(-1) : xs[0] || '');
/* Código curto no formato MIP-XXXX-XXXX-XXXX, a partir do hash da cópia. */
const codigo = h => 'MIP-' + (String(h || '').replace(/[^0-9a-f]/gi, '').slice(0, 12).toUpperCase().match(/.{1,4}/g) || []).join('-');

export function Registro() {
  const { p, act, say } = useProject(), lv = lastV(p), m = p.memorials[0], fim = p.phase === 'consolidado';
  /* Ver o registro libera o pedido de nota também na página do projeto. */
  const seen = !!m && fim;
  useEffect(() => { if (seen) markSeen(p.id); }, [seen, p.id]);
  if (!lv) return <Banner>O registro do acordo fica disponível depois do envio da primeira proposta.</Banner>;

  const quem = elig(p).filter(x => lv.conf[x]?.v === 'ok').map(x => nm(p, x));
  const data = new Date(m ? m.at : lv.at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const copiar = async txt => say(await copyText(txt) ? 'Texto copiado.' : 'Não foi possível copiar. Selecione o texto e copie manualmente.');
  const Row = ({ k, v }) => <div className="jr-ans jr-ans--line"><span className="jr-ans-k jr-ans-k--doc type-app-small">{k}</span><span className="type-app-small jr-grow">{v}</span></div>;

  return (
    <div className="jr-pj">
      <Fases />
      <div className="jr-two jr-two--reg">
        <article className="jr-doc" aria-label="Registro do acordo">
          <p className="jr-eyebrow type-v2-eyebrow">Registro de acordo · {p.name}</p>
          <h2 className="type-app-title">Registro do acordo de criação coletiva</h2>
          <p className="jr-muted type-app-small">Registrado em {data}{quem.length ? ' · confirmado por ' + lista(quem) + '.' : '.'}</p>
          {Object.entries(lv.snap).map(([aid, s]) => (
            <section key={aid} className="jr-doc-sec">
              <h3 className="type-app-title-3">{s.name}</h3>
              {s.semAcordo ? <Row k="Situação" v="Ainda sem acordo" /> : (
                <>
                  {s.qs.map(q => <Row key={q} k={QS[q].short} v={fmtAns(p, q, s.v[q])} />)}
                  {s.externo && <Row k="Titular pretendido fora da equipe" v={s.externo} />}
                  <Row k="Percentuais acordados" v={pctTxt(p, s)} />
                </>
              )}
              {s.texto && <Row k="Explicações e pendências" v={s.texto} />}
            </section>
          ))}
          <p className="jr-muted type-app-caption">Este registro documenta a intenção declarada pela equipe. Não substitui contrato nem registro oficial de propriedade intelectual.</p>
          {!fim && <Banner k="warn">Proposta em aberto: este registro ainda pode mudar até todos confirmarem.</Banner>}
        </article>
        <div className="jr-side">
          {m && (
            <Panel className="jr-lateral">
              <span className="jr-bigcheck jr-bigcheck--sm"><img src={checkOk} alt="" width="12" height="12" /></span>
              <h3 className="type-app-title-3">Acordo verificado</h3>
              <p className="jr-sec type-app-small">Use este código para provar que o registro não foi alterado.</p>
              <p className="jr-code type-app-title-3">{codigo(m.hash)}</p>
              <AppButton kind="secondary" className="jr-block" onClick={() => copiar(codigo(m.hash))}>Copiar código</AppButton>
            </Panel>
          )}
          <Panel className="jr-lateral">
            <h3 className="type-app-title-3">Guardar este acordo</h3>
            {m ? (
              <>
                <AppButton className="jr-block" onClick={() => window.print()}>Baixar PDF</AppButton>
                <AppButton kind="secondary" className="jr-block" disabled>Enviar por e-mail à equipe</AppButton>
                <AppButton kind="secondary" className="jr-block" onClick={() => copiar(memorialText(m))}>Copiar texto</AppButton>
                <AppButton kind="secondary" className="jr-block" onClick={() => act('genmem')}>Gerar nova cópia</AppButton>
                <p className="jr-muted type-app-small">{plural(p.memorials.length, 'cópia gerada', 'cópias geradas')} neste projeto.</p>
              </>
            ) : <AppButton className="jr-block" onClick={() => act('genmem')}>Gerar registro do acordo</AppButton>}
          </Panel>
        </div>
      </div>
      {m && fim && <Satisfaction projectId={p.id} where="memorial" />}
    </div>
  );
}
