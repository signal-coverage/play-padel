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
      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white/85 backdrop-blur-md">
        {label}:{" "}
        <span
          className={cn("font-bold text-white tabular-nums", valueClassName)}
        >
          {value}
        </span>
      </span>
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
          <span
            className={cn(
              "font-medium text-right tabular-nums",
              valueClassName,
            )}
          >
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
