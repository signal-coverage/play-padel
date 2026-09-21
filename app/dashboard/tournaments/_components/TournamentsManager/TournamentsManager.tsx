"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useManagedTournaments, useTournamentDetail } from "./hooks";
import { TournamentsList } from "./components/TournamentsList";
import { CategoryWorkspace } from "./components/CategoryWorkspace";
import type { TournamentsManagerProps } from "./types";

/**
 * Owner tournament management page: create/publish tournaments (see
 * TournamentsList) and, once one is selected, build its groups and enter
 * scores per category (see CategoryWorkspace).
 *
 * `clubId` is optional and only ever passed by AdminTournamentsView, which
 * renders this exact same component scoped to whichever club an admin has
 * selected — every hook call below routes through the admin-gated
 * /api/admin/clubs/[clubId]/tournaments/** endpoints instead of the
 * owner-only ones once it's set (see ./hooks.ts). Omitted (the owner's own
 * page), this is byte-identical to the original owner-only behavior.
 */
export function TournamentsManager({ clubId }: TournamentsManagerProps = {}) {
  const t = useTranslations("TournamentsManager");
  const { data: tournaments = [], isLoading } = useManagedTournaments(clubId);
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  const { data: tournamentDetail } = useTournamentDetail(
    selectedTournamentId,
    clubId,
  );

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
          clubId={clubId}
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
              clubId={clubId}
            />
          )}
        </div>
      )}
    </div>
  );
}
