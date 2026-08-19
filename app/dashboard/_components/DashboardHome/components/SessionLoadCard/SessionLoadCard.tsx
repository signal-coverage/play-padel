import { DashboardBentoCard } from "@/components/DashboardBentoCard";
import type { SystemRole } from "@/providers/auth-provider";
import { OwnerSessionLoad } from "./components/OwnerSessionLoad";
import { PlayerSessionLoad } from "./components/PlayerSessionLoad";

export function SessionLoadCard({
  role,
  className,
}: {
  role: SystemRole;
  className?: string;
}) {
  return (
    <DashboardBentoCard
      title={role === "owner" ? "Cancellation rate" : "Session load"}
      animationDelay="160ms"
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col justify-center gap-3"
    >
      {role === "owner" ? <OwnerSessionLoad /> : <PlayerSessionLoad />}
    </DashboardBentoCard>
  );
}
