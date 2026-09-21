"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TournamentRowProps } from "./types";

/** One row in TournamentsList: select the tournament, and (only while it's
 * still a DRAFT) publish it to open registration — see TournamentsList's own
 * comment for why publishing is a separate action from creation. */
export function TournamentRow({
  tournament,
  isSelected,
  onSelect,
  onPublish,
  isPublishing,
}: TournamentRowProps) {
  const t = useTranslations("TournamentRow");

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={isSelected ? "default" : "outline"}
        className="w-full justify-between"
        onClick={() => onSelect(tournament.id)}
      >
        <span>{tournament.name}</span>
        <Badge variant="outline">{tournament.status}</Badge>
      </Button>

      {tournament.status === "DRAFT" && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={isPublishing}
          onClick={() => onPublish(tournament.id)}
        >
          {isPublishing ? t("publishing") : t("publish")}
        </Button>
      )}
    </div>
  );
}
