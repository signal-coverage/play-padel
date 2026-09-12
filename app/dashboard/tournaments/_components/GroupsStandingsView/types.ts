import type {
  CategoryGroup,
  CategoryTeam,
  GroupMatch,
  StandingRowRecord,
} from "../TournamentsManager/types";

// Wire shapes returned by GET /api/tournaments/[tournamentId]/categories/
// [categoryId]/standings (player-facing, read-only) — reuses the owner
// management UI's own wire types (../TournamentsManager/types) since the
// underlying JSON shapes are identical, just built by a different route.

export interface StandingsGroupDetail {
  group: CategoryGroup;
  standings: StandingRowRecord[];
  matches: GroupMatch[];
}

export interface StandingsKnockoutRoundDetail {
  round: string;
  matches: GroupMatch[];
}

export interface CategoryStandingsDetailResponse {
  groups: StandingsGroupDetail[];
  knockoutRounds: StandingsKnockoutRoundDetail[];
  teams: CategoryTeam[];
}

export type GroupsStandingsViewProps = {
  tournamentId: string;
  categoryId: string;
};
