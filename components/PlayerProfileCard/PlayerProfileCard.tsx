import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getDominantHandLabel,
  getPreferredSideLabel,
} from "@/core/users/consts";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerProfileCardProps } from "./types";

export function PlayerProfileCard({ player }: PlayerProfileCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle className="sr-only">{player.displayName}</DialogTitle>
      </DialogHeader>
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          {player.avatarUrl && (
            <AvatarImage src={player.avatarUrl} alt="" />
          )}
          <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {player.displayName}
          </p>
          <Badge variant="outline" className="mt-1">
            {getPadelCategoryLabel(player.padelCategory)}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-muted-foreground">Preferred side</p>
          <p className="font-medium">
            {getPreferredSideLabel(player.preferredSide)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Dominant hand</p>
          <p className="font-medium">
            {getDominantHandLabel(player.dominantHand)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p className="truncate font-medium">{player.email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Phone</p>
          <p className="font-medium">{player.phone ?? "Not set yet"}</p>
        </div>
      </div>
      {player.individualWinRate !== undefined && (
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
          <div>
            <p className="text-muted-foreground">Win rate</p>
            <p className="font-medium">
              {player.individualWinRate}%
              <span className="ml-1 text-muted-foreground">
                ({player.individualMatchesPlayed} matches)
              </span>
            </p>
          </div>
          {player.coupleWinRate !== undefined && (
            <div>
              <p className="text-muted-foreground">With you</p>
              <p className="font-medium">
                {player.coupleWinRate}%
                <span className="ml-1 text-muted-foreground">
                  ({player.coupleMatchesPlayed} matches)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
