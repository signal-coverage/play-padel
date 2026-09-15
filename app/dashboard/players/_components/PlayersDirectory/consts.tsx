export const playersQueryKey = ["players"] as const;

import { Badge } from "@/components/ui/badge";
import { buildPadelCategoryOptions } from "@/app/onboarding/types";
import {
  buildDominantHandOptions,
  buildPreferredSideOptions,
  getDominantHandLabel,
  getPreferredSideLabel,
  getPadelCategoryLabel,
} from "@/core/users/consts";
import type { UserOptionLabelsT } from "@/core/users/consts";
import type { DataTableColumn } from "@/components/DataTable";
import type { PlayerListItem, PlayerSortField } from "./types";

// These column/option builders live here (rather than as literals) because
// this is a plain data module, not a component — it can't call
// useTranslations() itself. Callers pass in their own next-intl `t`:
// PlayersDirectory.tsx's useTranslations('PlayersDirectory') for the table
// columns, and PlayersFilterBar.tsx's useTranslations('PlayersFilterBar')
// for the filter/sort options — same factory pattern as CourtFormSheet's
// buildCourtFormSchema(t) in ./components/CourtFormSheet/consts.ts.
// `tOptions` is a second, separate useTranslations('UserOptionLabels')
// result — the shared category/side/hand labels live in that namespace (see
// core/users/consts.ts), not under either of the namespaces above.
export function buildStaticPlayerColumns(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
): DataTableColumn<PlayerListItem>[] {
  return [
    {
      key: "category",
      header: t("category"),
      cell: (player) => (
        <Badge variant="outline">
          {getPadelCategoryLabel(player.padelCategory, tOptions)}
        </Badge>
      ),
    },
    {
      key: "preferredSide",
      header: t("preferredSide"),
      cell: (player) => getPreferredSideLabel(player.preferredSide, tOptions),
    },
    {
      key: "dominantHand",
      header: t("dominantHand"),
      cell: (player) => getDominantHandLabel(player.dominantHand, tOptions),
    },
  ];
}

export function buildCategoryFilterOptions(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
) {
  return [
    { value: "all", label: t("allCategories") },
    ...buildPadelCategoryOptions(tOptions),
  ];
}

export function buildPreferredSideFilterOptions(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
) {
  return [
    { value: "all", label: t("allSides") },
    ...buildPreferredSideOptions(tOptions),
  ];
}

export function buildDominantHandFilterOptions(
  t: (key: string) => string,
  tOptions: UserOptionLabelsT,
) {
  return [
    { value: "all", label: t("allHands") },
    ...buildDominantHandOptions(tOptions),
  ];
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
