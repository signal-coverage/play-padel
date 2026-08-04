import { cn } from "@/lib/utils/utils";

import type { SlotStatus } from "../../types";

export function getSlotClassName(status: SlotStatus, interactive: boolean) {
  return cn(
    "flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors",
    status === "free"
      ? "border-primary/30 bg-primary/10 text-primary"
      : "border-transparent bg-muted text-muted-foreground",
    interactive &&
      "cursor-pointer hover:bg-primary/20 active:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    // Solid de-emphasis instead of `opacity-60`: opacity blends both the
    // background and text toward whatever sits behind the cell, which
    // measured ~2.6:1 contrast (fails AA 4.5:1) depending on the page
    // backdrop. `text-muted-foreground/90` blends only the glyph color
    // against the still-fully-opaque `bg-muted` background, which is a
    // fixed, known pair: computes to ~5.0:1 (light) / ~5.6:1 (dark),
    // clearing AA in both themes while still reading as de-emphasized.
    !interactive && status === "locked" && "text-muted-foreground/90",
  );
}

export const emptySlotClassName =
  "h-9 w-full rounded-md border border-dashed border-muted";
