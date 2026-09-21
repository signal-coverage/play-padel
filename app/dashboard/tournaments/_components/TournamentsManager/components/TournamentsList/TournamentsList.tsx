"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCreateTournament, usePublishTournament } from "../../hooks";
import { CreateTournamentSheet } from "../CreateTournamentSheet";
import { TournamentRow } from "./components/TournamentRow";
import type { TournamentsListProps } from "./types";

export function TournamentsList({
  tournaments,
  selectedTournamentId,
  onSelect,
  clubId,
}: TournamentsListProps) {
  const t = useTranslations("TournamentsList");
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const createTournament = useCreateTournament(clubId);
  const publishTournament = usePublishTournament(clubId);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="sm"
        className="w-fit gap-1.5 self-end"
        onClick={() => setIsCreateSheetOpen(true)}
      >
        <Plus className="size-4" />
        {t("createTournament")}
      </Button>

      {tournaments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyState")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tournaments.map((tournament) => (
            <li key={tournament.id}>
              <TournamentRow
                tournament={tournament}
                isSelected={tournament.id === selectedTournamentId}
                onSelect={onSelect}
                onPublish={(tournamentId) =>
                  publishTournament.mutate(tournamentId)
                }
                isPublishing={
                  publishTournament.isPending &&
                  publishTournament.variables === tournament.id
                }
              />
            </li>
          ))}
        </ul>
      )}

      <CreateTournamentSheet
        open={isCreateSheetOpen}
        onOpenChange={setIsCreateSheetOpen}
        onSubmit={(input) => createTournament.mutateAsync(input).then(() => {})}
        isSubmitting={createTournament.isPending}
      />
    </div>
  );
}
