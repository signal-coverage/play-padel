"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/utils";
import { getInitials } from "@/lib/utils/initials";
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
          "animate-fade-up flex items-center rounded-sm bg-card p-3 shadow-card",
          className,
        )}
        style={{ animationDelay: "180ms" }}
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
