// Wire shape returned by GET /api/tournaments/[tournamentId]/categories/
// [categoryId]/teams (player-facing) — see listTeamsForCategoryWithPlayers.
// Kept intentionally minimal, only the fields this panel renders.
export interface CategoryTeam {
  id: string;
  player1Id: string;
  player2Id: string;
  player1DisplayName: string;
  player2DisplayName: string;
  status: string;
}

export type RegistrationPanelProps = {
  tournamentId: string;
  categoryId: string;
  // The signed-in player's own id — used both to derive "am I already
  // registered in this category" from the fetched team list and to exclude
  // self as a PlayerPicker candidate (no self-tagging).
  viewerId: string;
};
