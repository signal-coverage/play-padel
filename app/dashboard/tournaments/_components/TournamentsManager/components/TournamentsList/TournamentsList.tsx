import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TournamentsListProps } from "./types";

/**
 * Bare-bones tournament list — this slice ("Owner group + scoring tools")
 * intentionally does not build a "create tournament" Sheet; slice 1 already
 * shipped the create/publish API, and a fuller creation UI is left as a fast
 * -follow so this slice's time budget could focus on the new group/scoring
 * UI it actually asked for. See the final report for this judgment call.
 */
export function TournamentsList({
  tournaments,
  selectedTournamentId,
  onSelect,
}: TournamentsListProps) {
  if (tournaments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No tournaments yet. Creating a tournament isn&apos;t built in this view
        yet — use the API directly, or wait for the create-tournament UI
        fast-follow.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tournaments.map((tournament) => (
        <li key={tournament.id}>
          <Button
            type="button"
            variant={
              tournament.id === selectedTournamentId ? "default" : "outline"
            }
            className="w-full justify-between"
            onClick={() => onSelect(tournament.id)}
          >
            <span>{tournament.name}</span>
            <Badge variant="outline">{tournament.status}</Badge>
          </Button>
        </li>
      ))}
    </ul>
  );
}
