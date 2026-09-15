import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { TournamentRecord } from "./components/TournamentRecord";
import { LatestTournamentResults } from "./components/LatestTournamentResults";
import { getPreferredSideLabel } from "@/core/users/consts";
import type { PerformanceSummarySectionProps } from "./types";

export function PerformanceSummarySection({
  performance,
  preferredSide,
}: PerformanceSummarySectionProps) {
  const t = useTranslations("PerformanceSummarySection");
  const tOptions = useTranslations("UserOptionLabels");
  return (
    <div className="flex flex-col gap-3">
      <TournamentRecord
        won={performance.tournamentsWon}
        played={performance.tournamentsPlayed}
      />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("position")}</span>
        <Badge className="bg-primary text-primary-foreground [a]:hover:bg-primary/80">
          {getPreferredSideLabel(preferredSide, tOptions)}
        </Badge>
      </div>
      <LatestTournamentResults
        tournamentName={performance.latestTournamentName}
        results={performance.latestResults}
      />
    </div>
  );
}
