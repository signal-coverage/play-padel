import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerRowProps } from "./types";

export function PlayerRow({ player }: PlayerRowProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
        >
          <Avatar>
            {player.avatarUrl && (
              <AvatarImage src={player.avatarUrl} alt="" />
            )}
            <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {player.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {getPadelCategoryLabel(player.padelCategory)}
            </p>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard player={player} />
      </DialogContent>
    </Dialog>
  );
}
