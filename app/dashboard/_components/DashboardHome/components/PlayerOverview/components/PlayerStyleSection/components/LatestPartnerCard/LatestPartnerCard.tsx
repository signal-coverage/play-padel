import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getPreferredSideLabel } from "@/core/users/consts";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "../../../../utils";
import type { LatestPartnerCardProps } from "./types";

export function LatestPartnerCard({ partner }: LatestPartnerCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/40 p-3 text-left transition-colors hover:bg-muted/70"
        >
          <Avatar size="lg">
            {partner.avatarUrl && (
              <AvatarImage src={partner.avatarUrl} alt={partner.name} />
            )}
            <AvatarFallback className="bg-primary/15 font-bold text-primary">
              {getInitials(partner.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{partner.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {getPadelCategoryLabel(partner.padelCategory)} •{" "}
              {getPreferredSideLabel(partner.preferredSide)}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard
          player={{
            displayName: partner.name,
            avatarUrl: partner.avatarUrl,
            padelCategory: partner.padelCategory,
            preferredSide: partner.preferredSide,
            dominantHand: partner.dominantHand,
            email: partner.email,
            phone: partner.phone,
            individualWinRate: partner.individualWinRate,
            individualMatchesPlayed: partner.individualMatchesPlayed,
            coupleWinRate: partner.coupleWinRate,
            coupleMatchesPlayed: partner.timesPlayedTogether,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
