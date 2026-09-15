"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useManagedTournaments, useTournamentDetail } from "./hooks";
import { TournamentsList } from "./components/TournamentsList";
import { CategoryWorkspace } from "./components/CategoryWorkspace";

/**
 * Minimal owner tournament management page for this slice ("Owner group +
 * scoring tools"). Deliberately no "create tournament" Sheet — see
 * TournamentsList's own comment; this view focuses on the new group-
 * building and score-entry tools the slice actually asked for, using
 * whatever tournaments/categories slice 1's API already exposes.
 */
export function TournamentsManager() {
  const t = useTranslations("TournamentsManager");
  const { data: tournaments = [], isLoading } = useManagedTournaments();
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const { data: tournamentDetail } = useTournamentDetail(selectedTournamentId);

  function selectTournament(tournamentId: string) {
    setSelectedTournamentId(tournamentId);
    setSelectedCategoryId(null);
  }

  const selectedCategory = tournamentDetail?.categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          {t("loadingTournaments")}
        </p>
      ) : (
        <TournamentsList
          tournaments={tournaments}
          selectedTournamentId={selectedTournamentId}
          onSelect={selectTournament}
        />
      )}

      {tournamentDetail && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {tournamentDetail.categories.map((category) => (
              <Button
                key={category.id}
                type="button"
                size="sm"
                variant={
                  category.id === selectedCategoryId ? "default" : "outline"
                }
                onClick={() => setSelectedCategoryId(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {selectedCategory && (
            <CategoryWorkspace
              tournamentId={tournamentDetail.id}
              category={selectedCategory}
            />
          )}
        </div>
      )}
    </div>
  );
}
