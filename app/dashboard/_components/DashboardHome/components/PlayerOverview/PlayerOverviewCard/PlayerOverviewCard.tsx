import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import { cn } from "@/lib/utils/utils";
import { PlayerOverviewContent } from "../PlayerOverviewContent";
import type { PlayerOverviewCardProps } from "./types";

export function PlayerOverviewCard({ className }: PlayerOverviewCardProps) {
  return (
    <DashboardBentoCard
      title="Player Overview"
      animationDelay="180ms"
      className={cn(
        "flex h-full w-70 shrink-0 flex-col gap-4 overflow-hidden",
        className,
      )}
      contentClassName="flex-1 overflow-y-auto"
    >
      <PlayerOverviewContent />
    </DashboardBentoCard>
  );
}
