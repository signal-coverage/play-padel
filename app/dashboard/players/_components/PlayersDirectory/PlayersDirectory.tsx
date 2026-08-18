"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { getInitials } from "@/app/dashboard/_components/DashboardHome/components/PlayerOverview/utils";
import { usePlayers } from "./hooks";
import { STATIC_PLAYER_COLUMNS } from "./consts";
import { filterPlayers, sortPlayers } from "./utils";
import { PlayersFilterBar } from "./components/PlayersFilterBar";
import type { DataTableColumn } from "@/components/DataTable";
import type { PlayerFilters, PlayerListItem, PlayerSort } from "./types";

const DEFAULT_FILTERS: PlayerFilters = {
  category: "all",
  preferredSide: "all",
  dominantHand: "all",
};

const DEFAULT_SORT: PlayerSort = { field: "name", direction: "asc" };

export function PlayersDirectory() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlayerFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<PlayerSort>(DEFAULT_SORT);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerListItem | null>(
    null,
  );

  const { data: players, isLoading, isError } = usePlayers();

  const visiblePlayers = useMemo(() => {
    const filtered = filterPlayers(players ?? [], query, filters);
    return sortPlayers(filtered, sort);
  }, [players, query, filters, sort]);

  const columns: DataTableColumn<PlayerListItem>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Player",
        cell: (player) => (
          <button
            type="button"
            onClick={() => setSelectedPlayer(player)}
            className="flex items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Avatar>
              {player.avatarUrl && (
                <AvatarImage src={player.avatarUrl} alt="" />
              )}
              <AvatarFallback>{getInitials(player.displayName)}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">{player.displayName}</span>
          </button>
        ),
      },
      ...STATIC_PLAYER_COLUMNS,
    ],
    [],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <PlayersFilterBar
        query={query}
        onQueryChange={setQuery}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
      />

      {isError ? (
        <StatusBox>Could not load players. Try again later.</StatusBox>
      ) : (
        <DataTable
          className="min-h-0 flex-1"
          columns={columns}
          rows={visiblePlayers}
          rowKey={(player) => player.id}
          isLoading={isLoading}
          loadingLabel="Loading players…"
          emptyState={<StatusBox>No players match your filters.</StatusBox>}
        />
      )}

      <Dialog
        open={selectedPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPlayer(null);
        }}
      >
        <DialogContent>
          {selectedPlayer && <PlayerProfileCard player={selectedPlayer} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
