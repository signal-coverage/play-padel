/*
  Warnings:

  - You are about to drop the column `mpPreferenceId` on the `club_membership_subscriptions` table. All the data in the column will be lost.
  - The primary key for the `membership_preapproval_plan_cache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `cycle` to the `membership_preapproval_plan_cache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "club_membership_subscriptions" DROP COLUMN "mpPreferenceId";

-- AlterTable
ALTER TABLE "membership_preapproval_plan_cache" DROP CONSTRAINT "membership_preapproval_plan_cache_pkey",
ADD COLUMN     "cycle" "MembershipCycle" NOT NULL,
ADD CONSTRAINT "membership_preapproval_plan_cache_pkey" PRIMARY KEY ("plan", "currency", "cycle");
