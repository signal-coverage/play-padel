import type { Club } from "@/core/clubs/types";

export type ClubPickerProps = {
  clubs: Club[];
  value: string | null;
  onChange: (clubId: string) => void;
  isLoading: boolean;
};
