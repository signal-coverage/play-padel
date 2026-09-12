import { prisma } from "@/infrastructure/db/client";
import { logAudit } from "@/core/audit/services/audit.service";
import type {
  EnterMatchScoreSetInput,
  TournamentMatch,
} from "@/core/tournaments/types";
import { deriveMatchResult } from "@/core/tournaments/services/matchResult";
import {
  advanceWinner,
  buildKnockoutBracket,
} from "@/core/tournaments/services/bracketBuilder";
import { isGroupStageComplete } from "@/core/tournaments/services/groupStageStatus";
import { computeStandingsFromMatches } from "@/core/tournaments/services/standingsCalculator";
import { toStandingsMatchInput } from "@/core/tournaments/services/standings.service";

type TournamentMatchRow = NonNullable<
  Awaited<ReturnType<typeof prisma.tournamentMatch.findUnique>>
>;
// Prisma's generated transaction-client type — same $transaction callback
// shape used throughout this service.
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const DECIDED_STATUSES = ["COMPLETED", "WALKOVER"] as const;

// Category lifecycle statuses that mean "this category is done" for the
// purposes of aggregating a tournament's own completion — mirrors
// tournaments.service.ts's CATEGORY_WITHDRAWABLE_STATUSES-style const shape.
const CATEGORY_TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"] as const;

// Tournament lifecycle statuses that still precede KNOCKOUT — the first
// category of a tournament to generate its bracket bumps the tournament
// itself into KNOCKOUT, but only forward, never backward or redundantly.
const PRE_KNOCKOUT_TOURNAMENT_STATUSES = [
  "DRAFT",
  "REGISTRATION_OPEN",
  "REGISTRATION_CLOSED",
  "GROUPS_LOCKED",
] as const;

function toTournamentMatch(row: TournamentMatchRow): TournamentMatch {
  return {
    id: row.id,
    tournamentCategoryId: row.tournamentCategoryId,
    stage: row.stage,
    groupId: row.groupId ?? undefined,
    knockoutRound: row.knockoutRound ?? undefined,
    nextMatchId: row.nextMatchId ?? undefined,
    nextMatchSlot: (row.nextMatchSlot as "A" | "B" | null) ?? undefined,
    teamAId: row.teamAId ?? undefined,
    teamBId: row.teamBId ?? undefined,
    status: row.status,
    winnerTeamId: row.winnerTeamId ?? undefined,
    scheduledAt: row.scheduledAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Ownership-checked lookup — mirrors findOwnedTournament/findOwnedCourt's
 * "not found" contract (never leaks a different club's match's existence):
 * a match belonging to another club looks identical to a nonexistent one.
 */
async function findOwnedMatch(matchId: string, clubId: string) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: { tournamentCategory: { include: { tournament: true } } },
  });
  if (!match || match.tournamentCategory.tournament.clubId !== clubId) {
    return null;
  }
  return match;
}

/**
 * Terminal cascade for a category's knockout bracket, run once its FINAL
 * match is decided (see applyKnockoutProgression) or, degenerately, once a
 * category with exactly one overall qualifier skips the bracket entirely
 * (see generateKnockoutBracket). Sets the winner CHAMPION, every knockout
 * match's loser ELIMINATED (re-derived from winnerTeamId across every
 * decided knockout match in the category — not just the FINAL's own two
 * teams, per the plan's "every team eliminated along the way"), the
 * category COMPLETED, and — if every category of the tournament is now
 * terminal (COMPLETED or CANCELLED; a cancelled category is treated as
 * "done" too so one deliberately-cancelled category never blocks the
 * tournament from ever completing) — the tournament itself COMPLETED.
 */
async function completeKnockoutCategory(
  tx: TxClient,
  categoryId: string,
  tournamentId: string,
  championTeamId: string,
): Promise<void> {
  const decidedKnockoutMatches = await tx.tournamentMatch.findMany({
    where: {
      tournamentCategoryId: categoryId,
      stage: "KNOCKOUT",
      status: { in: [...DECIDED_STATUSES] },
    },
    select: { teamAId: true, teamBId: true, winnerTeamId: true },
  });

  const eliminatedTeamIds = new Set<string>();
  for (const match of decidedKnockoutMatches) {
    const loserId =
      match.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;
    if (loserId && loserId !== championTeamId) {
      eliminatedTeamIds.add(loserId);
    }
  }

  if (eliminatedTeamIds.size > 0) {
    await tx.tournamentTeam.updateMany({
      where: { id: { in: Array.from(eliminatedTeamIds) } },
      data: { status: "ELIMINATED" },
    });
  }

  await tx.tournamentTeam.update({
    where: { id: championTeamId },
    data: { status: "CHAMPION" },
  });

  await tx.tournamentCategory.update({
    where: { id: categoryId },
    data: { status: "COMPLETED" },
  });

  const siblingCategories = await tx.tournamentCategory.findMany({
    where: { tournamentId },
    select: { status: true },
  });
  const everyCategoryDone = siblingCategories.every((category) =>
    (CATEGORY_TERMINAL_STATUSES as readonly string[]).includes(category.status),
  );
  if (everyCategoryDone) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "COMPLETED" },
    });
  }
}

/**
 * Bumps a tournament into KNOCKOUT the first time any one of its categories
 * generates a bracket — a no-op once the tournament has already moved past
 * that point (a second, third, ... category reaching KNOCKOUT never re-fires
 * this or regresses a further-along tournament status).
 */
async function bumpTournamentToKnockout(
  tx: TxClient,
  tournamentId: string,
): Promise<void> {
  const tournament = await tx.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true },
  });
  if (
    tournament &&
    (PRE_KNOCKOUT_TOURNAMENT_STATUSES as readonly string[]).includes(
      tournament.status,
    )
  ) {
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "KNOCKOUT" },
    });
  }
}

/**
 * Knockout-only side effect of a match being decided (see enterMatchScore/
 * recordWalkover below) — a no-op for a GROUP-stage match. Either advances
 * the winner into its next match's slot, or — when there is no next match,
 * i.e. this was the bracket's FINAL — runs the category's completion
 * cascade.
 */
async function applyKnockoutProgression(
  tx: TxClient,
  match: Pick<
    TournamentMatchRow,
    "stage" | "nextMatchId" | "nextMatchSlot" | "tournamentCategoryId"
  > & { tournamentCategory: { tournamentId: string } },
  winnerTeamId: string,
): Promise<void> {
  if (match.stage !== "KNOCKOUT") return;

  const advancement = advanceWinner(
    { nextMatchId: match.nextMatchId, nextMatchSlot: match.nextMatchSlot },
    winnerTeamId,
  );

  if (advancement) {
    await tx.tournamentMatch.update({
      where: { id: advancement.matchId },
      data:
        advancement.slot === "A"
          ? { teamAId: winnerTeamId }
          : { teamBId: winnerTeamId },
    });
    return;
  }

  await completeKnockoutCategory(
    tx,
    match.tournamentCategoryId,
    match.tournamentCategory.tournamentId,
    winnerTeamId,
  );
}

/**
 * Full score entry (sets/games), best-of-3, owner-only. Derives the result
 * via deriveMatchResult; an incomplete score is rejected outright rather
 * than persisted as if it were final (no partial-state writes). On
 * completion, writes every MatchSet row plus the match's own
 * status/winnerTeamId/completedAt in one transaction — and, for a KNOCKOUT
 * match, advances the winner (or runs the category's completion cascade)
 * in that same transaction.
 */
export async function enterMatchScore(
  matchId: string,
  sets: EnterMatchScoreSetInput[],
  clubId: string,
  userId: string,
): Promise<void> {
  const match = await findOwnedMatch(matchId, clubId);
  if (!match) {
    throw new Error("Match not found");
  }
  if (
    DECIDED_STATUSES.includes(match.status as (typeof DECIDED_STATUSES)[number])
  ) {
    throw new Error("This match has already been decided.");
  }
  if (!match.teamAId || !match.teamBId) {
    throw new Error("This match doesn't have both teams assigned yet.");
  }

  const result = deriveMatchResult(sets);
  if (!result.isComplete || !result.winner) {
    throw new Error("This score is not complete yet (best-of-3).");
  }

  const winnerTeamId = result.winner === "A" ? match.teamAId : match.teamBId;

  await prisma.$transaction(async (tx) => {
    await tx.matchSet.createMany({
      data: sets.map((set) => ({
        matchId,
        setNumber: set.setNumber,
        teamAGames: set.teamAGames,
        teamBGames: set.teamBGames,
      })),
    });

    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        status: "COMPLETED",
        winnerTeamId,
        completedAt: new Date(),
      },
    });

    await applyKnockoutProgression(tx, match, winnerTeamId);
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId,
    userDisplayName: actor?.displayName ?? userId,
    action: "tournament_match.score_entered",
    entity: "TournamentMatch",
    entityId: matchId,
    metadata: { winnerTeamId, setCount: sets.length },
  });
}

/**
 * Records a walkover: the given team wins with no MatchSet rows written. For
 * a KNOCKOUT match this advances the winner (or runs the category's
 * completion cascade) in the same transaction, same as enterMatchScore.
 */
export async function recordWalkover(
  matchId: string,
  winningTeamId: string,
  clubId: string,
  userId: string,
): Promise<void> {
  const match = await findOwnedMatch(matchId, clubId);
  if (!match) {
    throw new Error("Match not found");
  }
  if (
    DECIDED_STATUSES.includes(match.status as (typeof DECIDED_STATUSES)[number])
  ) {
    throw new Error("This match has already been decided.");
  }
  if (winningTeamId !== match.teamAId && winningTeamId !== match.teamBId) {
    throw new Error("The winning team must be one of this match's two teams.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        status: "WALKOVER",
        winnerTeamId: winningTeamId,
        completedAt: new Date(),
      },
    });

    await applyKnockoutProgression(tx, match, winningTeamId);
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId,
    userDisplayName: actor?.displayName ?? userId,
    action: "tournament_match.walkover_recorded",
    entity: "TournamentMatch",
    entityId: matchId,
    metadata: { winnerTeamId: winningTeamId },
  });
}

export async function listMatchesForGroup(
  groupId: string,
): Promise<TournamentMatch[]> {
  const rows = await prisma.tournamentMatch.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toTournamentMatch);
}

export async function listMatchesForCategory(
  categoryId: string,
): Promise<TournamentMatch[]> {
  const rows = await prisma.tournamentMatch.findMany({
    where: { tournamentCategoryId: categoryId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toTournamentMatch);
}

/**
 * Knockout-only matches for a category, ordered round-by-round (the
 * KnockoutRound enum is declared ROUND_OF_32 -> FINAL, so ordering by it
 * ascending is ordering by play order — see prisma/schema.prisma). Powers
 * both the owner's KnockoutRoundsList and, indirectly, the player-facing
 * standings detail (see standings.service.ts).
 */
export async function listKnockoutMatchesForCategory(
  categoryId: string,
): Promise<TournamentMatch[]> {
  const rows = await prisma.tournamentMatch.findMany({
    where: { tournamentCategoryId: categoryId, stage: "KNOCKOUT" },
    orderBy: [{ knockoutRound: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(toTournamentMatch);
}

/**
 * Seeds qualifiers across groups for the knockout bracket. Standard "snake"
 * interleaving so a single group's own multiple qualifiers meet as late as
 * possible: rank 0 (group winners) taken group-by-group in `groupsInOrder`'s
 * order, rank 1 (runners-up) taken in REVERSE group order, rank 2 forward
 * again, and so on. E.g. 4 groups A/B/C/D with advancesPerGroup=2 seeds as
 * [A1, B1, C1, D1, D2, C2, B2, A2] — exactly the plan's own worked example.
 * A group with fewer qualifiers than another (should not normally happen —
 * advancesPerGroup is category-wide — but tolerated defensively) simply
 * contributes nothing at ranks it doesn't have.
 */
function seedQualifiersAcrossGroups(groupsInOrder: string[][]): string[] {
  const maxRank = groupsInOrder.reduce(
    (max, group) => Math.max(max, group.length),
    0,
  );

  const seeded: string[] = [];
  for (let rank = 0; rank < maxRank; rank++) {
    const orderForThisRank =
      rank % 2 === 0 ? groupsInOrder : [...groupsInOrder].reverse();
    for (const group of orderForThisRank) {
      const teamId = group[rank];
      if (teamId) seeded.push(teamId);
    }
  }
  return seeded;
}

/**
 * Generates a category's knockout bracket from its group standings.
 * Precondition: every group's matches must already be decided (reuses
 * isGroupStageComplete rather than reimplementing that check) and groups
 * must be locked; rejects if a bracket already exists for this category
 * (idempotency guard — no regenerating a bracket that's already started).
 *
 * Top `advancesPerGroup` teams per group (by standings order) are seeded
 * across the bracket via seedQualifiersAcrossGroups (documented there). The
 * degenerate case of exactly one qualifier overall skips buildKnockoutBracket
 * (which returns no matches for <=1 team) and goes straight to
 * completeKnockoutCategory — a lone qualifier is a trivial champion with
 * nothing left to play, same terminal cascade as a real FINAL win.
 */
export async function generateKnockoutBracket(
  categoryId: string,
  clubId: string,
  userId: string,
): Promise<void> {
  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    include: {
      tournament: true,
      groups: {
        orderBy: { position: "asc" },
        include: {
          teams: true,
          matches: { include: { sets: true } },
        },
      },
    },
  });
  if (!category || category.tournament.clubId !== clubId) {
    throw new Error("Category not found");
  }
  if (category.status !== "GROUPS_LOCKED") {
    throw new Error(
      "Groups must be locked before the knockout bracket can be generated.",
    );
  }
  if (category.groups.length === 0) {
    throw new Error("This category has no groups yet.");
  }

  const existingKnockoutMatchCount = await prisma.tournamentMatch.count({
    where: { tournamentCategoryId: categoryId, stage: "KNOCKOUT" },
  });
  if (existingKnockoutMatchCount > 0) {
    throw new Error(
      "A knockout bracket has already been generated for this category.",
    );
  }

  for (const group of category.groups) {
    const groupComplete = isGroupStageComplete(
      group.matches.map((match) => ({ status: match.status })),
    );
    if (!groupComplete) {
      throw new Error(
        "Every group match must be decided before generating the knockout bracket.",
      );
    }
  }

  const groupsInOrder = category.groups.map((group) => {
    const decidedMatches = group.matches
      .filter((match) =>
        DECIDED_STATUSES.includes(
          match.status as (typeof DECIDED_STATUSES)[number],
        ),
      )
      .map(toStandingsMatchInput);
    const standings = computeStandingsFromMatches(
      group.teams.map((team) => ({ id: team.id })),
      decidedMatches,
    );
    return standings
      .slice(0, category.advancesPerGroup)
      .map((row) => row.teamId);
  });

  const seededTeamIds = seedQualifiersAcrossGroups(groupsInOrder);
  if (seededTeamIds.length === 0) {
    throw new Error("No teams qualified for the knockout stage.");
  }

  const bracket = buildKnockoutBracket(seededTeamIds);

  await prisma.$transaction(async (tx) => {
    if (bracket.length === 0) {
      // Exactly one qualifier overall — trivial champion, nothing to play.
      await completeKnockoutCategory(
        tx,
        categoryId,
        category.tournamentId,
        seededTeamIds[0],
      );
      return;
    }

    const createdMatches: { id: string; winnerTeamId: string | null }[] = [];
    for (const spec of bracket) {
      const teamAId =
        spec.seedIndexA !== undefined ? seededTeamIds[spec.seedIndexA] : null;
      const teamBId =
        spec.seedIndexB !== undefined ? seededTeamIds[spec.seedIndexB] : null;
      const winnerTeamId = spec.isBye ? (teamAId ?? teamBId) : null;

      const created = await tx.tournamentMatch.create({
        data: {
          tournamentCategoryId: categoryId,
          stage: "KNOCKOUT",
          knockoutRound: spec.round,
          teamAId,
          teamBId,
          status: spec.isBye ? "WALKOVER" : "SCHEDULED",
          winnerTeamId,
          completedAt: spec.isBye ? new Date() : null,
        },
      });
      createdMatches.push({
        id: created.id,
        winnerTeamId: created.winnerTeamId,
      });
    }

    for (let i = 0; i < bracket.length; i++) {
      const spec = bracket[i];
      if (spec.nextMatchIndex === null) continue;
      await tx.tournamentMatch.update({
        where: { id: createdMatches[i].id },
        data: {
          nextMatchId: createdMatches[spec.nextMatchIndex].id,
          nextMatchSlot: spec.nextMatchSlot,
        },
      });
    }

    for (let i = 0; i < bracket.length; i++) {
      const spec = bracket[i];
      if (!spec.isBye || spec.nextMatchIndex === null) continue;
      const winnerTeamId = createdMatches[i].winnerTeamId;
      if (!winnerTeamId) continue;
      const nextMatch = createdMatches[spec.nextMatchIndex];
      await tx.tournamentMatch.update({
        where: { id: nextMatch.id },
        data:
          spec.nextMatchSlot === "A"
            ? { teamAId: winnerTeamId }
            : { teamBId: winnerTeamId },
      });
    }

    await tx.tournamentCategory.update({
      where: { id: categoryId },
      data: { status: "KNOCKOUT" },
    });

    await bumpTournamentToKnockout(tx, category.tournamentId);
  });

  const actor = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: { displayName: true },
  });
  logAudit({
    clubId,
    userId,
    userDisplayName: actor?.displayName ?? userId,
    action: "tournament_knockout.generated",
    entity: "TournamentCategory",
    entityId: categoryId,
    metadata: { teamCount: seededTeamIds.length, matchCount: bracket.length },
  });
}
