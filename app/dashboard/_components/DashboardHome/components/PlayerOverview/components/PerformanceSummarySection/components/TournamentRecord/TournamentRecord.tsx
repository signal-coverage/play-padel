import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TournamentRecordProps } from "./types";

export function TournamentRecord({ won, played }: TournamentRecordProps) {
  const t = useTranslations("TournamentRecord");
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Trophy className="size-3.5 shrink-0 text-primary" />
        {t("label")}
      </span>
      <span className="font-semibold tabular-nums">
        {won}/{played}
      </span>
    </div>
  );
}
