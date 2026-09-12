import type { RegisteredTeamsListProps } from "./types";

/**
 * Plain, read-only list of every active (non-withdrawn) team registered in
 * a category — presentational only, driven entirely by props (its
 * container, RegistrationPanel, owns the data fetch and the withdrawn
 * filter).
 */
export function RegisteredTeamsList({
  teams,
  isLoading,
}: RegisteredTeamsListProps) {
  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading teams…</p>;
  }

  if (teams.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No teams registered yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {teams.map((team) => (
        <li key={team.id} className="rounded-sm border p-2 text-sm">
          {team.player1DisplayName} / {team.player2DisplayName}
        </li>
      ))}
    </ul>
  );
}
