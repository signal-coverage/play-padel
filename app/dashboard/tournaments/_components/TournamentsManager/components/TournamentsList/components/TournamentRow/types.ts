import type { OwnerTournamentSummary } from "../../../../types";

export type TournamentRowProps = {
  tournament: OwnerTournamentSummary;
  isSelected: boolean;
  onSelect: (tournamentId: string) => void;
  onPublish: (tournamentId: string) => void;
  isPublishing: boolean;
};
