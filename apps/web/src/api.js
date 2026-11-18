/* Chamadas à API. Erros chegam como { err: { campo: mensagem } }. Único lugar do apps/web que faz fetch. */
export class ApiError extends Error {
  constructor(status, err) {
    super((err && (err._ || Object.values(err)[0])) || 'Algo deu errado. Tente de novo.');
    this.status = status;
    this.err = err || {};
  }
}

/* Quem a tela acha que está usando. Escrito só por session.jsx, quando a sessão é carregada ou trocada; null antes
   disso e depois de sair. Vai em todo pedido, para o servidor recusar (409) o que esta aba faria em nome de outra
   pessoa depois de alguém trocar de conta em outra aba: o cookie é do navegador, não da aba. */
let pessoa = null;
export const definirPessoa = id => { pessoa = id || null; };
/* O mesmo nome que apps/api/src/http.ts lê. */
const CABECALHO_PESSOA = 'X-MIP-Pessoa';

export async function api(method, path, body) {
  let r;
  try {
    r = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(pessoa ? { [CABECALHO_PESSOA]: pessoa } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, { _: 'Sem conexão. Verifique a internet e tente de novo.' });
  }
  /* A sessão do navegador é de outra pessoa: recarrega para a tela buscar quem é e mostrar só o dela.
     A promessa nunca termina DE PROPÓSITO. Não "conserte" com reject ou resolve: com reject, o catch de cada tela
     roda durante a recarga e mostra a mensagem de erro (o aviso pisca e some com a página); com resolve, a tela
     segue com dados que não chegaram. O custo é conhecido: nenhum then, catch ou finally de quem chamou roda (o
     act() fica "ocupado" e o flush parado no await), e um teste que der await nesta promessa trava. Tudo isso some
     com a recarga, que já começou. */
  if (r.status === 409) { window.location.reload(); return new Promise(() => {}); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.err);
  return data;
}
export const get = p => api('GET', p);
export const post = (p, b = {}) => api('POST', p, b);
export const patch = (p, b = {}) => api('PATCH', p, b);
