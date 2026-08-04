import { ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "../../../../utils";
import type { LatestPartnerCardProps } from "./types";

export function LatestPartnerCard({ partner }: LatestPartnerCardProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/50"
        >
          <Avatar size="sm">
            {partner.avatarUrl && (
              <AvatarImage src={partner.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{partner.name}</p>
            <p className="text-[11px] text-muted-foreground">Latest partner</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {partner.avatarUrl && (
              <AvatarImage src={partner.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(partner.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{partner.name}</p>
            <p className="text-xs text-muted-foreground">
              Played together {partner.timesPlayedTogether} times
            </p>
            <p className="text-xs text-muted-foreground">
              Last played {partner.lastPlayedLabel}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3 w-full" disabled>
          View full profile
        </Button>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Coming soon
        </p>
      </PopoverContent>
    </Popover>
  );
}
