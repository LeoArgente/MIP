/* Entrada da API na Vercel: cada pedido a /api/* chega aqui (veja vercel.json) e é atendido pelo mesmo app Express do servidor. */
export { default } from '../apps/api/src/server.js';
