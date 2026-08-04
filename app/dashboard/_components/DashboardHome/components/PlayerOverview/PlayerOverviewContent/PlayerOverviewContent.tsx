import { Separator } from "@/components/ui/separator";
import { PlayerStyleSection } from "../components/PlayerStyleSection";
import { PerformanceSummarySection } from "../components/PerformanceSummarySection";
import { usePlayerOverviewData } from "../hooks";

export function PlayerOverviewContent() {
  const { playerStyle, partner, performance } = usePlayerOverviewData();

  return (
    <div className="flex flex-col gap-4">
      <PlayerStyleSection playerStyle={playerStyle} partner={partner} />
      <Separator />
      <PerformanceSummarySection performance={performance} />
    </div>
  );
}
