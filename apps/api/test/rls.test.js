/* Guarda da migração 20261118130000_rls: toda tabela do schema public tem Row Level Security ligado, e nenhuma tem FORCE.
   - Sem RLS, uma tabela ficaria aberta aos papéis anon e authenticated se o Data API do Supabase fosse ligado.
     Uma migração que cria tabela precisa ligar o RLS nela (ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
   - Com FORCE e sem policies, o dono das tabelas também passa a ver zero linhas quando não tem BYPASSRLS. Na CI o
     papel é superusuário e passaria mesmo assim, então os testes da jornada não pegariam isso; este pega.
   Precisa do banco com as migrações aplicadas (DATABASE_URL), como a CI. */
import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

test('toda tabela do public tem RLS ligado, sem FORCE', async () => {
  const prisma = new PrismaClient();
  try {
    const tabelas = await prisma.$queryRaw`
      SELECT c.relname AS nome, c.relrowsecurity AS rls, c.relforcerowsecurity AS force
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname`;
    assert.ok(tabelas.some(t => t.nome === 'Project'), 'as migrações não foram aplicadas neste banco');
    assert.deepEqual(tabelas.filter(t => !t.rls).map(t => t.nome), [], 'tabelas sem RLS');
    assert.deepEqual(tabelas.filter(t => t.force).map(t => t.nome), [], 'tabelas com FORCE ROW LEVEL SECURITY');
  } finally {
    await prisma.$disconnect();
  }
});
