-- CreateEnum
CREATE TYPE "KnockoutRound" AS ENUM ('ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'FINAL');

-- AlterTable
ALTER TABLE "tournament_matches" ADD COLUMN     "knockoutRound" "KnockoutRound",
ADD COLUMN     "nextMatchId" TEXT,
ADD COLUMN     "nextMatchSlot" TEXT;

-- CreateIndex
CREATE INDEX "tournament_matches_nextMatchId_idx" ON "tournament_matches"("nextMatchId");

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "tournament_matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
