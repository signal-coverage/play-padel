import type { ClubBrowseSummary } from "../../types";

export type ClubListPanelProps = {
  clubs: ClubBrowseSummary[];
  selectedClubSlug: string | null;
  onSelectClub: (clubSlug: string) => void;
  isLoading: boolean;
  isError: boolean;
};
