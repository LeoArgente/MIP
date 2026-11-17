/* Ações que mudam um projeto. Portadas de act() do protótipo, sem a parte de tela.
   Cada ação recebe o projeto `p` (já travado no banco), quem está agindo (`me`) e os dados enviados.
   Erros de regra viram ActionError e chegam ao navegador como mensagem por campo.
   Este arquivo guarda o que as ações de vários módulos usam em comum. */
import { propDefault } from '@mip/domain';
import type { Pid, Aid, Fase, Ativo, Proposta, Aba, Sobre, Perfil, Resposta } from '@mip/domain';
import type { ProjetoCompleto } from '../store.js';

/**
 * Corpo de uma ação (POST /api/projects/:id/actions/:type), como o apps/web envia. Todos os campos são
 * opcionais: o despachante aceita corpo vazio ({}) e cada ação lê só os campos que usa.
 * O Express entrega req.body sem tipo e o despachante não valida a forma: os tipos de cada campo descrevem
 * o que o navegador manda, não são uma garantia.
 */
export interface DadosAcao {
  aid?: Aid;
  pid?: Pid;
  n?: number;
  confirm?: boolean;
  check?: boolean;
  step?: number;
  sobre?: Sobre;
  perfil?: Perfil;
  draft?: Resposta;
  prop?: Partial<Proposta>;
  text?: string;
  reason?: string;
  comment?: string;
  assets?: Aid[];
  type?: string;
  name?: string;
  desc?: string;
  link?: string;
}

/** O que uma ação devolve ao navegador (em `result`). */
export interface Resultado {
  /** Não devolve o projeto (rascunhos salvos sozinhos). */
  quiet?: boolean;
  tab?: Aba;
  notice?: string;
  toast?: string;
  next?: Aid | null;
  confirmDelete?: { aid: Aid; n: number };
}

export type Acao = (p: ProjetoCompleto, me: Pid, d: DadosAcao) => Resultado;
export type Acoes = Record<string, Acao>;

export class ActionError extends Error {
  declare err: Record<string, string>;
  declare status: number;
  constructor(err: string | Record<string, string>, status = 400) { super(typeof err === 'string' ? err : Object.values(err)[0]); this.err = typeof err === 'string' ? { _: err } : err; this.status = status; }
}
export const deny: (msg: string) => never = msg => { throw new ActionError(msg, 403); };
export const fail: (field: string, msg: string) => never = (field, msg) => { throw new ActionError({ [field]: msg }); };
export const now = () => Date.now();

export const needOrg = (p: ProjetoCompleto, me: Pid) => { if (p.org !== me) deny('Só quem organiza pode fazer isso.'); };
export const needPhase = (p: ProjetoCompleto, ...ph: Fase[]) => { if (!ph.includes(p.phase)) deny('Esta ação não está disponível nesta fase do projeto.'); };
export const assetOf = (p: ProjetoCompleto, aid: Aid | undefined): Ativo => p.assets.find(a => a.id === aid) || fail('_', 'Criação não encontrada.');
export const ensureProp = (p: ProjetoCompleto, aid: Aid): Proposta => (p.proposal[aid] = p.proposal[aid] || propDefault(p, aid));
