import type { PlayerProfileData } from "@/components/PlayerProfileCard";
import type { DominantHand, PreferredSide } from "@/core/users/types";

export type PlayerListItem = PlayerProfileData & { id: string };

export type PlayerFilters = {
  category: "all" | "unknown" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
  preferredSide: "all" | PreferredSide;
  dominantHand: "all" | DominantHand;
};

export type PlayerSortField =
  "name" | "category" | "preferredSide" | "dominantHand";

export type PlayerSort = {
  field: PlayerSortField;
  direction: "asc" | "desc";
};

// The admin-editable fields wire contract for PATCH
// /api/admin/players/[userId] (see PlayerEditSheet, which converts its own
// internal form values into this shape before calling onSubmit). Every
// field is optional since the server applies a partial update via
// updateUserProfile.
export type PlayerPatchInput = {
  displayName?: string;
  email?: string;
  phone?: string | null;
  padelCategory?: number | null;
  preferredSide?: PreferredSide | null;
  dominantHand?: DominantHand | null;
};
