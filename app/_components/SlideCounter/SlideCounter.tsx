import { cn } from "@/lib/utils/utils";
import { formatSlideCounter } from "./utils";
import type { SlideCounterProps } from "./types";

export function SlideCounter({ current, total, className }: SlideCounterProps) {
  return (
    <span className={cn("text-sm text-[#999999] tabular-nums", className)}>
      {formatSlideCounter(current, total)}
    </span>
  );
}
