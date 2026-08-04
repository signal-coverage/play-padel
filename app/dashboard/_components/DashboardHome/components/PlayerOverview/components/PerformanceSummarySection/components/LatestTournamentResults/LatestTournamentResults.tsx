import { cn } from "@/lib/utils/utils";
import type { LatestTournamentResultsProps } from "./types";

export function LatestTournamentResults({
  tournamentName,
  results,
}: LatestTournamentResultsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="truncate text-xs text-muted-foreground">{tournamentName}</p>
      <div className="flex gap-1">
        {results.map((result, index) => (
          <span
            key={index}
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
              result === "W"
                ? "bg-success text-success-foreground"
                : "bg-destructive text-white",
            )}
          >
            {result}
          </span>
        ))}
      </div>
    </div>
  );
}
