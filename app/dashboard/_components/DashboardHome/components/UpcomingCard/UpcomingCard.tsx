import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import { cn } from "@/lib/utils/utils";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerUpcoming } from "./components/OwnerUpcoming";
import { PlayerUpcoming } from "./components/PlayerUpcoming";

export function UpcomingCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title="Upcoming"
      animationDelay="380ms"
      className={cn("shrink-0 overflow-visible px-3", className)}
      contentClassName="flex flex-1 flex-col overflow-y-auto"
    >
      {role === "owner" ? <OwnerUpcoming /> : <PlayerUpcoming />}
    </DashboardBentoCard>
  );
}
