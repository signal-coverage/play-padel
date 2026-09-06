import type { AdminSearchClubResult } from "../../types";

export type AdminSearchClubResultsProps = {
  clubs: AdminSearchClubResult[];
  isLoading: boolean;
  onSelectClub: (clubId: string) => void;
};
