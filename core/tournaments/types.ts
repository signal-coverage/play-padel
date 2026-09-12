// Build order slice 1 ("Schema + registration core") of the Tournaments
// feature — see the approved plan. Deliberately does NOT model
// TournamentGroup/TournamentMatch/MatchSet or bracket-progression fields;
// those arrive in later, independently-mergeable slices.

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "GROUPS_LOCKED"
  | "KNOCKOUT"
  | "COMPLETED"
  | "CANCELLED";

export type TournamentCategoryStatus = TournamentStatus;

export type TournamentTeamStatus =
  "REGISTERED" | "ADVANCED" | "ELIMINATED" | "CHAMPION" | "WITHDRAWN";

export interface Tournament {
  id: string;
  clubId: string;
  name: string;
  description?: string;
  status: TournamentStatus;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  publishedAt?: Date;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface TournamentCategory {
  id: string;
  tournamentId: string;
  name: string;
  status: TournamentCategoryStatus;
  minCategoryLevel?: number;
  maxCategoryLevel?: number;
  groupCount: number;
  advancesPerGroup: number;
  maxTeams?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentTeam {
  id: string;
  tournamentCategoryId: string;
  player1Id: string;
  player2Id: string;
  combinedCategoryLevel?: number;
  status: TournamentTeamStatus;
  // Added in slice 2 ("Owner group + scoring tools") — deliberately omitted
  // by slice 1 since no TournamentGroup model existed yet then.
  groupId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  withdrawnAt?: Date;
  withdrawnBy?: string;
}

// --- Slice 2 ("Owner group + scoring tools") additions below ---

export type TournamentMatchStage = "GROUP" | "KNOCKOUT";

export type TournamentMatchStatus =
  "SCHEDULED" | "COMPLETED" | "WALKOVER" | "CANCELLED";

export interface TournamentGroup {
  id: string;
  tournamentCategoryId: string;
  name: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

// --- Slice 3 ("Knockout + standings") addition below ---

export type KnockoutRound =
  "ROUND_OF_32" | "ROUND_OF_16" | "QUARTERFINAL" | "SEMIFINAL" | "FINAL";

export interface TournamentMatch {
  id: string;
  tournamentCategoryId: string;
  stage: TournamentMatchStage;
  groupId?: string;
  // Slice 3 additions — only ever set on a KNOCKOUT-stage match.
  knockoutRound?: KnockoutRound;
  nextMatchId?: string;
  nextMatchSlot?: "A" | "B";
  teamAId?: string;
  teamBId?: string;
  status: TournamentMatchStatus;
  winnerTeamId?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchSet {
  id: string;
  matchId: string;
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
  teamATiebreakPoints?: number;
  teamBTiebreakPoints?: number;
  createdAt: Date;
}

export interface GroupAssignmentInput {
  groupName: string;
  teamIds: string[];
}

export interface EnterMatchScoreSetInput {
  setNumber: number;
  teamAGames: number;
  teamBGames: number;
}

// Read-shape additions purely for the owner management UI (GroupBuilder /
// group + matches listing) — not part of the plan's original explicit
// service list, but needed since no other listed function returns
// display-name-enriched teams or a category's existing groups. See
// groups.service.ts/tournamentTeams.service.ts for the functions that
// produce these.

export interface TournamentGroupWithTeamIds extends TournamentGroup {
  teamIds: string[];
}

export interface TournamentTeamWithPlayers extends TournamentTeam {
  player1DisplayName: string;
  player2DisplayName: string;
}

export interface TournamentWithCategories extends Tournament {
  categories: TournamentCategory[];
}

// Global (cross-club) player-facing summary — see listOpenTournamentsForPlayer.
export interface OpenTournamentSummary extends Tournament {
  clubName: string;
}

export interface CreateTournamentCategoryInput {
  name: string;
  groupCount: number;
  advancesPerGroup: number;
  minCategoryLevel?: number;
  maxCategoryLevel?: number;
  maxTeams?: number;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  startDate?: string;
  endDate?: string;
  categories: CreateTournamentCategoryInput[];
}

export interface UpdateTournamentInput {
  name?: string;
  description?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  startDate?: string;
  endDate?: string;
}

export interface RegisterTeamInput {
  partnerId: string;
}

// --- Slice 6 ("PerformanceSummary wiring") addition below ---

// Mirrors PlayerOverview's own MatchResult/PerformanceSummary shape (see
// app/dashboard/_components/DashboardHome/components/PlayerOverview/types.ts)
// field-for-field, same structural-mirroring convention as
// core/reservations/types.ts's LatestPartnerSummary mirroring PartnerSummary:
// the API route returns this shape as JSON and the app-level hook consumes it
// structurally, without a cross-layer import.
export type TournamentMatchResult = "W" | "L";

export interface PlayerPerformanceSummary {
  tournamentsWon: number;
  tournamentsPlayed: number;
  latestTournamentName: string;
  latestResults: TournamentMatchResult[];
}
