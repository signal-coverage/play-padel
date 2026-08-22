export const playersQueryKey = ["players"] as const;

import { Badge } from "@/components/ui/badge";
import { PADEL_CATEGORY_OPTIONS } from "@/app/onboarding/types";
import {
  DOMINANT_HAND_OPTIONS,
  PREFERRED_SIDE_OPTIONS,
  getDominantHandLabel,
  getPreferredSideLabel,
  getPadelCategoryLabel,
} from "@/core/users/consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { PlayerListItem, PlayerSortField } from "./types";

export const STATIC_PLAYER_COLUMNS: DataTableColumn<PlayerListItem>[] = [
  {
    key: "category",
    header: "Category",
    cell: (player) => (
      <Badge variant="outline">
        {getPadelCategoryLabel(player.padelCategory)}
      </Badge>
    ),
  },
  {
    key: "preferredSide",
    header: "Preferred side",
    cell: (player) => getPreferredSideLabel(player.preferredSide),
  },
  {
    key: "dominantHand",
    header: "Dominant hand",
    cell: (player) => getDominantHandLabel(player.dominantHand),
  },
];

export const CATEGORY_FILTER_OPTIONS = [
  { value: "all", label: "All categories" },
  ...PADEL_CATEGORY_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
  })),
];

export const PREFERRED_SIDE_FILTER_OPTIONS = [
  { value: "all", label: "All sides" },
  ...PREFERRED_SIDE_OPTIONS,
];

export const DOMINANT_HAND_FILTER_OPTIONS = [
  { value: "all", label: "All hands" },
  ...DOMINANT_HAND_OPTIONS,
];

export const SORT_FIELD_OPTIONS: { value: PlayerSortField; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
  { value: "preferredSide", label: "Preferred side" },
  { value: "dominantHand", label: "Dominant hand" },
];
