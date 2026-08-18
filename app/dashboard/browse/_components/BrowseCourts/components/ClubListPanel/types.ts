import type { ClubBrowseSummary } from "../../types";

export type ClubListPanelProps = {
  clubs: ClubBrowseSummary[];
  selectedClubId: string | null;
  onSelectClub: (clubId: string) => void;
  isLoading: boolean;
  isError: boolean;
};
