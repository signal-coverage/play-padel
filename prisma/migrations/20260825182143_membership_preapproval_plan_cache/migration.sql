/*
  Warnings:

  - You are about to drop the column `mpPreapprovalPlanId` on the `membership_trial_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "membership_trial_configs" DROP COLUMN "mpPreapprovalPlanId";

-- CreateTable
CREATE TABLE "membership_preapproval_plan_cache" (
    "plan" "Plan" NOT NULL,
    "currency" TEXT NOT NULL,
    "preapprovalPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_preapproval_plan_cache_pkey" PRIMARY KEY ("plan","currency")
);
