import type { AdminSearchClubResult } from "../../types";

export type AdminSearchClubResultsProps = {
  clubs: AdminSearchClubResult[];
  isLoading: boolean;
  onSelectClub: (clubSlug: string) => void;
};
