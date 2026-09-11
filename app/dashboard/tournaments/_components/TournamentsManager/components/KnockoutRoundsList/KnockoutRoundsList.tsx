import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KNOCKOUT_ROUND_LABELS,
  KNOCKOUT_ROUND_ORDER,
  KNOCKOUT_STATUS_LABELS,
} from "./consts";
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
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No knockout bracket yet — generate it once the group stage is complete.
      </p>
    );
  }

  const roundsPresent = KNOCKOUT_ROUND_ORDER.filter((round) =>
    matches.some((match) => match.knockoutRound === round),
  );

  return (
    <div className="flex flex-col gap-4">
      {roundsPresent.map((round) => (
        <div key={round} className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            {KNOCKOUT_ROUND_LABELS[round] ?? round}
          </h4>
          <ul className="flex flex-col gap-2">
            {matches
              .filter((match) => match.knockoutRound === round)
              .map((match) => {
                const teamALabel = match.teamAId
                  ? (teamLabels[match.teamAId] ?? match.teamAId)
                  : "TBD";
                const teamBLabel = match.teamBId
                  ? (teamLabels[match.teamBId] ?? match.teamBId)
                  : "TBD";
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
                        {teamALabel} vs {teamBLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Badge variant="outline">
                          {KNOCKOUT_STATUS_LABELS[match.status] ?? match.status}
                        </Badge>
                        {isDecided && match.winnerTeamId && (
                          <>
                            {" "}
                            — Winner:{" "}
                            {teamLabels[match.winnerTeamId] ??
                              match.winnerTeamId}
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
                          Enter score
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onRecordWalkover?.(match)}
                        >
                          Walkover
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
