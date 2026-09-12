-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MEMBERSHIP_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'RESERVATION_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'PROFILE_UPDATED_BY_ADMIN';
ALTER TYPE "NotificationType" ADD VALUE 'CLUB_UPDATED_BY_ADMIN';
