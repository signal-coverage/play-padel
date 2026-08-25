-- CreateEnum
CREATE TYPE "MembershipCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "MembershipRenewalMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "club_membership_subscriptions" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "pendingPlan" "Plan",
    "cycle" "MembershipCycle" NOT NULL,
    "pendingCycle" "MembershipCycle",
    "renewalMode" "MembershipRenewalMode" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL,
    "mpPreapprovalId" TEXT,
    "mpPreferenceId" TEXT,
    "mpCustomerId" TEXT,
    "mpCardId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "pastDueSince" TIMESTAMP(3),
    "pastDueUntil" TIMESTAMP(3),
    "lastWebhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_membership_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_trial_configs" (
    "plan" "Plan" NOT NULL,
    "trialDays" INTEGER NOT NULL,
    "mpPreapprovalPlanId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "membership_trial_configs_pkey" PRIMARY KEY ("plan")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_membership_subscriptions_clubId_key" ON "club_membership_subscriptions"("clubId");

-- AddForeignKey
ALTER TABLE "club_membership_subscriptions" ADD CONSTRAINT "club_membership_subscriptions_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
