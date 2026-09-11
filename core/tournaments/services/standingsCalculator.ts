// Pure, framework-free logic — see the plan's standings tie-break order:
// match wins -> set differential -> game differential -> head-to-head (only
// when exactly 2 teams remain tied) -> team id (deterministic fallback).

export interface StandingsTeamInput {
  id: string;
}

export interface StandingsMatchInput {
  teamAId: string;
  teamBId: string;
  status: "COMPLETED" | "WALKOVER";
  winnerTeamId: string;
  setsWonA?: number;
  setsWonB?: number;
  gamesWonA?: number;
  gamesWonB?: number;
}

export interface StandingRow {
  teamId: string;
  wins: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
}

function setDiff(row: StandingRow): number {
  return row.setsWon - row.setsLost;
}

function gameDiff(row: StandingRow): number {
  return row.gamesWon - row.gamesLost;
}

function isFullyTied(a: StandingRow, b: StandingRow): boolean {
  return (
    a.wins === b.wins &&
    setDiff(a) === setDiff(b) &&
    gameDiff(a) === gameDiff(b)
  );
}

/**
 * Builds one StandingRow per team from a group's resolved matches
 * (COMPLETED/WALKOVER only — callers should already have filtered out
 * SCHEDULED/CANCELLED rows, though this function tolerates whatever it's
 * given). A match against a team not present in `teams` still contributes to
 * that team's own tally (useful for computing one team's record without
 * needing its opponents' rows too); only rows for `teams` are ever output.
 */
export function computeStandingsFromMatches(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
): StandingRow[] {
  const rowsById = new Map<string, StandingRow>();
  for (const team of teams) {
    rowsById.set(team.id, {
      teamId: team.id,
      wins: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
    });
  }

  for (const match of matches) {
    const rowA = rowsById.get(match.teamAId);
    const rowB = rowsById.get(match.teamBId);
    const hasSetStats =
      match.setsWonA !== undefined && match.setsWonB !== undefined;
    const hasGameStats =
      match.gamesWonA !== undefined && match.gamesWonB !== undefined;

    if (rowA) {
      if (match.winnerTeamId === match.teamAId) rowA.wins++;
      if (hasSetStats) {
        rowA.setsWon += match.setsWonA!;
        rowA.setsLost += match.setsWonB!;
      }
      if (hasGameStats) {
        rowA.gamesWon += match.gamesWonA!;
        rowA.gamesLost += match.gamesWonB!;
      }
    }

    if (rowB) {
      if (match.winnerTeamId === match.teamBId) rowB.wins++;
      if (hasSetStats) {
        rowB.setsWon += match.setsWonB!;
        rowB.setsLost += match.setsWonA!;
      }
      if (hasGameStats) {
        rowB.gamesWon += match.gamesWonB!;
        rowB.gamesLost += match.gamesWonA!;
      }
    }
  }

  const rows = Array.from(rowsById.values());

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (setDiff(b) !== setDiff(a)) return setDiff(b) - setDiff(a);
    if (gameDiff(b) !== gameDiff(a)) return gameDiff(b) - gameDiff(a);
    return a.teamId.localeCompare(b.teamId);
  });

  // Head-to-head tie-break, applied only to a group of exactly 2 teams tied
  // on every metric above. A 3+ way tie skips straight to the id fallback
  // already applied by the sort above (per the plan's explicit scoping of
  // head-to-head to "exactly 2 teams").
  let i = 0;
  while (i < rows.length) {
    let j = i + 1;
    while (j < rows.length && isFullyTied(rows[i], rows[j])) {
      j++;
    }

    if (j - i === 2) {
      const [teamX, teamY] = [rows[i], rows[i + 1]];
      const headToHead = matches.find(
        (m) =>
          (m.teamAId === teamX.teamId && m.teamBId === teamY.teamId) ||
          (m.teamAId === teamY.teamId && m.teamBId === teamX.teamId),
      );
      if (headToHead && headToHead.winnerTeamId === teamY.teamId) {
        rows[i] = teamY;
        rows[i + 1] = teamX;
      }
    }

    i = j;
  }

  return rows;
}
