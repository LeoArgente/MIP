-- Row Level Security ligado em todas as tabelas, SEM policies: para quem está sujeito ao RLS, nenhuma linha.
--
-- Contra o quê: o Data API do Supabase (PostgREST) expõe o schema public aos papéis anon e authenticated, e a chave
-- anon é pública. Hoje o Data API está desligado; se for ligado por engano, sem isto as tabelas ficariam abertas.
--
-- Por que a aplicação continua funcionando: o Prisma conecta como o dono das tabelas (postgres, que criou tudo pelas
-- migrações). O dono não é sujeito ao RLS sem FORCE ROW LEVEL SECURITY, e no Supabase o postgres ainda tem BYPASSRLS
-- (rolsuper=false, rolbypassrls=true). Na CI e no computador o papel costuma ser superusuário, que também passa.
-- Não use FORCE aqui: para o dono sem BYPASSRLS, FORCE sem policies esconderia todas as linhas do próprio app.
--
-- A permissão de cada pessoa continua no servidor (store.ts: load só monta o projeto para quem participa).
-- Tabela nova em migração futura: ligue o RLS nela também (test/rls.test.js falha se alguma ficar sem).

-- IF EXISTS: o banco-sombra do `prisma migrate dev` pode não ter a tabela de controle das migrações.
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Answer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Confirmation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HistoryEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Memorial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FeedbackImage" ENABLE ROW LEVEL SECURITY;

-- Segunda barreira: anon e authenticated perdem os GRANTs nas tabelas e sequências do public, inclusive nas que
-- migrações futuras criarem (privilégios padrão do papel que roda as migrações). Esses papéis só existem no
-- Supabase; no Postgres local, na CI e no banco-sombra do `prisma migrate dev` o bloco não faz nada.
-- service_role não entra: tem BYPASSRLS e a chave é secreta.
DO $$
DECLARE
  papel text;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', papel);
    END IF;
  END LOOP;
END
$$;
