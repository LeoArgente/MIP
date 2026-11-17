/* Histórico do projeto. Não tem ação própria: é escrito pelo log() que as ações dos outros módulos chamam.
   A gravação no banco fica em store.js. */
import type { Pid } from '@mip/domain';
import type { ProjetoCompleto } from '../../store.js';
import type { Acoes } from '../shared.js';

export const log = (p: ProjetoCompleto, who: Pid, text: string) => p.history.unshift({ at: Date.now(), who, text });

export const ACTIONS: Acoes = {};
