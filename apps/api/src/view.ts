/* O que cada pessoa recebe de um projeto.
   Regra central da MIP: ninguém vê as respostas das outras pessoas enquanto elas estão abertas.
   - Durante as respostas, só chegam as suas próprias e um marcador de "já enviou" das demais.
   - Depois que as respostas são encerradas, chegam as respostas por pergunta com o autor de cada uma
     e a participação percebida média, para a tela de Decisões mostrar quem escolheu o quê. */
import { approved, qsFor, itemStatus, partOf, elig } from '@mip/domain';
import type { Pid, Aid, Membro, EntradaResposta, Projeto } from '@mip/domain';
import type { ProjetoCompleto } from './store.js';

/** Resposta de outra pessoa como chega a quem vê: só se ela já enviou, e quando. Nem rascunho, nem conteúdo. */
export interface MarcadorEnvio { sent: { at: number | undefined } | null }
/** Integrante visto por outra pessoa durante a coleta: no lugar da função e do investimento, só se já respondeu. */
export type MembroOculto = Omit<Membro, 'perfil'> & { perfil: { feito: boolean } };
/**
 * O projeto como cada pessoa o recebe.
 * - answers: as próprias respostas inteiras; das outras pessoas, só o MarcadorEnvio.
 * - members: durante a coleta, o perfil das outras pessoas vira MembroOculto.
 * - stats e parts: só depois da coleta (vals leva o autor de cada resposta).
 * - link: o código de convite só vai para quem organiza.
 */
export interface Vista extends Omit<ProjetoCompleto, 'members' | 'answers' | 'link'> {
  members: (Membro | MembroOculto)[];
  answers: Record<Pid, Record<Aid, EntradaResposta | MarcadorEnvio>>;
  me: Pid;
  link: { active: boolean; code?: string };
  stats?: NonNullable<Projeto['stats']>;
  parts?: NonNullable<Projeto['parts']>;
  eligible?: Pid[];
}

export function viewFor(p: ProjetoCompleto, me: Pid): Vista {
  const answers: Vista['answers'] = {};
  for (const [uid, byAsset] of Object.entries(p.answers)) {
    answers[uid] = {};
    for (const [aid, an] of Object.entries(byAsset)) {
      answers[uid][aid] = uid === me ? an : { sent: an.sent ? { at: an.sent.at } : null };
    }
  }
  /* Função e investimento de cada pessoa só aparecem para a equipe depois do encerramento das respostas. */
  const members = p.phase === 'coleta' ? p.members.map(m => (m.pid === me ? m : { ...m, perfil: { feito: !!(m.perfil && m.perfil.funcao && m.perfil.investiu) } })) : p.members;
  const out: Vista = { ...p, members, answers, me };
  if (p.phase !== 'coleta') {
    const stats: NonNullable<Vista['stats']> = {}, parts: NonNullable<Vista['parts']> = {};
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
