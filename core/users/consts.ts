import type { DominantHand, PreferredSide } from "@/core/users/types";

// Argentine padel skill-level convention: Category 1 is the highest level,
// Category 8 is a beginner. "unknown" submits as a null padelCategory.
const PADEL_CATEGORY_VALUES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "unknown",
] as const;

// Every label below lives in the messages/*.json "UserOptionLabels"
// namespace (not as a literal here) — these are plain data/util exports, not
// components, so they can't call useTranslations() themselves. Callers pass
// their own next-intl `t`: either their own useTranslations("UserOptionLabels")
// result, or (server-side) getTranslations("UserOptionLabels") — same factory
// pattern as getActionLabel(name, t) in
// app/dashboard/audit-logs/_components/AuditLogsView/utils.ts.
export type UserOptionLabelsT = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function buildPadelCategoryOptions(
  t: UserOptionLabelsT,
): { value: string; label: string }[] {
  return PADEL_CATEGORY_VALUES.map((value) => ({
    value,
    label: t(`padelCategory.${value}`),
  }));
}

export function buildPreferredSideOptions(
  t: UserOptionLabelsT,
): { value: PreferredSide; label: string }[] {
  return [
    { value: "forehand", label: t("preferredSide.forehand") },
    { value: "backhand", label: t("preferredSide.backhand") },
  ];
}

export function buildDominantHandOptions(
  t: UserOptionLabelsT,
): { value: DominantHand; label: string }[] {
  return [
    { value: "right", label: t("dominantHand.right") },
    { value: "left", label: t("dominantHand.left") },
  ];
}

export function getPreferredSideLabel(
  value: PreferredSide | null,
  t: UserOptionLabelsT,
): string {
  if (value === null) return t("notSet");
  return t(`preferredSide.${value}`);
}

export function getDominantHandLabel(
  value: DominantHand | null,
  t: UserOptionLabelsT,
): string {
  if (value === null) return t("notSet");
  return t(`dominantHand.${value}`);
}

export function getPadelCategoryLabel(
  category: number | null,
  t: UserOptionLabelsT,
): string {
  if (category === null) return t("notSet");
  const value = String(category);
  const isKnownCategory = (PADEL_CATEGORY_VALUES as readonly string[]).includes(
    value,
  );
  return isKnownCategory
    ? t(`padelCategory.${value}`)
    : t("padelCategory.other", { category });
}
