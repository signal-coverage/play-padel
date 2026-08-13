import { Separator } from "@/components/ui/separator";
import { PlayerStyleSection } from "../components/PlayerStyleSection";
import { PerformanceSummarySection } from "../components/PerformanceSummarySection";
import { usePlayerOverviewData } from "../hooks";

export function PlayerOverviewContent() {
  const { playerStyle, partner, performance } = usePlayerOverviewData();

  return (
    <div className="flex flex-col gap-6">
      <PlayerStyleSection playerStyle={playerStyle} partner={partner} />
      <Separator />
      <div className="flex flex-col gap-3">
        <p className="label-mono">Performance</p>
        <PerformanceSummarySection
          performance={performance}
          preferredSide={playerStyle.preferredSide}
        />
      </div>
    </div>
  );
}
