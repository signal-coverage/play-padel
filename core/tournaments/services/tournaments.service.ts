import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import type {
  CreateTournamentInput,
  OpenTournamentSummary,
  Tournament,
  TournamentCategory,
  TournamentTeam,
  TournamentWithCategories,
  UpdateTournamentInput,
} from "@/core/tournaments/types";

type TournamentRow = NonNullable<
  Awaited<ReturnType<typeof prisma.tournament.findUnique>>
>;
type TournamentCategoryRow = NonNullable<
  Awaited<ReturnType<typeof prisma.tournamentCategory.findUnique>>
>;
type TournamentTeamRow = NonNullable<
  Awaited<ReturnType<typeof prisma.tournamentTeam.findUnique>>
>;

// Category lifecycle statuses that still allow group-stage changes — mirrors
// the plan's "hasn't locked groups" wording (also used by
// tournamentTeams.service.ts's withdrawTeam).
export const CATEGORY_WITHDRAWABLE_STATUSES = [
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
] as const;

function toTournament(row: TournamentRow): Tournament {
  return {
    id: row.id,
    clubId: row.clubId,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    registrationOpensAt: row.registrationOpensAt,
    registrationClosesAt: row.registrationClosesAt,
    publishedAt: row.publishedAt ?? undefined,
    startDate: row.startDate ?? undefined,
    endDate: row.endDate ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  };
}

function toTournamentCategory(row: TournamentCategoryRow): TournamentCategory {
  return {
    id: row.id,
    tournamentId: row.tournamentId,
    name: row.name,
    status: row.status,
    minCategoryLevel: row.minCategoryLevel ?? undefined,
    maxCategoryLevel: row.maxCategoryLevel ?? undefined,
    groupCount: row.groupCount,
    advancesPerGroup: row.advancesPerGroup,
    maxTeams: row.maxTeams ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTournamentTeam(row: TournamentTeamRow): TournamentTeam {
  return {
    id: row.id,
    tournamentCategoryId: row.tournamentCategoryId,
    player1Id: row.player1Id,
    player2Id: row.player2Id,
    combinedCategoryLevel: row.combinedCategoryLevel ?? undefined,
    status: row.status,
    groupId: row.groupId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    withdrawnAt: row.withdrawnAt ?? undefined,
    withdrawnBy: row.withdrawnBy ?? undefined,
  };
}

function toTournamentWithCategories(
  row: TournamentRow,
  categories: TournamentCategoryRow[],
): TournamentWithCategories {
  return {
    ...toTournament(row),
    categories: categories.map(toTournamentCategory),
  };
}

/**
 * Creates a Tournament and its TournamentCategory rows in one transaction —
 * a tournament always ends up with at least one category, never a
 * half-created one with zero (see createTournamentSchema's `.min(1)`).
 */
export async function createTournament(
  clubId: string,
  input: CreateTournamentInput,
  createdBy: string,
): Promise<TournamentWithCategories> {
  const { tournament, categories } = await prisma.$transaction(async (tx) => {
    const tournamentRow = await tx.tournament.create({
      data: {
        clubId,
        name: input.name,
        description: input.description ?? null,
        registrationOpensAt: new Date(input.registrationOpensAt),
        registrationClosesAt: new Date(input.registrationClosesAt),
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        createdBy,
        updatedBy: createdBy,
      },
    });

    await tx.tournamentCategory.createMany({
      data: input.categories.map((category) => ({
        tournamentId: tournamentRow.id,
        name: category.name,
        groupCount: category.groupCount,
        advancesPerGroup: category.advancesPerGroup,
        minCategoryLevel: category.minCategoryLevel ?? null,
        maxCategoryLevel: category.maxCategoryLevel ?? null,
        maxTeams: category.maxTeams ?? null,
      })),
    });

    const categoryRows = await tx.tournamentCategory.findMany({
      where: { tournamentId: tournamentRow.id },
      orderBy: { createdAt: "asc" },
    });

    return { tournament: tournamentRow, categories: categoryRows };
  });

  const creator = await prisma.userProfile.findUnique({
    where: { id: createdBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: createdBy,
    userDisplayName: creator?.displayName ?? createdBy,
    action: "tournament.created",
    entity: "Tournament",
    entityId: tournament.id,
    metadata: { name: tournament.name, categoryCount: categories.length },
  });

  return toTournamentWithCategories(tournament, categories);
}

export async function listTournamentsForOwner(
  clubId: string,
): Promise<Tournament[]> {
  const rows = await prisma.tournament.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toTournament);
}

/**
 * Ownership-checked lookup — returns null (not a thrown error) when the
 * tournament doesn't exist or belongs to a different club, so route handlers
 * can translate that directly into a 404 (mirrors findOwnedCourt's contract).
 */
export async function getTournamentDetailForOwner(
  clubId: string,
  tournamentId: string,
): Promise<TournamentWithCategories | null> {
  const row = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId },
    include: { categories: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return null;

  return toTournamentWithCategories(row, row.categories);
}

export async function updateTournament(
  clubId: string,
  tournamentId: string,
  input: UpdateTournamentInput,
  updatedBy: string,
): Promise<Tournament> {
  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId },
  });
  if (!existing) {
    throw new Error("Tournament not found");
  }
  if (existing.status === "CANCELLED") {
    throw new Error("Cannot update a cancelled tournament");
  }

  const row = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description ?? null,
      }),
      ...(input.registrationOpensAt !== undefined && {
        registrationOpensAt: new Date(input.registrationOpensAt),
      }),
      ...(input.registrationClosesAt !== undefined && {
        registrationClosesAt: new Date(input.registrationClosesAt),
      }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
      updatedBy,
    },
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: updatedBy },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: updatedBy,
    userDisplayName: actor?.displayName ?? updatedBy,
    action: "tournament.updated",
    entity: "Tournament",
    entityId: row.id,
    metadata: { ...input },
  });

  return toTournament(row);
}

export async function publishTournament(
  clubId: string,
  tournamentId: string,
  actingUserId: string,
): Promise<TournamentWithCategories> {
  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId },
  });
  if (!existing) {
    throw new Error("Tournament not found");
  }
  if (existing.status !== "DRAFT") {
    throw new Error("Only a draft tournament can be published");
  }

  const { tournament, categories } = await prisma.$transaction(async (tx) => {
    const tournamentRow = await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "REGISTRATION_OPEN",
        publishedAt: new Date(),
        updatedBy: actingUserId,
      },
    });

    await tx.tournamentCategory.updateMany({
      where: { tournamentId },
      data: { status: "REGISTRATION_OPEN" },
    });

    const categoryRows = await tx.tournamentCategory.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "asc" },
    });

    return { tournament: tournamentRow, categories: categoryRows };
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: actingUserId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: actingUserId,
    userDisplayName: actor?.displayName ?? actingUserId,
    action: "tournament.published",
    entity: "Tournament",
    entityId: tournament.id,
    metadata: { name: tournament.name },
  });

  return toTournamentWithCategories(tournament, categories);
}

export async function cancelTournament(
  clubId: string,
  tournamentId: string,
  actingUserId: string,
): Promise<TournamentWithCategories> {
  const existing = await prisma.tournament.findFirst({
    where: { id: tournamentId, clubId },
  });
  if (!existing) {
    throw new Error("Tournament not found");
  }
  if (existing.status === "CANCELLED") {
    throw new Error("Tournament is already cancelled");
  }
  if (existing.status === "COMPLETED") {
    throw new Error("Cannot cancel a completed tournament");
  }

  const { tournament, categories } = await prisma.$transaction(async (tx) => {
    const tournamentRow = await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "CANCELLED", updatedBy: actingUserId },
    });

    await tx.tournamentCategory.updateMany({
      where: {
        tournamentId,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      data: { status: "CANCELLED" },
    });

    const categoryRows = await tx.tournamentCategory.findMany({
      where: { tournamentId },
      orderBy: { createdAt: "asc" },
    });

    return { tournament: tournamentRow, categories: categoryRows };
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: actingUserId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId: actingUserId,
    userDisplayName: actor?.displayName ?? actingUserId,
    action: "tournament.cancelled",
    entity: "Tournament",
    entityId: tournament.id,
    metadata: { name: tournament.name },
  });

  return toTournamentWithCategories(tournament, categories);
}

/**
 * Global (not club-scoped) discovery query — see the plan's "no home club"
 * finding: a player books across any club, so tournament visibility can't be
 * scoped to a single one. Surfaces a tournament when either (a) it's
 * currently open for registration, or (b) the player already has a
 * non-withdrawn team in it and it hasn't finished/been cancelled yet — so a
 * player never loses access to their own bracket once general registration
 * closes.
 */
export async function listOpenTournamentsForPlayer(
  playerId: string,
): Promise<OpenTournamentSummary[]> {
  const now = new Date();

  const rows = await prisma.tournament.findMany({
    where: {
      OR: [
        {
          status: "REGISTRATION_OPEN",
          registrationOpensAt: { lte: now },
          registrationClosesAt: { gte: now },
        },
        {
          status: { notIn: ["COMPLETED", "CANCELLED"] },
          categories: {
            some: {
              teams: {
                some: {
                  status: { not: "WITHDRAWN" },
                  OR: [{ player1Id: playerId }, { player2Id: playerId }],
                },
              },
            },
          },
        },
      ],
    },
    include: { club: { select: { name: true } } },
    orderBy: { registrationOpensAt: "asc" },
  });

  return rows.map((row) => ({
    ...toTournament(row),
    clubName: row.club.name,
  }));
}

export async function getTournamentDetailForPlayer(
  tournamentId: string,
  viewerId: string,
): Promise<
  | (TournamentWithCategories & { clubName: string; myTeams: TournamentTeam[] })
  | null
> {
  const row = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      categories: { orderBy: { createdAt: "asc" } },
      club: { select: { name: true } },
    },
  });
  if (!row) return null;

  const myTeamRows = await prisma.tournamentTeam.findMany({
    where: {
      tournamentCategoryId: {
        in: row.categories.map((category) => category.id),
      },
      OR: [{ player1Id: viewerId }, { player2Id: viewerId }],
    },
  });

  return {
    ...toTournamentWithCategories(row, row.categories),
    clubName: row.club.name,
    myTeams: myTeamRows.map(toTournamentTeam),
  };
}
