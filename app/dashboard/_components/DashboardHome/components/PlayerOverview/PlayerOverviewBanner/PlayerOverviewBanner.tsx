"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/utils";
import { getInitials } from "../utils";
import { usePlayerOverviewData } from "../hooks";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import { BannerPreview } from "./components/BannerPreview";
import type { PlayerOverviewBannerProps } from "./types";

export function PlayerOverviewBanner({ className }: PlayerOverviewBannerProps) {
  const [open, setOpen] = useState(false);
  const { partner } = usePlayerOverviewData();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center rounded-2xl border border-border bg-card p-3",
          className,
        )}
      >
        <BannerPreview partnerInitials={getInitials(partner.name)} />
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Player Overview</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <PlayerOverviewContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
