import type { AdminClubListItem } from "../../types";

export type AdminClubListProps = {
  clubs: AdminClubListItem[];
  isLoading: boolean;
  selectedClubId?: string;
  onSelectClub: (clubId: string) => void;
};
