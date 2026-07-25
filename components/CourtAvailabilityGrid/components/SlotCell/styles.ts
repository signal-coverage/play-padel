import { cn } from "@/lib/utils/utils";

import type { SlotStatus } from "../../types";

export function getSlotClassName(status: SlotStatus, interactive: boolean) {
  return cn(
    "flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors",
    status === "free"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-transparent bg-muted text-muted-foreground",
    interactive &&
      "cursor-pointer hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    !interactive && status === "locked" && "opacity-60",
  );
}

export const emptySlotClassName =
  "h-9 w-full rounded-md border border-dashed border-muted";
