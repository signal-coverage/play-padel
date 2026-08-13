import { Trophy } from "lucide-react";
import type { TournamentRecordProps } from "./types";

export function TournamentRecord({ won, played }: TournamentRecordProps) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Trophy className="size-3.5 shrink-0 text-primary" />
        Tournament record
      </span>
      <span className="font-semibold tabular-nums">
        {won}/{played}
      </span>
    </div>
  );
}
