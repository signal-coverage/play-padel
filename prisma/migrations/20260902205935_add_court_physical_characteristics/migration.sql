-- AlterTable
ALTER TABLE "courts" ADD COLUMN     "lighting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "netType" TEXT,
ADD COLUMN     "wallType" TEXT;
