-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ADMIN_ACCESS_GRANTED';

-- RenameIndex
ALTER INDEX "tournaments_status_registrationOpensAt_registrationCloses_idx" RENAME TO "tournaments_status_registrationOpensAt_registrationClosesAt_idx";
