import { cn } from "@/lib/utils/utils";

export function getColorSwatchClassName(selected: boolean) {
  return cn(
    "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 bg-cover transition-transform duration-200 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-offset-2",
    selected
      ? "border-foreground scale-110"
      : "border-transparent hover:scale-105",
  );
}

export const CUSTOM_SWATCH_BACKGROUND =
  "conic-gradient(from 180deg, #ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #d946ef, #ef4444)";
