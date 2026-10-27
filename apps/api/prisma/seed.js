/* Cenário de demonstração (o mesmo do protótipo): Ana organiza o "App Rotas" com Bruno e Carla.
   Rode com `npm run db:seed`. Apaga e recria só as contas e projetos de demonstração (@demo.mip). */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ANS = o => ({ origem: 'Criada neste projeto', titularAtual: 'Ainda não sabemos', titularAtualNome: '', titularAtualBase: '', divisao: 'Ainda não, precisamos negociar', uso: 'Só quem for dono', comercial: 'Só com acordo de todos os donos', portfolio: 'Todos que criaram', licenca: 'Não publicar por enquanto', marcaRegistro: 'Ainda precisa de busca ou registro', terceiros: 'Não identificamos', audioDireitos: 'Não se aplica', invDivulgacao: 'Ainda não sabemos', remix: 'Só com autorização dos donos', desc: '', link: '', ...o });

async function main() {
  const emails = ['ana', 'bruno', 'carla', 'diego'].map(n => n + '@demo.mip');
  await prisma.project.deleteMany({ where: { org: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  const [ana, bruno, carla] = await Promise.all(['Ana', 'Bruno', 'Carla', 'Diego'].map((name, i) => prisma.user.create({ data: { email: emails[i], name } })));

  const p = await prisma.project.create({ data: { name: 'App Rotas', context: 'Projeto da disciplina', orgId: ana.id, setupStep: 'resp', inviteCode: 'demo-app-rotas' } });
  await prisma.member.createMany({ data: [ana, bruno, carla].map(u => ({ projectId: p.id, userId: u.id })) });
  const logo = await prisma.asset.create({ data: { projectId: p.id, name: 'Logo', type: 'marca', cat: 'Marca', desc: 'Logotipo do app' } });
  const back = await prisma.asset.create({ data: { projectId: p.id, name: 'Backend', type: 'codigo', cat: 'Código', desc: 'API e servidor de rotas' } });
  const send = (u, a, o) => { const d = ANS(o); return prisma.answer.create({ data: { projectId: p.id, assetId: a.id, userId: u.id, draft: d, sent: d, sentAt: new Date(), step: 3 } }); };
  await send(ana, logo, { notas: { [ana.id]: 10, [bruno.id]: 0, [carla.id]: 6 }, titular: [ana.id, bruno.id], uso: 'Qualquer pessoa que participou', desc: 'Defini o conceito e a paleta do logotipo' });
  await send(ana, back, { notas: { [ana.id]: 6, [bruno.id]: 10, [carla.id]: 0 }, titular: [ana.id, bruno.id], desc: 'Desenhei a arquitetura e o banco de dados', link: 'https://github.com/app-rotas/backend' });
  await send(bruno, logo, { notas: { [ana.id]: 10, [bruno.id]: 0, [carla.id]: 3 }, titular: [ana.id, bruno.id, carla.id] });
  await prisma.answer.create({ data: { projectId: p.id, assetId: back.id, userId: bruno.id, draft: { notas: { [ana.id]: 6, [bruno.id]: 10 }, titular: [], desc: 'Criei a API de rotas', link: '' }, step: 1 } });
  await prisma.historyEntry.create({ data: { projectId: p.id, userId: ana.id, text: 'criou o projeto App Rotas' } });
  console.log('Cenário criado. Contas: ana@demo.mip, bruno@demo.mip, carla@demo.mip, diego@demo.mip');
}
main().finally(() => prisma.$disconnect());
