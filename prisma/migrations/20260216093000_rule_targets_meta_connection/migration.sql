-- CreateEnum
CREATE TYPE "RuleScopeType" AS ENUM ('ACCOUNT', 'CAMPAIGN', 'ADSET');

-- CreateEnum
CREATE TYPE "MetaConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "MetaConnection" RENAME COLUMN "metaAdAccountId" TO "adAccountId";
ALTER TABLE "MetaConnection" ADD COLUMN "status" "MetaConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED';
ALTER TABLE "MetaConnection" ADD COLUMN "testedAt" TIMESTAMP(3);
ALTER TABLE "MetaConnection" DROP COLUMN "isActive";

-- Backfill current rows to connected
UPDATE "MetaConnection" SET "status" = 'CONNECTED' WHERE "accessTokenEnc" IS NOT NULL;

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN "scopeType" "RuleScopeType" NOT NULL DEFAULT 'ACCOUNT';
ALTER TABLE "Rule" ADD COLUMN "scopeIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Rule" ADD COLUMN "applyToAll" BOOLEAN NOT NULL DEFAULT true;

-- Update index
DROP INDEX IF EXISTS "MetaConnection_organizationId_metaAdAccountId_idx";
CREATE INDEX "MetaConnection_organizationId_adAccountId_idx" ON "MetaConnection"("organizationId", "adAccountId");
