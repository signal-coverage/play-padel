import { prisma } from "@/infrastructure/db/client";
import {
  computeStandingsFromMatches,
  type StandingRow,
  type StandingsMatchInput,
} from "@/core/tournaments/services/standingsCalculator";
import { deriveMatchResult } from "@/core/tournaments/services/matchResult";
import { listGroupsForCategory } from "@/core/tournaments/services/groups.service";
import {
  listKnockoutMatchesForCategory,
  listMatchesForGroup,
} from "@/core/tournaments/services/matches.service";
import { listTeamsForCategoryWithPlayers } from "@/core/tournaments/services/tournamentTeams.service";
import type {
  KnockoutRound,
  PlayerPerformanceSummary,
  TournamentGroupWithTeamIds,
  TournamentMatch,
  TournamentMatchResult,
  TournamentTeamWithPlayers,
} from "@/core/tournaments/types";

// Minimal shape this needs from a match row — satisfied by both a
// tournamentMatch.findMany({ include: { sets: true } }) row and the nested
// `groups.matches` shape matches.service.ts's generateKnockoutBracket
// fetches in one category-wide query.
export interface StandingsSourceMatch {
  teamAId: string | null;
  teamBId: string | null;
  status: string;
  winnerTeamId: string | null;
  sets: { setNumber: number; teamAGames: number; teamBGames: number }[];
}

/**
 * Maps one resolved (COMPLETED/WALKOVER) match row into standingsCalculator's
 * input shape. A COMPLETED match's MatchSet rows are the source of truth for
 * its set/game tallies — re-derived here via deriveMatchResult rather than
 * trusting any denormalized value. A WALKOVER match has no sets at all, so it
 * contributes only a win/loss (computeStandingsFromMatches already treats
 * those fields as optional). Exported so any other caller building
 * standings from an already-fetched match list (e.g. matches.service.ts's
 * generateKnockoutBracket, seeding the bracket from each group's standings)
 * reuses this exact mapping instead of re-deriving it.
 */
export function toStandingsMatchInput(
  match: StandingsSourceMatch,
): StandingsMatchInput {
  if (match.status === "WALKOVER" || match.sets.length === 0) {
    return {
      teamAId: match.teamAId!,
      teamBId: match.teamBId!,
      status: match.status as "COMPLETED" | "WALKOVER",
      winnerTeamId: match.winnerTeamId!,
    };
  }

  const result = deriveMatchResult(
    match.sets.map((set) => ({
      setNumber: set.setNumber,
      teamAGames: set.teamAGames,
      teamBGames: set.teamBGames,
    })),
  );

  return {
    teamAId: match.teamAId!,
    teamBId: match.teamBId!,
    status: "COMPLETED",
    winnerTeamId: match.winnerTeamId!,
    setsWonA: result.setsWonA,
    setsWonB: result.setsWonB,
    gamesWonA: result.gamesWonA,
    gamesWonB: result.gamesWonB,
  };
}

/**
 * Computes a group's standings from its teams and resolved (COMPLETED/
 * WALKOVER) matches.
 */
export async function computeGroupStandings(
  groupId: string,
): Promise<StandingRow[]> {
  const group = await prisma.tournamentGroup.findUnique({
    where: { id: groupId },
    include: { teams: true },
  });
  if (!group) {
    throw new Error("Group not found");
  }

  const matches = await prisma.tournamentMatch.findMany({
    where: { groupId, status: { in: ["COMPLETED", "WALKOVER"] } },
    include: { sets: true },
  });

  const standingsMatches: StandingsMatchInput[] = matches.map(
    toStandingsMatchInput,
  );

  return computeStandingsFromMatches(
    group.teams.map((team) => ({ id: team.id })),
    standingsMatches,
  );
}

// --- Slice 3 ("Knockout + standings") addition below ---

export interface StandingsGroupDetail {
  group: TournamentGroupWithTeamIds;
  standings: StandingRow[];
  matches: TournamentMatch[];
}

export interface StandingsKnockoutRoundDetail {
  round: KnockoutRound;
  matches: TournamentMatch[];
}

export interface CategoryStandingsDetail {
  groups: StandingsGroupDetail[];
  knockoutRounds: StandingsKnockoutRoundDetail[];
  // Every team in the category, with display names — lets a single fetch
  // build a teamId -> label map without a second round trip (mirrors the
  // owner UI's own teamLabels-from-teams pattern in CategoryWorkspace).
  teams: TournamentTeamWithPlayers[];
}

// Play order — also the KnockoutRound enum's own declared order (see
// prisma/schema.prisma), so this is the ladder's canonical display order too.
const KNOCKOUT_ROUND_ORDER: KnockoutRound[] = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
];

/**
 * Read-only detail for a single category — every group's standings/matches
 * plus (once any exist) the knockout bracket as a flat list of rounds, each
 * with its matches. No bracket graphic, per the plan's explicit "plain
 * tables — no bracket graphic in this pass" decision. Shared shape for both
 * the owner's KnockoutRoundsList (via the owner-gated knockout list route)
 * and the player-facing read-only GroupsStandingsView (via the player-gated
 * .../categories/[categoryId]/standings route) — see matches.service.ts's
 * listKnockoutMatchesForCategory/listMatchesForGroup and groups.service.ts's
 * listGroupsForCategory, all reused here rather than re-querying.
 */
export async function getCategoryStandingsDetail(
  categoryId: string,
): Promise<CategoryStandingsDetail | null> {
  const category = await prisma.tournamentCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) return null;

  const groups = await listGroupsForCategory(categoryId);
  const groupDetails: StandingsGroupDetail[] = await Promise.all(
    groups.map(async (group) => {
      const [standings, matches] = await Promise.all([
        computeGroupStandings(group.id),
        listMatchesForGroup(group.id),
      ]);
      return { group, standings, matches };
    }),
  );

  const knockoutMatches = await listKnockoutMatchesForCategory(categoryId);
  const knockoutRounds: StandingsKnockoutRoundDetail[] =
    KNOCKOUT_ROUND_ORDER.map((round) => ({
      round,
      matches: knockoutMatches.filter((match) => match.knockoutRound === round),
    })).filter((entry) => entry.matches.length > 0);

  const teams = await listTeamsForCategoryWithPlayers(categoryId);

  return { groups: groupDetails, knockoutRounds, teams };
}

// --- Slice 6 ("PerformanceSummary wiring") addition below ---

// The "no tournament history at all" shape (see the plan's explicit "zero
// tournaments played" convention): PlayerOverview's PerformanceSummarySection
// (and its TournamentRecord/LatestTournamentResults children) are rendered
// unconditionally with a required, non-null `performance` prop -- unlike
// LatestPartnerCard's own `partner: PartnerSummary | null` empty-state
// pattern, there is no null branch anywhere in that render tree. So a player
// with zero tournament teams gets this zero-value object rather than null,
// requiring literally no changes to that already-shipped UI.
const EMPTY_PERFORMANCE_SUMMARY: PlayerPerformanceSummary = {
  tournamentsWon: 0,
  tournamentsPlayed: 0,
  latestTournamentName: "",
  latestResults: [],
};

const DECIDED_MATCH_STATUSES = ["COMPLETED", "WALKOVER"] as const;

// Cap on latestResults -- confirmed against LatestTournamentResults.tsx,
// which renders every entry in `results` with no truncation of its own, so
// this service is the only place that needs to bound the count.
const LATEST_RESULTS_LIMIT = 5;

/**
 * Real data behind PlayerOverview's Performance Summary card (see
 * PlayerOverview/hooks.ts's usePerformanceSummary). tournamentsPlayed/Won are
 * both DISTINCT-tournament counts derived from every one of the player's
 * TournamentTeam rows across any category, in any tournament (a player can
 * register in multiple categories or multiple tournaments -- see the plan).
 * latestTournamentName/latestResults are both derived from the same single
 * "last 5 decided matches, across ANY of the player's tournaments" query --
 * the most recent of those 5 names the tournament, and a fallback to the
 * most recently registered team's tournament covers a player who hasn't
 * played their first match yet. Sets/games are not re-derived here (unlike
 * toStandingsMatchInput) -- only the already-decided winnerTeamId is needed
 * to produce a W/L.
 */
export async function computePerformanceSummaryForPlayer(
  playerId: string,
): Promise<PlayerPerformanceSummary> {
  const teams = await prisma.tournamentTeam.findMany({
    where: { OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    select: {
      id: true,
      status: true,
      createdAt: true,
      tournamentCategory: {
        select: {
          tournamentId: true,
          tournament: { select: { name: true } },
        },
      },
    },
  });

  if (teams.length === 0) {
    return EMPTY_PERFORMANCE_SUMMARY;
  }

  const tournamentsPlayedIds = new Set(
    teams
      .filter((team) => team.status !== "WITHDRAWN")
      .map((team) => team.tournamentCategory.tournamentId),
  );
  const tournamentsWonIds = new Set(
    teams
      .filter((team) => team.status === "CHAMPION")
      .map((team) => team.tournamentCategory.tournamentId),
  );

  const teamIds = teams.map((team) => team.id);
  const teamIdSet = new Set(teamIds);

  const decidedMatches = await prisma.tournamentMatch.findMany({
    where: {
      status: { in: [...DECIDED_MATCH_STATUSES] },
      OR: [{ teamAId: { in: teamIds } }, { teamBId: { in: teamIds } }],
    },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: LATEST_RESULTS_LIMIT,
    select: {
      teamAId: true,
      teamBId: true,
      winnerTeamId: true,
      completedAt: true,
      tournamentCategory: {
        select: { tournament: { select: { name: true } } },
      },
    },
  });

  const latestResults: TournamentMatchResult[] = decidedMatches.map((match) => {
    const ownTeamId = teamIdSet.has(match.teamAId ?? "")
      ? match.teamAId
      : match.teamBId;
    return match.winnerTeamId === ownTeamId ? "W" : "L";
  });

  let latestTournamentName: string;
  if (decidedMatches.length > 0) {
    latestTournamentName = decidedMatches[0].tournamentCategory.tournament.name;
  } else {
    const mostRecentlyRegisteredTeam = [...teams].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    latestTournamentName =
      mostRecentlyRegisteredTeam.tournamentCategory.tournament.name;
  }

  return {
    tournamentsWon: tournamentsWonIds.size,
    tournamentsPlayed: tournamentsPlayedIds.size,
    latestTournamentName,
    latestResults,
  };
}
