/* Entrada da API na Vercel: cada pedido a /api/* chega aqui (veja vercel.json) e é atendido pelo mesmo app Express do servidor.
   A API é TypeScript: este arquivo importa o compilado em apps/api/dist (gerado pelo npm run build da raiz). */
export { default } from '../apps/api/dist/server.js';
