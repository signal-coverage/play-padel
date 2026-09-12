import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StandingsTableProps } from "./types";

/** Plain standings table — Team / Wins / Set Diff / Game Diff. No bracket
 * graphic, per the plan. Rows arrive pre-sorted by standingsCalculator's own
 * tie-break order. */
export function StandingsTable({ rows, teamLabels }: StandingsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No standings yet — matches haven&apos;t been played.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team</TableHead>
          <TableHead className="text-right">Wins</TableHead>
          <TableHead className="text-right">Set Diff</TableHead>
          <TableHead className="text-right">Game Diff</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.teamId}>
            <TableCell>{teamLabels[row.teamId] ?? row.teamId}</TableCell>
            <TableCell className="text-right">{row.wins}</TableCell>
            <TableCell className="text-right">
              {row.setsWon - row.setsLost}
            </TableCell>
            <TableCell className="text-right">
              {row.gamesWon - row.gamesLost}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
