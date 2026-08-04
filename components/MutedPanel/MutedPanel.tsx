import { cn } from "@/lib/utils/utils";
import type { MutedPanelProps } from "./types";

export function MutedPanel({
  children,
  bordered = false,
  size = "sm",
  className,
}: MutedPanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl",
        bordered ? "border border-border bg-muted/40" : "bg-muted/50",
        size === "sm" ? "p-2.5" : "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
