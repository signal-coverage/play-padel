import type { OwnerTournamentSummary } from "../../types";

export type TournamentsListProps = {
  tournaments: OwnerTournamentSummary[];
  selectedTournamentId: string | null;
  onSelect: (tournamentId: string) => void;
};
