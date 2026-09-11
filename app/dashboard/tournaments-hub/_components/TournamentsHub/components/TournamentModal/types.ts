// Wire shape returned by GET /api/tournaments/[tournamentId] (player-facing)
// — see getTournamentDetailForPlayer. Kept intentionally minimal, only the
// fields this modal renders.

export interface PlayerCategorySummary {
  id: string;
  name: string;
  status: string;
}

export interface PlayerTournamentDetail {
  id: string;
  name: string;
  clubName: string;
  categories: PlayerCategorySummary[];
}

export type TournamentModalProps = {
  // null closes the dialog — matches the Dialog's own open={Boolean(...)}
  // convention (see PlayersDirectory's own selectedPlayer Dialog).
  tournamentId: string | null;
  onOpenChange: (open: boolean) => void;
};
