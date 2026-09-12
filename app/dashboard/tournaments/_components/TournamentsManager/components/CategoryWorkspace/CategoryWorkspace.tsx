"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { isGroupStageComplete } from "@/core/tournaments/services/groupStageStatus";
import {
  useAllGroupMatches,
  useCategoryGroups,
  useCategoryTeams,
  useEnterKnockoutMatchScore,
  useEnterMatchScore,
  useGenerateKnockoutBracket,
  useGroupMatches,
  useGroupStandings,
  useKnockoutMatches,
  useLockGroups,
  useRecordKnockoutWalkover,
  useRecordWalkover,
  useSetGroups,
} from "../../hooks";
import { GroupBuilder } from "../GroupBuilder";
import { GroupMatchesList } from "../GroupMatchesList";
import { KnockoutRoundsList } from "../KnockoutRoundsList";
import { StandingsTable } from "../StandingsTable";
import { MatchScoreEntryDialog } from "../MatchScoreEntryDialog";
import { WalkoverDialog } from "../WalkoverDialog";
import type { GroupMatch } from "../../types";
import type { CategoryWorkspaceProps } from "./types";

const LOCKED_OR_LATER_STATUSES = new Set([
  "GROUPS_LOCKED",
  "KNOCKOUT",
  "COMPLETED",
  "CANCELLED",
]);

const KNOCKOUT_OR_LATER_STATUSES = new Set(["KNOCKOUT", "COMPLETED"]);

/**
 * Everything an owner needs to run one category's group stage: build/
 * generate groups, lock them, pick a group to view, enter scores, and record
 * walkovers. Sits below TournamentsManager's tournament/category selection.
 */
export function CategoryWorkspace({
  tournamentId,
  category,
}: CategoryWorkspaceProps) {
  const { data: teams = [] } = useCategoryTeams(tournamentId, category.id);
  const { data: groups = [] } = useCategoryGroups(tournamentId, category.id);
  const setGroups = useSetGroups(tournamentId, category.id);
  const lockGroups = useLockGroups(tournamentId, category.id);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null;

  const { data: matches = [] } = useGroupMatches(
    tournamentId,
    category.id,
    activeGroupId,
  );
  const { data: standings = [] } = useGroupStandings(
    tournamentId,
    category.id,
    activeGroupId,
  );
  const enterMatchScore = useEnterMatchScore(
    tournamentId,
    category.id,
    activeGroupId ?? "",
  );
  const recordWalkover = useRecordWalkover(
    tournamentId,
    category.id,
    activeGroupId ?? "",
  );

  const [scoreDialogMatch, setScoreDialogMatch] = useState<GroupMatch | null>(
    null,
  );
  const [walkoverDialogMatch, setWalkoverDialogMatch] =
    useState<GroupMatch | null>(null);

  const teamLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const team of teams) {
      labels[team.id] =
        `${team.player1DisplayName} / ${team.player2DisplayName}`;
    }
    return labels;
  }, [teams]);

  const isLocked = LOCKED_OR_LATER_STATUSES.has(category.status);
  const hasKnockoutStarted = KNOCKOUT_OR_LATER_STATUSES.has(category.status);

  // Group-stage-complete predicate (isGroupStageComplete, same pure
  // function the service layer's own precondition reuses) gates the
  // "Generate Knockout Bracket" button — fetched the same way
  // StandingsTable/GroupMatchesList already fetch their data, just across
  // every group at once instead of only the selected one.
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);
  const allGroupMatches = useAllGroupMatches(
    tournamentId,
    category.id,
    groupIds,
  );
  const groupStageComplete =
    groups.length > 0 &&
    isGroupStageComplete(
      allGroupMatches.map((match) => ({ status: match.status })),
    );
  const canGenerateKnockout =
    category.status === "GROUPS_LOCKED" && groupStageComplete;

  const { data: knockoutMatches = [] } = useKnockoutMatches(
    tournamentId,
    category.id,
  );
  const generateKnockoutBracket = useGenerateKnockoutBracket(
    tournamentId,
    category.id,
  );
  const enterKnockoutMatchScore = useEnterKnockoutMatchScore(
    tournamentId,
    category.id,
  );
  const recordKnockoutWalkover = useRecordKnockoutWalkover(
    tournamentId,
    category.id,
  );

  const [knockoutScoreDialogMatch, setKnockoutScoreDialogMatch] =
    useState<GroupMatch | null>(null);
  const [knockoutWalkoverDialogMatch, setKnockoutWalkoverDialogMatch] =
    useState<GroupMatch | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <GroupBuilder
        teams={teams}
        groups={groups}
        groupCount={category.groupCount}
        isLocked={isLocked}
        onGenerateAutomatic={() => setGroups.mutate({ mode: "auto" })}
        isGeneratingAutomatic={setGroups.isPending}
        onSaveManual={(manualGroups) =>
          setGroups.mutate({ mode: "manual", groups: manualGroups })
        }
        isSavingManual={setGroups.isPending}
        onLock={() => lockGroups.mutate()}
        isLocking={lockGroups.isPending}
      />

      {groups.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <Button
                key={group.id}
                type="button"
                size="sm"
                variant={group.id === activeGroupId ? "default" : "outline"}
                onClick={() => setSelectedGroupId(group.id)}
              >
                {group.name}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold">Matches</h3>
              <GroupMatchesList
                matches={matches}
                teamLabels={teamLabels}
                onEnterScore={setScoreDialogMatch}
                onRecordWalkover={setWalkoverDialogMatch}
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold">Standings</h3>
              <StandingsTable rows={standings} teamLabels={teamLabels} />
            </div>
          </div>
        </div>
      )}

      {category.status === "GROUPS_LOCKED" && (
        <div>
          <Button
            type="button"
            onClick={() => generateKnockoutBracket.mutate()}
            disabled={!canGenerateKnockout || generateKnockoutBracket.isPending}
          >
            {generateKnockoutBracket.isPending
              ? "Generating…"
              : "Generate Knockout Bracket"}
          </Button>
          {!groupStageComplete && (
            <p className="mt-1 text-sm text-muted-foreground">
              Every group match must be decided before the bracket can be
              generated.
            </p>
          )}
        </div>
      )}

      {hasKnockoutStarted && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Knockout bracket</h3>
          <KnockoutRoundsList
            matches={knockoutMatches}
            teamLabels={teamLabels}
            onEnterScore={setKnockoutScoreDialogMatch}
            onRecordWalkover={setKnockoutWalkoverDialogMatch}
          />
        </div>
      )}

      <MatchScoreEntryDialog
        open={scoreDialogMatch !== null}
        onOpenChange={(open) => !open && setScoreDialogMatch(null)}
        matchLabel={
          scoreDialogMatch
            ? `${teamLabels[scoreDialogMatch.teamAId ?? ""] ?? ""} vs ${teamLabels[scoreDialogMatch.teamBId ?? ""] ?? ""}`
            : ""
        }
        isSubmitting={enterMatchScore.isPending}
        onSubmit={async (sets) => {
          if (!scoreDialogMatch) return;
          await enterMatchScore.mutateAsync({
            matchId: scoreDialogMatch.id,
            input: { sets },
          });
          setScoreDialogMatch(null);
        }}
      />

      {walkoverDialogMatch && (
        <WalkoverDialog
          open={walkoverDialogMatch !== null}
          onOpenChange={(open) => !open && setWalkoverDialogMatch(null)}
          teamAId={walkoverDialogMatch.teamAId ?? ""}
          teamALabel={teamLabels[walkoverDialogMatch.teamAId ?? ""] ?? "Team A"}
          teamBId={walkoverDialogMatch.teamBId ?? ""}
          teamBLabel={teamLabels[walkoverDialogMatch.teamBId ?? ""] ?? "Team B"}
          isSubmitting={recordWalkover.isPending}
          onConfirm={async (winningTeamId) => {
            await recordWalkover.mutateAsync({
              matchId: walkoverDialogMatch.id,
              input: { winningTeamId },
            });
            setWalkoverDialogMatch(null);
          }}
        />
      )}

      <MatchScoreEntryDialog
        open={knockoutScoreDialogMatch !== null}
        onOpenChange={(open) => !open && setKnockoutScoreDialogMatch(null)}
        matchLabel={
          knockoutScoreDialogMatch
            ? `${teamLabels[knockoutScoreDialogMatch.teamAId ?? ""] ?? ""} vs ${teamLabels[knockoutScoreDialogMatch.teamBId ?? ""] ?? ""}`
            : ""
        }
        isSubmitting={enterKnockoutMatchScore.isPending}
        onSubmit={async (sets) => {
          if (!knockoutScoreDialogMatch) return;
          await enterKnockoutMatchScore.mutateAsync({
            matchId: knockoutScoreDialogMatch.id,
            input: { sets },
          });
          setKnockoutScoreDialogMatch(null);
        }}
      />

      {knockoutWalkoverDialogMatch && (
        <WalkoverDialog
          open={knockoutWalkoverDialogMatch !== null}
          onOpenChange={(open) => !open && setKnockoutWalkoverDialogMatch(null)}
          teamAId={knockoutWalkoverDialogMatch.teamAId ?? ""}
          teamALabel={
            teamLabels[knockoutWalkoverDialogMatch.teamAId ?? ""] ?? "Team A"
          }
          teamBId={knockoutWalkoverDialogMatch.teamBId ?? ""}
          teamBLabel={
            teamLabels[knockoutWalkoverDialogMatch.teamBId ?? ""] ?? "Team B"
          }
          isSubmitting={recordKnockoutWalkover.isPending}
          onConfirm={async (winningTeamId) => {
            await recordKnockoutWalkover.mutateAsync({
              matchId: knockoutWalkoverDialogMatch.id,
              input: { winningTeamId },
            });
            setKnockoutWalkoverDialogMatch(null);
          }}
        />
      )}
    </div>
  );
}
