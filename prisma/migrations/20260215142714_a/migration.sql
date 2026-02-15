-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MARKETER', 'VIEWER');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('CPA_BUDGET_REDUCTION', 'ROAS_PAUSE_ADSET', 'CTR_FATIGUE_ALERT');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('REDUCE_BUDGET', 'PAUSE_ADSET', 'NOTIFY_ONLY');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metaAdAccountId" TEXT NOT NULL,
    "accessTokenEnc" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'META',
    "campaignId" TEXT,
    "adSetId" TEXT,
    "spend" DECIMAL(10,2) NOT NULL,
    "conversions" INTEGER NOT NULL,
    "cpa" DECIMAL(10,2) NOT NULL,
    "roas" DECIMAL(10,2) NOT NULL,
    "ctr" DECIMAL(5,2) NOT NULL,
    "frequency" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "RuleType" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoApply" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL,
    "maxBudgetChangePerDay" INTEGER NOT NULL DEFAULT 20,
    "cooldownHours" INTEGER NOT NULL DEFAULT 24,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "targetRef" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "kpiSnapshotJson" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "ActionStatus" NOT NULL DEFAULT 'PENDING',
    "actor" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "resultMessage" TEXT,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detailsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPassEnc" TEXT,
    "smtpFrom" TEXT,
    "notifyEmailTo" TEXT,
    "lineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lineMode" TEXT DEFAULT 'NOTIFY',
    "lineTokenEnc" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MetaConnection_metaAdAccountId_idx" ON "MetaConnection"("metaAdAccountId");

-- CreateIndex
CREATE INDEX "Metric_date_platform_idx" ON "Metric"("date", "platform");

-- CreateIndex
CREATE INDEX "Metric_campaignId_adSetId_idx" ON "Metric"("campaignId", "adSetId");

-- CreateIndex
CREATE UNIQUE INDEX "Action_idempotencyKey_key" ON "Action"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_eventType_idx" ON "AuditLog"("createdAt", "eventType");

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
