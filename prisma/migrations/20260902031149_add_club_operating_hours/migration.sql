-- CreateTable
CREATE TABLE "club_operating_hours" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "club_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "club_operating_hours_clubId_dayOfWeek_idx" ON "club_operating_hours"("clubId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "club_operating_hours" ADD CONSTRAINT "club_operating_hours_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
