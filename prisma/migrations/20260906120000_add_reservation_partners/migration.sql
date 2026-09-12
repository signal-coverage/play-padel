-- CreateTable
CREATE TABLE "reservation_partners" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reservation_partners_playerId_idx" ON "reservation_partners"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_partners_reservationId_playerId_key" ON "reservation_partners"("reservationId", "playerId");

-- AddForeignKey
ALTER TABLE "reservation_partners" ADD CONSTRAINT "reservation_partners_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_partners" ADD CONSTRAINT "reservation_partners_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
