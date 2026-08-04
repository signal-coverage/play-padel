import { Trophy } from "lucide-react";
import { StatValue } from "@/components/StatValue";
import type { TournamentRecordProps } from "./types";

export function TournamentRecord({ won, played }: TournamentRecordProps) {
  return (
    <div className="flex items-center gap-2">
      <Trophy className="size-4 shrink-0 text-primary" />
      <StatValue
        variant="stacked"
        label="Tournaments"
        value={`${won}/${played}`}
      />
    </div>
  );
}
