import { useTranslations } from "next-intl";
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
  const t = useTranslations("WeeklyLoadCard");
  return (
    <DashboardBentoCard
      title={role === "owner" ? t("dailyVolume") : t("weeklyLoad")}
      animationDelay="80ms"
      className={className}
      contentClassName="flex min-h-0 flex-1 flex-col justify-center gap-3"
    >
      {role === "owner" ? <OwnerWeeklyLoad /> : <PlayerWeeklyLoad />}
    </DashboardBentoCard>
  );
}
