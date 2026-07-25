import type { CourtRecord } from "../../types";

export type CourtsTableProps = {
  courts: CourtRecord[];
  isLoading: boolean;
  onEdit: (court: CourtRecord) => void;
  onEditAvailability: (court: CourtRecord) => void;
  onDelete: (court: CourtRecord) => void;
  deletingCourtId: string | null;
};
