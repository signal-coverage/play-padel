import { cn } from "@/lib/utils/utils";
import type { ColorSwatchProps } from "./types";

export function ColorSwatch({ color, className }: ColorSwatchProps) {
  return (
    <span
      className={cn("h-2.5 w-2.5 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color ?? "#94a3b8" }}
      aria-hidden="true"
    />
  );
}
