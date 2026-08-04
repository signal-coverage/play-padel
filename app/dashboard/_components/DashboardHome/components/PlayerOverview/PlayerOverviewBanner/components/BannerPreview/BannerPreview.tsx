import { ChevronRight, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { BannerPreviewProps } from "./types";

export function BannerPreview({ partnerInitials }: BannerPreviewProps) {
  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <LayoutGrid className="size-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium">Your player overview</p>
        <p className="truncate text-xs text-muted-foreground">
          Preferred side, partner &amp; stats
        </p>
      </div>
      <Avatar size="sm">
        <AvatarFallback>{partnerInitials}</AvatarFallback>
      </Avatar>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </div>
  );
}
