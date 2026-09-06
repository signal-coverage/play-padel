-- AlterEnum
ALTER TYPE "NotificationStatus" ADD VALUE 'SKIPPED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLUB_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_SUSPENDED';
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'MEMBERSHIP_PAST_DUE';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_PENDING_APPROVAL';
ALTER TYPE "NotificationType" ADD VALUE 'SYSTEM_JOB_FAILED';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "readAt" TIMESTAMP(3),
ALTER COLUMN "clubId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_idx" ON "notifications"("recipientId", "readAt");
