import { cn } from "@/lib/utils/utils";
import type { StatValueProps } from "./types";

/**
 * Shared label+value rendering for the dashboard's recurring stat shapes:
 * - `pill`: rounded chip used in the hero stat row (`StatPill`).
 * - `stacked`: label above value, used by activity stat rows.
 * - `row`: label left / value right, used by the skill-level row and the
 *   reservation detail rows. Pass `valueSlot` to render something other
 *   than plain text on the right (e.g. a status `Badge`).
 * - `inline`: `<value> <label>` fragment, used by today-caption sentences.
 */
export function StatValue({
  label,
  value,
  variant = "inline",
  valueClassName,
  valueSlot,
}: StatValueProps) {
  if (variant === "pill") {
    return (
      <div className="flex items-center gap-1 rounded-full bg-background/15 px-2.5 py-1 text-xs text-primary-foreground backdrop-blur-sm">
        <span className="text-primary-foreground/70">{label}</span>
        <span className={cn("font-semibold tabular-nums", valueClassName)}>
          {value}
        </span>
      </div>
    );
  }

  if (variant === "stacked") {
    return (
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn("text-base font-semibold tabular-nums", valueClassName)}
        >
          {value}
        </span>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">{label}</span>
        {valueSlot ?? (
          <span className={cn("font-medium text-right", valueClassName)}>
            {value}
          </span>
        )}
      </div>
    );
  }

  return (
    <>
      <span className={cn("tabular-nums", valueClassName)}>{value}</span>{" "}
      {label}
    </>
  );
}
