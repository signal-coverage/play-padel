-- CreateEnum
CREATE TYPE "TournamentMatchStage" AS ENUM ('GROUP', 'KNOCKOUT');

-- CreateEnum
CREATE TYPE "TournamentMatchStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'WALKOVER', 'CANCELLED');

-- AlterTable
ALTER TABLE "tournament_teams" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "tournament_groups" (
    "id" TEXT NOT NULL,
    "tournamentCategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_matches" (
    "id" TEXT NOT NULL,
    "tournamentCategoryId" TEXT NOT NULL,
    "stage" "TournamentMatchStage" NOT NULL DEFAULT 'GROUP',
    "groupId" TEXT,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "status" "TournamentMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "winnerTeamId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_sets" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "teamAGames" INTEGER NOT NULL,
    "teamBGames" INTEGER NOT NULL,
    "teamATiebreakPoints" INTEGER,
    "teamBTiebreakPoints" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_sets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_groups_tournamentCategoryId_name_key" ON "tournament_groups"("tournamentCategoryId", "name");

-- CreateIndex
CREATE INDEX "tournament_groups_tournamentCategoryId_idx" ON "tournament_groups"("tournamentCategoryId");

-- CreateIndex
CREATE INDEX "tournament_matches_tournamentCategoryId_stage_idx" ON "tournament_matches"("tournamentCategoryId", "stage");

-- CreateIndex
CREATE INDEX "tournament_matches_groupId_status_idx" ON "tournament_matches"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_sets_matchId_setNumber_key" ON "match_sets"("matchId", "setNumber");

-- CreateIndex
CREATE INDEX "tournament_teams_groupId_idx" ON "tournament_teams"("groupId");

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournamentCategoryId_fkey" FOREIGN KEY ("tournamentCategoryId") REFERENCES "tournament_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournamentCategoryId_fkey" FOREIGN KEY ("tournamentCategoryId") REFERENCES "tournament_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_teamAId_fkey" FOREIGN KEY ("teamAId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_teamBId_fkey" FOREIGN KEY ("teamBId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "tournament_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_sets" ADD CONSTRAINT "match_sets_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "tournament_matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
