/* Registro dos módulos da API. Cada módulo exporta as ações que lhe pertencem (ACTIONS) e,
   se tiver, as próprias rotas (routes). O despachante de ações monta um mapa único a partir deles. */
import { mem } from '@mip/domain';
import { load, withProject } from '../store.js';
import { viewFor } from '../view.js';
import { ActionError, deny } from './shared.js';
import * as projetos from './projetos/index.js';
import * as ativos from './ativos/index.js';
import * as respostas from './respostas/index.js';
import * as decisoes from './decisoes/index.js';
import * as versoes from './versoes/index.js';
import * as memorial from './memorial/index.js';
import * as comparacao from './comparacao/index.js';
import * as historico from './historico/index.js';
import * as feedback from './feedback/index.js';
import type { Express } from 'express';
import type { Pid } from '@mip/domain';
import type { Contexto, AuthedRequest } from '../server.js';
import type { ProjetoCompleto } from '../store.js';
import type { Acoes, DadosAcao, Resultado } from './shared.js';

/** O que cada módulo exporta: as ações e, se tiver, as próprias rotas. */
interface Modulo { ACTIONS: Acoes; routes?: (app: Express, ctx: Contexto) => void }

const MODULES: Record<string, Modulo> = { projetos, ativos, respostas, decisoes, versoes, memorial, comparacao, historico, feedback };

/* Mapa de todas as ações, de todos os módulos. Um nome repetido em dois módulos é erro de montagem.
   Sem protótipo: o nome da ação vem da URL, e "constructor", "toString" etc. não podem virar ação. */
export const ACTIONS: Acoes = Object.create(null);
for (const [name, m] of Object.entries(MODULES)) {
  for (const type of Object.keys(m.ACTIONS)) {
    if (Object.hasOwn(ACTIONS, type)) throw new Error(`Ação "${type}" do módulo ${name} já existe em outro módulo.`);
    ACTIONS[type] = m.ACTIONS[type];
  }
}

export function apply(p: ProjetoCompleto, me: Pid, type: string, d: DadosAcao = {}): Resultado {
  const fn = Object.hasOwn(ACTIONS, type) ? ACTIONS[type] : undefined;
  if (typeof fn !== 'function') throw new ActionError('Ação desconhecida.', 404);
  const m = mem(p, me);
  if (!m || m.status === 'pendente') deny('Você não participa deste projeto.');
  return fn(p, me, d) || {};
}

/* Registra o despachante de ações e as rotas de cada módulo que tem rotas próprias. */
export function routes(app: Express, ctx: Contexto) {
  const { prisma, wrap, auth } = ctx;

  app.post('/api/projects/:id/actions/:type', auth, wrap(async (req: AuthedRequest, res) => {
    /* Quem não participa recebe o mesmo 404 de projeto inexistente (load não devolve o projeto). */
    const out = await withProject(prisma, req.params.id, req.user.id, async p => {
      if (!p) throw new ActionError('Projeto não encontrado.', 404);
      const result = apply(p, req.user.id, req.params.type, req.body || {});
      return { result, p };
    });
    if (out.result.quiet) return res.json({ result: out.result });
    const fresh = await load(prisma, req.params.id, req.user.id);
    /* Garantido hoje: o projeto existia na transação acima com a pessoa como integrante, nenhuma rota apaga projeto
       e nenhuma ação apaga integrante (só a rota /remove, que não passa por aqui).
       Se um dia houver exclusão de projeto ou uma ação que tire a pessoa, aqui vira 500 (o wrap responde). */
    res.json({ result: out.result, project: viewFor(fresh!, req.user.id) });
  }));

  for (const m of Object.values(MODULES)) if (m.routes) m.routes(app, ctx);
}
