"use client";

import { useState } from "react";
import { StatusBox } from "@/components/StatusBox";
import { TournamentModal } from "./components/TournamentModal";
import { useOpenTournaments } from "./hooks";

/**
 * Player-facing tournament discovery list — Players-Directory-style rows
 * (tournament name as title, club name as subtitle), per the plan. Clicking
 * a row opens TournamentModal for that tournament's registration/standings.
 */
export function TournamentsHub() {
  const { data: tournaments, isLoading } = useOpenTournaments();
  const [selectedTournamentId, setSelectedTournamentId] = useState<
    string | null
  >(null);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground">Loading tournaments…</p>
    );
  }

  if (!tournaments || tournaments.length === 0) {
    return (
      <StatusBox>No tournaments are open for registration right now.</StatusBox>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {tournaments.map((tournament) => (
        <button
          key={tournament.id}
          type="button"
          onClick={() => setSelectedTournamentId(tournament.id)}
          className="flex flex-col items-start gap-0.5 rounded-sm border p-3 text-left transition-colors hover:bg-muted/50"
        >
          <span className="text-sm font-medium">{tournament.name}</span>
          <span className="text-xs text-muted-foreground">
            {tournament.clubName}
          </span>
        </button>
      ))}

      <TournamentModal
        tournamentId={selectedTournamentId}
        onOpenChange={(open) => {
          if (!open) setSelectedTournamentId(null);
        }}
      />
    </div>
  );
}
