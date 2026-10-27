/* Chamadas à API. Erros chegam como { err: { campo: mensagem } }. */
export class ApiError extends Error {
  constructor(status, err) {
    super((err && (err._ || Object.values(err)[0])) || 'Algo deu errado. Tente de novo.');
    this.status = status;
    this.err = err || {};
  }
}

export async function api(method, path, body) {
  let r;
  try {
    r = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, { _: 'Sem conexão. Verifique a internet e tente de novo.' });
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data.err);
  return data;
}
export const get = p => api('GET', p);
export const post = (p, b = {}) => api('POST', p, b);
export const patch = (p, b = {}) => api('PATCH', p, b);
