/* Memorial: o registro do acordo, com o hash do texto gerado. */
import { createHash } from 'node:crypto';
import { mem, lastV, memorialBody } from '@mip/domain';
import { deny, now } from '../shared.js';
import { log } from '../historico/index.js';
import type { Acoes } from '../shared.js';

export const sha256 = (t: string) => createHash('sha256').update(t, 'utf8').digest('hex');

export const ACTIONS: Acoes = {
  genmem(p, me) {
    if (!lastV(p)) deny('O registro do acordo fica disponível depois do envio da primeira proposta.');
    if (!mem(p, me)) deny('Você não participa deste projeto.');
    const at = now(), body = memorialBody(p, at);
    p.memorials.unshift({ at, body, hash: sha256(body) });
    log(p, me, 'gerou o registro do acordo');
    return { toast: 'Registro do acordo gerado.' };
  }
};
