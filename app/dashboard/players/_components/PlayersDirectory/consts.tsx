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

// These column/option builders live here (rather than as literals) because
// this is a plain data module, not a component — it can't call
// useTranslations() itself. Callers pass in their own next-intl `t`:
// PlayersDirectory.tsx's useTranslations('PlayersDirectory') for the table
// columns, and PlayersFilterBar.tsx's useTranslations('PlayersFilterBar')
// for the filter/sort options — same factory pattern as CourtFormSheet's
// buildCourtFormSchema(t) in ./components/CourtFormSheet/consts.ts.
export function buildStaticPlayerColumns(
  t: (key: string) => string,
): DataTableColumn<PlayerListItem>[] {
  return [
    {
      key: "category",
      header: t("category"),
      cell: (player) => (
        <Badge variant="outline">
          {getPadelCategoryLabel(player.padelCategory)}
        </Badge>
      ),
    },
    {
      key: "preferredSide",
      header: t("preferredSide"),
      cell: (player) => getPreferredSideLabel(player.preferredSide),
    },
    {
      key: "dominantHand",
      header: t("dominantHand"),
      cell: (player) => getDominantHandLabel(player.dominantHand),
    },
  ];
}

export function buildCategoryFilterOptions(t: (key: string) => string) {
  return [
    { value: "all", label: t("allCategories") },
    ...PADEL_CATEGORY_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];
}

export function buildPreferredSideFilterOptions(t: (key: string) => string) {
  return [{ value: "all", label: t("allSides") }, ...PREFERRED_SIDE_OPTIONS];
}

export function buildDominantHandFilterOptions(t: (key: string) => string) {
  return [{ value: "all", label: t("allHands") }, ...DOMINANT_HAND_OPTIONS];
}

export function buildSortFieldOptions(
  t: (key: string) => string,
): { value: PlayerSortField; label: string }[] {
  return [
    { value: "name", label: t("name") },
    { value: "category", label: t("category") },
    { value: "preferredSide", label: t("preferredSide") },
    { value: "dominantHand", label: t("dominantHand") },
  ];
}
