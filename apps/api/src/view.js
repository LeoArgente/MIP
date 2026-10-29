/* O que cada pessoa recebe de um projeto.
   Regra central da MIP: ninguém vê as respostas das outras pessoas enquanto elas estão abertas.
   - Durante as respostas, só chegam as suas próprias e um marcador de "já enviou" das demais.
   - Depois que as respostas são encerradas, chegam as respostas por pergunta com o autor de cada uma
     e a participação percebida média, para a tela de Decisões mostrar quem escolheu o quê. */
import { approved, qsFor, itemStatus, partOf, elig } from '@mip/domain';

export function viewFor(p, me) {
  const answers = {};
  for (const [uid, byAsset] of Object.entries(p.answers)) {
    answers[uid] = {};
    for (const [aid, an] of Object.entries(byAsset)) {
      answers[uid][aid] = uid === me ? an : { sent: an.sent ? { at: an.sent.at } : null };
    }
  }
  /* Função e investimento de cada pessoa só aparecem para a equipe depois do encerramento das respostas. */
  const members = p.phase === 'coleta' ? p.members.map(m => (m.pid === me ? m : { ...m, perfil: { feito: !!(m.perfil && m.perfil.funcao && m.perfil.investiu) } })) : p.members;
  const out = { ...p, members, answers, me };
  if (p.phase !== 'coleta') {
    const stats = {}, parts = {};
    for (const a of approved(p)) {
      stats[a.id] = {};
      for (const q of qsFor(a)) {
        const r = itemStatus(p, a.id, q);
        stats[a.id][q] = { status: r.status, missing: r.missing, vals: r.vals };
      }
      parts[a.id] = partOf(p, a.id);
    }
    out.stats = stats; out.parts = parts;
  }
  /* O link de convite só interessa a quem organiza. */
  if (p.org !== me) out.link = { active: p.link.active };
  out.eligible = elig(p);
  return out;
}
