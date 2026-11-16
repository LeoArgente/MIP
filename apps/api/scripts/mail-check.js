/* Testa o envio de e-mail com a configuração do .env.
   Uso: npm run mail:test -w @mip/api -- seu@email.com */
import 'dotenv/config';
import { sendMail, mailMode } from '../src/mail.js';

const to = process.argv[2];
if (!to) { console.error('Informe o destinatário: npm run mail:test -w @mip/api -- seu@email.com'); process.exit(1); }
console.log('Modo de envio:', mailMode());
const r = await sendMail({ to, subject: 'Teste de e-mail da MIP', text: 'Se você recebeu esta mensagem, o envio de e-mails da MIP está funcionando.', link: (process.env.APP_URL || 'http://localhost:3001'), linkLabel: 'Abrir a MIP' });
console.log(r.sent ? 'Enviado. Confira a caixa de entrada (e o spam).' : 'Não enviado. ' + (r.error || 'Preencha RESEND_API_KEY no .env.'));
process.exit(r.sent ? 0 : 1);
