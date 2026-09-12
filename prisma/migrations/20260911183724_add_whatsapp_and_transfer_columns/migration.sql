-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "expiryNotifiedAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT;
