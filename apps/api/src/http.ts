/* Como a API responde a erros: sempre em JSON, nunca deixando o pedido sem resposta.
   O Express 4 não olha a promessa que um handler async devolve: uma rejeição fora de wrap/wrapMw não chega a
   lugar nenhum. Por isso toda rota passa por wrap, todo middleware async por wrapMw, e erroJson fica registrado por
   último em /api (server.ts) para responder o que chegar por next(e). Este arquivo não abre banco nem porta, para
   que os testes usem as mesmas peças do servidor. */
import { ActionError } from './modules/shared.js';
import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import type { Contexto } from './server.js';

/* Responde um erro já capturado: ActionError com o próprio status e as mensagens por campo; o resto, 500. */
function responder(e: unknown, res: Response) {
  if (e instanceof ActionError) return res.status(e.status).json({ err: e.err });
  console.error(e);
  return res.status(500).json({ err: { _: 'Algo deu errado do nosso lado. Tente de novo.' } });
}

/* Rota: trata o erro dela mesma, sem next.
   Único ponto da garantia de sessão: um handler que declara AuthedRequest está registrado depois de `auth`,
   que responde 401 sem req.user. O TS não liga o middleware ao handler; esta conversão faz essa ligação. */
export const wrap: Contexto['wrap'] = <R extends Request>(fn: (req: R, res: Response) => unknown) => (req: Request, res: Response) => Promise.resolve(fn(req as R, res)).catch(e => responder(e, res));

/* Middleware async (com next): a rejeição segue para erroJson por next(e).
   O valor rejeitado vira Error se não for um: next(undefined) ou next(null) seguiria adiante como se nada tivesse
   falhado, e next('route') pularia a rota em vez de responder. */
export const wrapMw = (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res, next)).catch((e: unknown) => next(e instanceof Error ? e : new Error('Rejeição sem Error: ' + String(e))));
};

/* Handler de erro (4 argumentos), o último registrado em /api.
   Erros do próprio Express com status 4xx público (JSON malformado, corpo grande demais) mantêm o status;
   antes deste handler eles chegavam ao handler padrão, que responde em HTML. */
export const erroJson: ErrorRequestHandler = (e: unknown, _req, res, next) => {
  if (res.headersSent) return next(e);
  const st = (e as { status?: unknown } | null)?.status, publico = (e as { expose?: unknown } | null)?.expose === true;
  if (publico && typeof st === 'number' && st >= 400 && st < 500) return res.status(st).json({ err: { _: 'Não conseguimos ler o pedido. Confira os dados e tente de novo.' } });
  responder(e, res);
};
