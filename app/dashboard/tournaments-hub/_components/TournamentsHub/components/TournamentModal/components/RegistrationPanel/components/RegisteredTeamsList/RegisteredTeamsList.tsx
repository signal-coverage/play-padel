import { useTranslations } from "next-intl";
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
  const t = useTranslations("RegisteredTeamsList");

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{t("loading")}</p>;
  }

  if (teams.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("emptyState")}</p>;
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
