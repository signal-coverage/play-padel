// Wire shapes returned by the owner-scoped tournament API routes (JSON, so
// dates arrive as strings) — kept intentionally minimal, only the fields
// this management UI actually renders.

export interface OwnerCategorySummary {
  id: string;
  name: string;
  status: string;
  groupCount: number;
  advancesPerGroup: number;
}

export interface OwnerTournamentSummary {
  id: string;
  name: string;
  status: string;
}

export interface OwnerTournamentDetail extends OwnerTournamentSummary {
  categories: OwnerCategorySummary[];
}

export interface CategoryTeam {
  id: string;
  player1DisplayName: string;
  player2DisplayName: string;
  status: string;
  groupId?: string | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  position: number;
  teamIds: string[];
}

export interface GroupMatch {
  id: string;
  teamAId?: string | null;
  teamBId?: string | null;
  status: string;
  winnerTeamId?: string | null;
  // Slice 3 ("Knockout + standings") addition — set only on a knockout-stage
  // match (undefined/null for a GROUP match). Reused here rather than a
  // separate KnockoutMatch type since every other field already matches.
  knockoutRound?: string | null;
}

export interface StandingRowRecord {
  teamId: string;
  wins: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}
