import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KNOCKOUT_ROUND_ORDER } from "./consts";
import type { KnockoutRoundsListProps } from "./types";

/**
 * Plain, round-grouped list of a category's knockout matches — no bracket
 * graphic, per the plan's explicit "plain tables — no bracket graphic in
 * this pass" decision. Reuses the same MatchScoreEntryDialog/WalkoverDialog
 * as the group stage (via the owner's onEnterScore/onRecordWalkover
 * callbacks, wired in CategoryWorkspace) — those dialogs don't care whether
 * a match is GROUP or KNOCKOUT. `readOnly` hides the action buttons
 * entirely for the player-facing read-only view.
 */
export function KnockoutRoundsList({
  matches,
  teamLabels,
  onEnterScore,
  onRecordWalkover,
  readOnly,
}: KnockoutRoundsListProps) {
  const t = useTranslations("KnockoutRoundsList");
  const roundLabels: Record<string, string> = {
    ROUND_OF_32: t("roundLabels.ROUND_OF_32"),
    ROUND_OF_16: t("roundLabels.ROUND_OF_16"),
    QUARTERFINAL: t("roundLabels.QUARTERFINAL"),
    SEMIFINAL: t("roundLabels.SEMIFINAL"),
    FINAL: t("roundLabels.FINAL"),
  };
  const statusLabels: Record<string, string> = {
    SCHEDULED: t("statusLabels.SCHEDULED"),
    COMPLETED: t("statusLabels.COMPLETED"),
    WALKOVER: t("statusLabels.WALKOVER"),
    CANCELLED: t("statusLabels.CANCELLED"),
  };

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("emptyState")}</p>;
  }

  const roundsPresent = KNOCKOUT_ROUND_ORDER.filter((round) =>
    matches.some((match) => match.knockoutRound === round),
  );

  return (
    <div className="flex flex-col gap-4">
      {roundsPresent.map((round) => (
        <div key={round} className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            {roundLabels[round] ?? round}
          </h4>
          <ul className="flex flex-col gap-2">
            {matches
              .filter((match) => match.knockoutRound === round)
              .map((match) => {
                const teamALabel = match.teamAId
                  ? (teamLabels[match.teamAId] ?? match.teamAId)
                  : t("tbd");
                const teamBLabel = match.teamBId
                  ? (teamLabels[match.teamBId] ?? match.teamBId)
                  : t("tbd");
                const isDecided =
                  match.status === "COMPLETED" || match.status === "WALKOVER";
                const canPlay =
                  !isDecided &&
                  Boolean(match.teamAId) &&
                  Boolean(match.teamBId);

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
                                teamLabels[match.winnerTeamId] ??
                                match.winnerTeamId,
                            })}
                          </>
                        )}
                      </span>
                    </div>
                    {!readOnly && canPlay && (
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
        </div>
      ))}
    </div>
  );
}
