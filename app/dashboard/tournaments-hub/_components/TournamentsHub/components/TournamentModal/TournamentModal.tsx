"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { GroupsStandingsView } from "@/app/dashboard/tournaments/_components/GroupsStandingsView";
import { CategoryTabs } from "./components/CategoryTabs";
import { RegistrationPanel } from "./components/RegistrationPanel";
import { useTournamentDetail } from "./hooks";
import type { TournamentModalProps } from "./types";

/**
 * Category picker (if 2+) -> registration panel or read-only standings,
 * per the plan's "click -> modal" flow. A category still REGISTRATION_OPEN
 * shows RegistrationPanel (own status + partner picker + registered-teams
 * roster); once it moves past that status, this swaps to the same
 * read-only GroupsStandingsView the owner side already built (no bracket
 * graphic — plain tables, per the plan).
 */
export function TournamentModal({
  tournamentId,
  onOpenChange,
}: TournamentModalProps) {
  const { user } = useAuth();
  const { data: tournament, isLoading } = useTournamentDetail(tournamentId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  // Tracks which tournament the current selectedCategoryId belongs to, so a
  // freshly-loaded (or newly reopened) tournament defaults to its first
  // category — "adjusting state when a prop changes" during render, per
  // React's own recipe, rather than a setState-in-effect (React Compiler
  // flags that as a cascading-render risk). Bails out immediately once
  // synced, so this never fights the user's own category clicks.
  const [syncedTournamentId, setSyncedTournamentId] = useState<string | null>(
    null,
  );
  if (tournament && tournament.id !== syncedTournamentId) {
    setSyncedTournamentId(tournament.id);
    setSelectedCategoryId(tournament.categories[0]?.id ?? null);
  }

  const selectedCategory = tournament?.categories.find(
    (category) => category.id === selectedCategoryId,
  );

  return (
    <Dialog open={Boolean(tournamentId)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {tournament && (
          <>
            <DialogHeader>
              <DialogTitle>{tournament.name}</DialogTitle>
              <DialogDescription>{tournament.clubName}</DialogDescription>
            </DialogHeader>

            {tournament.categories.length >= 2 && (
              <CategoryTabs
                categories={tournament.categories}
                selectedCategoryId={selectedCategoryId ?? ""}
                onSelect={setSelectedCategoryId}
              />
            )}

            {selectedCategory &&
              user?.id &&
              (selectedCategory.status === "REGISTRATION_OPEN" ? (
                <RegistrationPanel
                  tournamentId={tournament.id}
                  categoryId={selectedCategory.id}
                  viewerId={user.id}
                />
              ) : (
                <GroupsStandingsView
                  tournamentId={tournament.id}
                  categoryId={selectedCategory.id}
                />
              ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
