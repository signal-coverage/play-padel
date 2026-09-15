import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GroupMatchesListProps } from "./types";

/**
 * Plain list of a group's matches — teams, status, and (once decided) the
 * winner. Doesn't show the literal set-by-set score: no listing route in
 * this slice joins in MatchSet rows, and the group's StandingsTable already
 * surfaces the set/game differentials that matter most — flagged as a
 * deliberate scope simplification.
 */
export function GroupMatchesList({
  matches,
  teamLabels,
  onEnterScore,
  onRecordWalkover,
  readOnly,
}: GroupMatchesListProps) {
  const t = useTranslations("GroupMatchesList");
  const statusLabels: Record<string, string> = {
    SCHEDULED: t("statusLabels.SCHEDULED"),
    COMPLETED: t("statusLabels.COMPLETED"),
    WALKOVER: t("statusLabels.WALKOVER"),
    CANCELLED: t("statusLabels.CANCELLED"),
  };

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyState")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {matches.map((match) => {
        const teamALabel = match.teamAId
          ? (teamLabels[match.teamAId] ?? match.teamAId)
          : t("tbd");
        const teamBLabel = match.teamBId
          ? (teamLabels[match.teamBId] ?? match.teamBId)
          : t("tbd");
        const isDecided =
          match.status === "COMPLETED" || match.status === "WALKOVER";

        return (
          <li
            key={match.id}
            className="flex items-center justify-between gap-2 rounded-sm border p-2"
          >
            <div className="flex flex-col">
              <span className="text-sm">
                {t("matchup", { teamA: teamALabel, teamB: teamBLabel })}
              </span>
              <span className="text-xs text-muted-foreground">
                <Badge variant="outline">
                  {statusLabels[match.status] ?? match.status}
                </Badge>
                {isDecided && match.winnerTeamId && (
                  <>
                    {" "}
                    {t("winner", {
                      name:
                        teamLabels[match.winnerTeamId] ?? match.winnerTeamId,
                    })}
                  </>
                )}
              </span>
            </div>
            {!readOnly && !isDecided && match.teamAId && match.teamBId && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onEnterScore?.(match)}
                >
                  {t("enterScore")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onRecordWalkover?.(match)}
                >
                  {t("walkover")}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
