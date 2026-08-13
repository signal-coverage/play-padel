"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { usePlayers } from "./hooks";
import { PlayerCard } from "./components/PlayerCard";

export function PlayersDirectory() {
  const [query, setQuery] = useState("");
  const { data: players, isLoading, isError } = usePlayers();

  const normalizedQuery = query.trim().toLowerCase();
  const matches = (players ?? []).filter((player) =>
    player.displayName.toLowerCase().includes(normalizedQuery),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players by name..."
          className="pl-8"
        />
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading players...</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">
          Could not load players. Try again later.
        </p>
      )}
      {!isLoading && !isError && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No players match &ldquo;{query}&rdquo;.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {matches.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  );
}
