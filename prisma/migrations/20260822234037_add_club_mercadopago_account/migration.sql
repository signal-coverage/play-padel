-- CreateEnum
CREATE TYPE "MpConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED');

-- CreateTable
CREATE TABLE "club_mercadopago_accounts" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "status" "MpConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "mpUserId" TEXT,
    "liveMode" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastRefreshError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_mercadopago_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "club_mercadopago_accounts_clubId_key" ON "club_mercadopago_accounts"("clubId");

-- AddForeignKey
ALTER TABLE "club_mercadopago_accounts" ADD CONSTRAINT "club_mercadopago_accounts_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
