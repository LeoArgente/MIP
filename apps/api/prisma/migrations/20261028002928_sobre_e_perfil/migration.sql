-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "perfil" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sobre" JSONB NOT NULL DEFAULT '{}';
