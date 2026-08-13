import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import { getClubCardClassName } from "./styles";
import type { ClubCardProps } from "./types";

export function ClubCard({ club, selected, onClick }: ClubCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={getClubCardClassName(selected)}
    >
      <Avatar size="lg">
        {club.logoUrl && <AvatarImage src={club.logoUrl} alt="" />}
        <AvatarFallback>{getInitials(club.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-semibold">{club.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {club.phone ?? club.timezone}
        </p>
      </div>
    </button>
  );
}
