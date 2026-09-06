-- CreateEnum
CREATE TYPE "ClubApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "approvalStatus" "ClubApprovalStatus" NOT NULL DEFAULT 'APPROVED';
