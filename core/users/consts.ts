import type { DominantHand, PreferredSide } from "@/core/users/types";

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
