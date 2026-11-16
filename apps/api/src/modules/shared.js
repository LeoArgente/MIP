/* Ações que mudam um projeto. Portadas de act() do protótipo, sem a parte de tela.
   Cada ação recebe o projeto `p` (já travado no banco), quem está agindo (`me`) e os dados enviados.
   Erros de regra viram ActionError e chegam ao navegador como mensagem por campo.
   Este arquivo guarda o que as ações de vários módulos usam em comum. */
import { propDefault } from '@mip/domain';

export class ActionError extends Error {
  constructor(err, status = 400) { super(typeof err === 'string' ? err : Object.values(err)[0]); this.err = typeof err === 'string' ? { _: err } : err; this.status = status; }
}
export const deny = msg => { throw new ActionError(msg, 403); };
export const fail = (field, msg) => { throw new ActionError({ [field]: msg }); };
export const now = () => Date.now();

export const needOrg = (p, me) => { if (p.org !== me) deny('Só quem organiza pode fazer isso.'); };
export const needPhase = (p, ...ph) => { if (!ph.includes(p.phase)) deny('Esta ação não está disponível nesta fase do projeto.'); };
export const assetOf = (p, aid) => p.assets.find(a => a.id === aid) || fail('_', 'Criação não encontrada.');
export const ensureProp = (p, aid) => (p.proposal[aid] = p.proposal[aid] || propDefault(p, aid));
