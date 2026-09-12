import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { logAudit } from "@/core/audit/services/audit.service";
import type {
  TournamentTeam,
  TournamentTeamWithPlayers,
} from "@/core/tournaments/types";
import { CATEGORY_WITHDRAWABLE_STATUSES } from "@/core/tournaments/services/tournaments.service";

type TournamentTeamRow = NonNullable<
  Awaited<ReturnType<typeof prisma.tournamentTeam.findUnique>>
>;

function isUniqueTeamViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
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

/**
 * Registers a doubles team into a category. Validation order matches the
 * plan's exact list: self-partner check -> category/tournament window ->
 * both players are real -> neither already has a team here (friendly
 * pre-check backstopped by the schema's own @@unique) -> padel category
 * bounds -> maxTeams cap. combinedCategoryLevel snapshots the rounded
 * average of both partners' padelCategory at registration time (null when
 * either has none set) so a later profile edit never reshuffles seeding.
 */
export async function registerTeam(
  categoryId: string,
  registeringUserId: string,
  partnerId: string,
): Promise<TournamentTeam> {
  if (registeringUserId === partnerId) {
    throw new Error("You can't register yourself as your own partner.");
  }

  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new Error("Category not found");
  }

  const now = new Date();
  if (
    category.tournament.status !== "REGISTRATION_OPEN" ||
    now < category.tournament.registrationOpensAt ||
    now > category.tournament.registrationClosesAt
  ) {
    throw new Error("Registration is not open for this tournament.");
  }

  const [registeringUser, partner] = await Promise.all([
    prisma.userProfile.findUnique({ where: { id: registeringUserId } }),
    prisma.userProfile.findUnique({ where: { id: partnerId } }),
  ]);
  if (!registeringUser) {
    throw new Error("Registering player could not be found.");
  }
  if (!partner) {
    throw new Error("Partner could not be found.");
  }

  const existingTeam = await prisma.tournamentTeam.findFirst({
    where: {
      tournamentCategoryId: categoryId,
      status: { not: "WITHDRAWN" },
      OR: [
        { player1Id: registeringUserId },
        { player2Id: registeringUserId },
        { player1Id: partnerId },
        { player2Id: partnerId },
      ],
    },
  });
  if (existingTeam) {
    throw new Error(
      "One of these players is already registered in this category.",
    );
  }

  if (
    category.minCategoryLevel !== null ||
    category.maxCategoryLevel !== null
  ) {
    for (const player of [registeringUser, partner]) {
      if (player.padelCategory === null) continue;
      const belowMin =
        category.minCategoryLevel !== null &&
        player.padelCategory < category.minCategoryLevel;
      const aboveMax =
        category.maxCategoryLevel !== null &&
        player.padelCategory > category.maxCategoryLevel;
      if (belowMin || aboveMax) {
        throw new Error(
          `${player.displayName}'s padel category is outside this category's allowed range.`,
        );
      }
    }
  }

  if (category.maxTeams !== null) {
    const activeTeamCount = await prisma.tournamentTeam.count({
      where: {
        tournamentCategoryId: categoryId,
        status: { not: "WITHDRAWN" },
      },
    });
    if (activeTeamCount >= category.maxTeams) {
      throw new Error("This category has reached its maximum number of teams.");
    }
  }

  const combinedCategoryLevel =
    registeringUser.padelCategory !== null && partner.padelCategory !== null
      ? Math.round((registeringUser.padelCategory + partner.padelCategory) / 2)
      : null;

  let row: TournamentTeamRow;
  try {
    row = await prisma.tournamentTeam.create({
      data: {
        tournamentCategoryId: categoryId,
        player1Id: registeringUserId,
        player2Id: partnerId,
        combinedCategoryLevel,
        createdBy: registeringUserId,
      },
    });
  } catch (err) {
    if (isUniqueTeamViolation(err)) {
      throw new Error(
        "One of these players is already registered in this category.",
      );
    }
    throw err;
  }

  logAudit({
    clubId: category.tournament.clubId,
    userId: registeringUserId,
    userDisplayName: registeringUser.displayName,
    action: "tournament_team.registered",
    entity: "TournamentTeam",
    entityId: row.id,
    metadata: { tournamentCategoryId: categoryId, partnerId },
  });

  return toTournamentTeam(row);
}

/**
 * Either team member, or the owning club's owner, may withdraw a team —
 * but only while the category "hasn't locked groups" (see the plan): still
 * REGISTRATION_OPEN or REGISTRATION_CLOSED.
 */
export async function withdrawTeam(
  teamId: string,
  actingUserId: string,
): Promise<TournamentTeam> {
  const team = await prisma.tournamentTeam.findFirst({
    where: { id: teamId },
    include: { tournamentCategory: { include: { tournament: true } } },
  });
  if (!team) {
    throw new Error("Team not found");
  }

  const isTeamMember =
    team.player1Id === actingUserId || team.player2Id === actingUserId;

  if (!isTeamMember) {
    const actor = await prisma.userProfile.findUnique({
      where: { id: actingUserId },
      select: { role: true, clubId: true },
    });
    const isOwningClubOwner =
      actor?.role === "owner" &&
      actor.clubId === team.tournamentCategory.tournament.clubId;
    if (!isOwningClubOwner) {
      throw new Error("You are not allowed to withdraw this team.");
    }
  }

  if (team.status === "WITHDRAWN") {
    throw new Error("This team has already withdrawn.");
  }

  if (
    !CATEGORY_WITHDRAWABLE_STATUSES.includes(
      team.tournamentCategory
        .status as (typeof CATEGORY_WITHDRAWABLE_STATUSES)[number],
    )
  ) {
    throw new Error(
      "This team can no longer be withdrawn; groups have already been locked.",
    );
  }

  const row = await prisma.tournamentTeam.update({
    where: { id: teamId },
    data: {
      status: "WITHDRAWN",
      withdrawnAt: new Date(),
      withdrawnBy: actingUserId,
    },
  });

  logAudit({
    clubId: team.tournamentCategory.tournament.clubId,
    userId: actingUserId,
    userDisplayName: actingUserId,
    action: "tournament_team.withdrawn",
    entity: "TournamentTeam",
    entityId: row.id,
    metadata: { tournamentCategoryId: team.tournamentCategoryId },
  });

  return toTournamentTeam(row);
}

export async function listTeamsForCategory(
  categoryId: string,
): Promise<TournamentTeam[]> {
  const rows = await prisma.tournamentTeam.findMany({
    where: { tournamentCategoryId: categoryId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toTournamentTeam);
}

/**
 * Same as listTeamsForCategory, but joins in each player's displayName —
 * powers the owner UI's GroupBuilder, which needs teams to be human-
 * identifiable rather than shown as raw ids. Not part of the plan's
 * original explicit service list; added since nothing else exposed this
 * read shape.
 */
export async function listTeamsForCategoryWithPlayers(
  categoryId: string,
): Promise<TournamentTeamWithPlayers[]> {
  const rows = await prisma.tournamentTeam.findMany({
    where: { tournamentCategoryId: categoryId },
    orderBy: { createdAt: "asc" },
    include: {
      player1: { select: { displayName: true } },
      player2: { select: { displayName: true } },
    },
  });

  return rows.map((row) => ({
    ...toTournamentTeam(row),
    player1DisplayName: row.player1.displayName,
    player2DisplayName: row.player2.displayName,
  }));
}
