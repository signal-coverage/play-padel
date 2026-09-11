"use client";

import { useMemo } from "react";
import { GroupMatchesList } from "../TournamentsManager/components/GroupMatchesList";
import { KnockoutRoundsList } from "../TournamentsManager/components/KnockoutRoundsList";
import { StandingsTable } from "../TournamentsManager/components/StandingsTable";
import { useCategoryStandingsDetail } from "./hooks";
import type { GroupsStandingsViewProps } from "./types";

/**
 * Read-only groups/standings/knockout view for one category — shared
 * building block between the owner and player sides (see the plan's
 * GroupsStandingsView). Reuses the owner management UI's own
 * GroupMatchesList/StandingsTable/KnockoutRoundsList with `readOnly` set,
 * rather than duplicating them, per the plan's explicit "prefer extending
 * with a prop over duplicating" direction. No bracket graphic — plain
 * tables only, per the plan.
 *
 * Not wired into a reachable page yet: players can't discover tournaments
 * until slice 4's TournamentsHub/TournamentModal exist to link into this.
 * This component + its data hook (./hooks) are ready for that slice to drop
 * straight in.
 */
export function GroupsStandingsView({
  tournamentId,
  categoryId,
}: GroupsStandingsViewProps) {
  const { data, isLoading } = useCategoryStandingsDetail(
    tournamentId,
    categoryId,
  );

  const teamLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const team of data?.teams ?? []) {
      labels[team.id] =
        `${team.player1DisplayName} / ${team.player2DisplayName}`;
    }
    return labels;
  }, [data?.teams]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">No data available.</p>;
  }

  const knockoutMatches = data.knockoutRounds.flatMap((round) => round.matches);

  return (
    <div className="flex flex-col gap-6">
      {data.groups.map(({ group, standings, matches }) => (
        <div key={group.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">{group.name}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium">Matches</h4>
              <GroupMatchesList
                matches={matches}
                teamLabels={teamLabels}
                readOnly
              />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Standings</h4>
              <StandingsTable rows={standings} teamLabels={teamLabels} />
            </div>
          </div>
        </div>
      ))}

      {knockoutMatches.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Knockout bracket</h3>
          <KnockoutRoundsList
            matches={knockoutMatches}
            teamLabels={teamLabels}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
