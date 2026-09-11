-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'GROUPS_LOCKED', 'KNOCKOUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentCategoryStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'GROUPS_LOCKED', 'KNOCKOUT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentTeamStatus" AS ENUM ('REGISTERED', 'ADVANCED', 'ELIMINATED', 'CHAMPION', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_categories" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TournamentCategoryStatus" NOT NULL DEFAULT 'DRAFT',
    "minCategoryLevel" INTEGER,
    "maxCategoryLevel" INTEGER,
    "groupCount" INTEGER NOT NULL,
    "advancesPerGroup" INTEGER NOT NULL,
    "maxTeams" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_teams" (
    "id" TEXT NOT NULL,
    "tournamentCategoryId" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "combinedCategoryLevel" INTEGER,
    "status" "TournamentTeamStatus" NOT NULL DEFAULT 'REGISTERED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "withdrawnAt" TIMESTAMP(3),
    "withdrawnBy" TEXT,

    CONSTRAINT "tournament_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournaments_clubId_status_idx" ON "tournaments"("clubId", "status");

-- CreateIndex
CREATE INDEX "tournaments_status_registrationOpensAt_registrationCloses_idx" ON "tournaments"("status", "registrationOpensAt", "registrationClosesAt");

-- CreateIndex
CREATE INDEX "tournament_categories_tournamentId_idx" ON "tournament_categories"("tournamentId");

-- CreateIndex
CREATE INDEX "tournament_teams_tournamentCategoryId_status_idx" ON "tournament_teams"("tournamentCategoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_tournamentCategoryId_player1Id_key" ON "tournament_teams"("tournamentCategoryId", "player1Id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_teams_tournamentCategoryId_player2Id_key" ON "tournament_teams"("tournamentCategoryId", "player2Id");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_categories" ADD CONSTRAINT "tournament_categories_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_tournamentCategoryId_fkey" FOREIGN KEY ("tournamentCategoryId") REFERENCES "tournament_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_teams" ADD CONSTRAINT "tournament_teams_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
