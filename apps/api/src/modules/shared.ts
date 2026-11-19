/* Ações que mudam um projeto. Portadas de act() do protótipo, sem a parte de tela.
   Cada ação recebe o projeto `p` (já travado no banco), quem está agindo (`me`) e os dados enviados.
   Erros de regra viram ActionError e chegam ao navegador como mensagem por campo.
   Este arquivo guarda o que as ações de vários módulos usam em comum. */
import { propDefault, QS, SOBRE, PERFIL, isP } from '@mip/domain';
import type { Pid, Aid, Fase, Ativo, Proposta, Aba, Sobre, Perfil, Resposta, ChavePergunta, Pergunta } from '@mip/domain';
import { viewFor } from '../view.js';
import type { ProjetoCompleto } from '../store.js';
import type { Vista } from '../view.js';

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

/**
 * Resposta de uma rota que mudou o projeto: o resultado e o projeto recarregado depois da transação (`fresh`, de
 * load). Sem `fresh` (load devolveu null: a pessoa já não participa), só o resultado, como nas ações quiet; a ação
 * já foi gravada, e o apps/web aceita resposta sem `project`.
 */
export const comProjeto = <R>(result: R, fresh: ProjetoCompleto | null, me: Pid): { result: R; project?: Vista } => (fresh ? { result, project: viewFor(fresh, me) } : { result });

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

/* ===== Formato dos valores que chegam do navegador (rascunho da resposta e da proposta) ===== */
/* Texto livre: limite de caracteres e o nome do campo na mensagem (o salvamento automático mostra só a mensagem).
   A interface não limita nenhum destes campos (não há maxlength nos inputs de apps/web); os números seguem os cortes
   que a API já faz em textos parecidos: textarea como o comentário (2000), nome numa linha como o perfil (200),
   descrição numa linha como o sobre (500). Link: 2000, o tamanho prático de uma URL.
   comment (explicação da recusa, em versoes): textarea como o comentário (2000). Ela entra inteira na tarefa de quem
   organiza e de quem participa (taskFor) e em todo registro do acordo gerado depois (CONFIRMAÇÕES e RECUSAS E AJUSTES
   ANTERIORES), e nunca é cortada: sem teto, um texto de qualquer tamanho seria repetido em cada um deles.
   text (comentário numa criação, em decisoes): os mesmos 2000 do corte (.slice) que a ação já fazia, agora como recusa. */
const TEXTO_LIVRE: Record<string, { max: number; nome: string }> = {
  desc: { max: 2000, nome: 'O que você fez' },
  link: { max: 2000, nome: 'O link' },
  titularAtualNome: { max: 200, nome: 'O titular indicado hoje' },
  titularAtualBase: { max: 500, nome: 'A base ou documento' },
  titularExterno: { max: 200, nome: 'O titular fora da equipe' },
  externo: { max: 200, nome: 'O titular fora da equipe' },
  texto: { max: 2000, nome: 'As explicações e pendências' },
  comment: { max: 2000, nome: 'A explicação da recusa' },
  text: { max: 2000, nome: 'O comentário' }
};
/* Perguntas de texto sem opções fixas, por tabela. QS: hoje não tem nenhuma; o limite fica para que nenhuma pergunta
   nova entre sem teto. SOBRE e PERFIL: os mesmos números que as ações já usavam no corte (.slice), agora como recusa. */
const MAX_TEXTO_QS = 500, MAX_TEXTO_SOBRE = 500, MAX_TEXTO_PERFIL = 200;
/* Ids são cuid (25 caracteres); 64 deixa folga sem aceitar texto arbitrário no lugar de um id. */
const MAX_ID = 64;

export const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const ehId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= MAX_ID;
/* Lista de ids (as pessoas marcadas, as criações de uma recusa). */
export const ehListaDeIds = (v: unknown): v is string[] => Array.isArray(v) && v.every(ehId);
const ehChaveConhecida = (k: string, tabela: object) => Object.hasOwn(tabela, k);

/* erroDeFormato reconhece o campo só pelo nome, então nenhum nome pode estar em duas tabelas. Se um dia estiver,
   o servidor não sobe (como um nome de ação repetido em modules/index.ts). */
{
  const vistos = new Set<string>();
  for (const t of [QS, SOBRE, PERFIL, TEXTO_LIVRE]) for (const k of Object.keys(t)) {
    if (vistos.has(k)) throw new Error(`Campo "${k}" aparece em duas tabelas de perguntas; erroDeFormato não saberia qual regra usar.`);
    vistos.add(k);
  }
}

/* Pergunta de uma opção ou de texto: com opts, o valor precisa ser uma delas ('' = ainda sem resposta, como o
   propDefault grava); sem opts, texto dentro do limite. */
const erroDeEscolha = (pq: Pergunta, v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return pq.short + ': envie a resposta como texto.';
  if (pq.opts) return v === '' || pq.opts.includes(v) ? null : pq.short + ': escolha uma das opções da pergunta.';
  return v.length <= max ? null : `${pq.short} passou do limite de ${max} caracteres.`;
};

/**
 * Confere o formato do valor de um campo, pelo que o domínio sabe da pergunta:
 * QS: isP(q) → lista de ids de pessoas; 'notas' → objeto de id para número; demais → texto, que precisa ser uma das
 * opções de QS[q].opts quando houver. SOBRE e PERFIL: texto, uma das opções quando houver opts. Campos de texto livre
 * (TEXTO_LIVRE) → texto dentro do limite. Devolve a mensagem de erro, ou null quando o formato está certo.
 * Nunca converte: um valor no formato errado é recusado, não transformado.
 */
export function erroDeFormato(k: string, v: unknown): string | null {
  if (ehChaveConhecida(k, QS)) {
    const q = k as ChavePergunta;
    if (isP(q)) return ehListaDeIds(v) ? null : 'Envie as pessoas marcadas como uma lista.';
    if (q === 'notas') return ehObjeto(v) && Object.entries(v).every(([pid, n]) => ehId(pid) && typeof n === 'number' && Number.isFinite(n)) ? null : 'Envie a participação de cada pessoa como número.';
    return erroDeEscolha(QS[q], v, MAX_TEXTO_QS);
  }
  if (ehChaveConhecida(k, SOBRE)) return erroDeEscolha(SOBRE[k as keyof typeof SOBRE], v, MAX_TEXTO_SOBRE);
  if (ehChaveConhecida(k, PERFIL)) return erroDeEscolha(PERFIL[k as keyof typeof PERFIL], v, MAX_TEXTO_PERFIL);
  if (ehChaveConhecida(k, TEXTO_LIVRE)) {
    const { max, nome } = TEXTO_LIVRE[k];
    if (typeof v !== 'string') return nome + ' precisa ser texto.';
    return v.length <= max ? null : `${nome} passou do limite de ${max} caracteres.`;
  }
  return 'Campo não esperado.';
}

/**
 * Confere os campos de `dados` cujas chaves estão em `aceitas` e devolve um erro por campo, com a chave
 * `prefixo + campo`. Chaves fora de `aceitas` são ignoradas (como o filtro que já existia) ou, com
 * `outras: 'recusa'`, viram erro.
 */
export function errosDeFormato(dados: Record<string, unknown>, aceitas: ReadonlySet<string>, prefixo: string, outras: 'ignora' | 'recusa'): Record<string, string> {
  const err: Record<string, string> = {};
  for (const [k, v] of Object.entries(dados)) {
    const e = aceitas.has(k) ? erroDeFormato(k, v) : outras === 'recusa' ? 'Campo não esperado.' : null;
    if (e) err[prefixo + k] = e;
  }
  return err;
}
