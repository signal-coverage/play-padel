import { Badge } from "@/components/ui/badge";
import { TournamentRecord } from "./components/TournamentRecord";
import { LatestTournamentResults } from "./components/LatestTournamentResults";
import type { PerformanceSummarySectionProps } from "./types";

export function PerformanceSummarySection({
  performance,
}: PerformanceSummarySectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <TournamentRecord
          won={performance.tournamentsWon}
          played={performance.tournamentsPlayed}
        />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Position</span>
          <Badge variant="outline" className="capitalize">
            {performance.preferredPosition}
          </Badge>
        </div>
      </div>
      <LatestTournamentResults
        tournamentName={performance.latestTournamentName}
        results={performance.latestResults}
      />
    </div>
  );
}
