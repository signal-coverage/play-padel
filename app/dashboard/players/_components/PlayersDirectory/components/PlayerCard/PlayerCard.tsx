import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getPadelCategoryLabel } from "@/app/dashboard/_components/DashboardHome/components/SkillOverviewCard/utils";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import type { PlayerCardProps } from "./types";

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border p-4 text-center transition-colors duration-200 outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Avatar size="lg">
            {player.avatarUrl && <AvatarImage src={player.avatarUrl} alt="" />}
            <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
          </Avatar>
          <p className="w-full truncate text-sm font-medium">
            {player.displayName}
          </p>
          <Badge variant="outline">
            {getPadelCategoryLabel(player.padelCategory)}
          </Badge>
        </button>
      </DialogTrigger>
      <DialogContent>
        <PlayerProfileCard player={player} />
      </DialogContent>
    </Dialog>
  );
}
