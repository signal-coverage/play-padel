-- CreateEnum
CREATE TYPE "SystemJobKind" AS ENUM ('CRON', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "SystemJobStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "system_job_logs" (
    "id" TEXT NOT NULL,
    "kind" "SystemJobKind" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SystemJobStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_job_logs_kind_name_createdAt_idx" ON "system_job_logs"("kind", "name", "createdAt");
