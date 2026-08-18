import type { CourtColumn } from "@/components/CourtAvailabilityGrid";

export type ClubCourtsPanelProps = {
  courts: CourtColumn[];
  selectedClubId: string | null;
  selectedCourtId: string | null;
  onSelectCourt: (courtId: string) => void;
  isLoading: boolean;
  isUpdating: boolean;
  isError: boolean;
};
