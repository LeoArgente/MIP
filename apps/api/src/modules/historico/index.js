/* Histórico do projeto. Não tem ação própria: é escrito pelo log() que as ações dos outros módulos chamam.
   A gravação no banco fica em store.js. */
export const log = (p, who, text) => p.history.unshift({ at: Date.now(), who, text });

export const ACTIONS = {};
