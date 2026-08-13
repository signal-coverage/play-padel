import type { Club } from "@/core/clubs/types";

export type ClubCardProps = {
  club: Club;
  selected: boolean;
  onClick: () => void;
};
