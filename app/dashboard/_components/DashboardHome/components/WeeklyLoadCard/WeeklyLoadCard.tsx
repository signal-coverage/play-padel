import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerWeeklyLoad } from "./components/OwnerWeeklyLoad";
import { PlayerWeeklyLoad } from "./components/PlayerWeeklyLoad";

export function WeeklyLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title={role === "owner" ? "Daily volume" : "Weekly load"}
      animationDelay="80ms"
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col justify-center gap-3"
    >
      {role === "owner" ? <OwnerWeeklyLoad /> : <PlayerWeeklyLoad />}
    </DashboardBentoCard>
  );
}
