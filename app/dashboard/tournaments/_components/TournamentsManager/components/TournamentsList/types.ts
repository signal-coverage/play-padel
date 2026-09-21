import type { OwnerTournamentSummary } from "../../types";

export type TournamentsListProps = {
  tournaments: OwnerTournamentSummary[];
  selectedTournamentId: string | null;
  onSelect: (tournamentId: string) => void;
  // Forwarded from TournamentsManager's own optional prop — see that
  // component's comment. Threaded into useCreateTournament/
  // usePublishTournament below.
  clubId?: string;
};
