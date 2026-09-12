import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import type { AuditAction } from "@/core/audit/types";
import type {
  GroupAssignmentInput,
  TournamentGroupWithTeamIds,
} from "@/core/tournaments/types";
import { generateRoundRobinMatches } from "@/core/tournaments/services/groupMatchGenerator";
import { distributeTeamsIntoGroups } from "@/core/tournaments/services/groupDistribution";

// Category lifecycle statuses that mean groups can no longer be (re)built —
// mirrors CATEGORY_WITHDRAWABLE_STATUSES's shape in tournaments.service.ts.
const LOCKED_OR_LATER_STATUSES = [
  "GROUPS_LOCKED",
  "KNOCKOUT",
  "COMPLETED",
  "CANCELLED",
] as const;

function isLockedOrLater(status: string): boolean {
  return (LOCKED_OR_LATER_STATUSES as readonly string[]).includes(status);
}

async function auditGroupsAction(
  categoryId: string,
  clubId: string,
  userId: string,
  action: AuditAction,
  metadata: Record<string, unknown>,
): Promise<void> {
  const actor = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId,
    userDisplayName: actor?.displayName ?? userId,
    action,
    entity: "TournamentCategory",
    entityId: categoryId,
    metadata,
  });
}

/**
 * Shared persistence step for both setGroupsManually and
 * generateGroupsAutomatically (see the plan's explicit "both funnel into the
 * same persistence step") — a full fresh replace of this category's
 * GROUP-stage matches and groups, so either entry point can be safely
 * re-run any number of times before lockGroups is called. Within one
 * transaction: wipe existing GROUP matches/groups (a group's ON DELETE SET
 * NULL FK automatically clears any team's stale groupId), create the new
 * TournamentGroup rows in order, assign each group's teams, then generate
 * and bulk-create that group's round-robin matches.
 */
async function persistGroups(
  categoryId: string,
  groupAssignments: GroupAssignmentInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.deleteMany({
      where: { tournamentCategoryId: categoryId, stage: "GROUP" },
    });
    await tx.tournamentGroup.deleteMany({
      where: { tournamentCategoryId: categoryId },
    });

    for (let index = 0; index < groupAssignments.length; index++) {
      const { groupName, teamIds } = groupAssignments[index];

      const group = await tx.tournamentGroup.create({
        data: {
          tournamentCategoryId: categoryId,
          name: groupName,
          position: index,
        },
      });

      await tx.tournamentTeam.updateMany({
        where: { id: { in: teamIds } },
        data: { groupId: group.id },
      });

      const matches = generateRoundRobinMatches(teamIds);
      if (matches.length > 0) {
        await tx.tournamentMatch.createMany({
          data: matches.map((match) => ({
            tournamentCategoryId: categoryId,
            groupId: group.id,
            stage: "GROUP" as const,
            status: "SCHEDULED" as const,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
          })),
        });
      }
    }
  });
}

/**
 * Owner builds groups by hand. Validation order: category exists -> not
 * already GROUPS_LOCKED+ -> every teamId belongs to this category -> none of
 * them already has a group -> no team listed twice across groups. Then
 * funnels into the same persistGroups step as the automatic path.
 */
export async function setGroupsManually(
  categoryId: string,
  groupAssignments: GroupAssignmentInput[],
  userId: string,
): Promise<void> {
  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new Error("Category not found");
  }
  if (isLockedOrLater(category.status)) {
    throw new Error("Groups have already been locked for this category.");
  }

  const allTeamIds = groupAssignments.flatMap((group) => group.teamIds);
  if (allTeamIds.length === 0) {
    throw new Error("At least one group with at least one team is required.");
  }
  if (new Set(allTeamIds).size !== allTeamIds.length) {
    throw new Error("A team cannot be assigned to more than one group.");
  }

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentCategoryId: categoryId, id: { in: allTeamIds } },
  });
  if (teams.length !== allTeamIds.length) {
    throw new Error("One or more teams do not belong to this category.");
  }
  const alreadyAssigned = teams.find((team) => team.groupId !== null);
  if (alreadyAssigned) {
    throw new Error("One or more teams are already assigned to a group.");
  }

  await persistGroups(categoryId, groupAssignments);

  await auditGroupsAction(
    categoryId,
    category.tournament.clubId,
    userId,
    "tournament_groups.set_manually",
    { groupCount: groupAssignments.length },
  );
}

/**
 * Owner triggers automatic, balanced group generation. Loads every
 * REGISTERED team in the category, seeds them via distributeTeamsIntoGroups
 * (serpentine by combinedCategoryLevel), then funnels into the same
 * persistGroups step as the manual path.
 */
export async function generateGroupsAutomatically(
  categoryId: string,
  userId: string,
): Promise<void> {
  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new Error("Category not found");
  }
  if (isLockedOrLater(category.status)) {
    throw new Error("Groups have already been locked for this category.");
  }

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentCategoryId: categoryId, status: "REGISTERED" },
  });
  if (teams.length === 0) {
    throw new Error("This category has no registered teams to group.");
  }

  const distribution = distributeTeamsIntoGroups(
    teams.map((team) => ({
      id: team.id,
      combinedCategoryLevel: team.combinedCategoryLevel,
    })),
    category.groupCount,
  );

  const teamIdsByGroupIndex = new Map<number, string[]>();
  for (const { groupIndex, teamId } of distribution) {
    const list = teamIdsByGroupIndex.get(groupIndex) ?? [];
    list.push(teamId);
    teamIdsByGroupIndex.set(groupIndex, list);
  }

  const groupAssignments: GroupAssignmentInput[] = Array.from(
    teamIdsByGroupIndex.entries(),
  )
    .sort(([indexA], [indexB]) => indexA - indexB)
    .map(([groupIndex, teamIds]) => ({
      groupName: `Group ${String.fromCharCode(65 + groupIndex)}`,
      teamIds,
    }));

  await persistGroups(categoryId, groupAssignments);

  await auditGroupsAction(
    categoryId,
    category.tournament.clubId,
    userId,
    "tournament_groups.generated_automatically",
    { groupCount: groupAssignments.length, teamCount: teams.length },
  );
}

/**
 * Transitions a category to GROUPS_LOCKED, freezing its groups/matches.
 * Rejects if already locked (or later) or if no groups exist yet.
 */
export async function lockGroups(
  categoryId: string,
  userId: string,
): Promise<void> {
  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    include: { tournament: true },
  });
  if (!category) {
    throw new Error("Category not found");
  }
  if (isLockedOrLater(category.status)) {
    throw new Error("Groups have already been locked for this category.");
  }

  const groupCount = await prisma.tournamentGroup.count({
    where: { tournamentCategoryId: categoryId },
  });
  if (groupCount === 0) {
    throw new Error("Create groups before locking.");
  }

  await prisma.tournamentCategory.update({
    where: { id: categoryId },
    data: { status: "GROUPS_LOCKED" },
  });

  await auditGroupsAction(
    categoryId,
    category.tournament.clubId,
    userId,
    "tournament_groups.locked",
    {},
  );
}

/**
 * Lists a category's groups (ordered by position) with each group's team
 * ids — powers the owner UI's GroupBuilder (existing assignments) and its
 * per-group matches/standings views. Not part of the plan's original
 * explicit service list; added since nothing else exposed this read shape.
 */
export async function listGroupsForCategory(
  categoryId: string,
): Promise<TournamentGroupWithTeamIds[]> {
  const rows = await prisma.tournamentGroup.findMany({
    where: { tournamentCategoryId: categoryId },
    orderBy: { position: "asc" },
    include: { teams: true },
  });

  return rows.map((row) => ({
    id: row.id,
    tournamentCategoryId: row.tournamentCategoryId,
    name: row.name,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    teamIds: row.teams.map((team) => team.id),
  }));
}
