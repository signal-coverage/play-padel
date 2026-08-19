import type { DominantHand, PreferredSide } from "@/core/users/types";

// Argentine padel skill-level convention: Category 1 is the highest level,
// Category 8 is a beginner. "unknown" submits as a null padelCategory.
export const PADEL_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "1", label: "Category 1 — highest level" },
  { value: "2", label: "Category 2" },
  { value: "3", label: "Category 3" },
  { value: "4", label: "Category 4" },
  { value: "5", label: "Category 5" },
  { value: "6", label: "Category 6" },
  { value: "7", label: "Category 7" },
  { value: "8", label: "Category 8 — beginner" },
  { value: "unknown", label: "Not sure yet" },
];

export const PREFERRED_SIDE_OPTIONS: { value: PreferredSide; label: string }[] =
  [
    { value: "forehand", label: "Forehand" },
    { value: "backhand", label: "Backhand" },
  ];

export const DOMINANT_HAND_OPTIONS: { value: DominantHand; label: string }[] = [
  { value: "right", label: "Right-handed" },
  { value: "left", label: "Left-handed" },
];

export function getPreferredSideLabel(value: PreferredSide | null): string {
  if (value === null) return "Not set yet";
  return PREFERRED_SIDE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getDominantHandLabel(value: DominantHand | null): string {
  if (value === null) return "Not set yet";
  return DOMINANT_HAND_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPadelCategoryLabel(category: number | null): string {
  if (category === null) return "Not set yet";
  const option = PADEL_CATEGORY_OPTIONS.find(
    (o) => o.value === String(category),
  );
  return option?.label ?? `Category ${category}`;
}
