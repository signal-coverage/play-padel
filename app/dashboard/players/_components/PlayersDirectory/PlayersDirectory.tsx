"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Trash2, UserRoundCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTable } from "@/components/DataTable";
import { StatusBox } from "@/components/StatusBox";
import { PlayerProfileCard } from "@/components/PlayerProfileCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { getInitials } from "@/lib/utils/initials";
import { useAuth } from "@/hooks/use-auth";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import {
  usePlayers,
  useDeletePlayer,
  useUpdatePlayer,
  useImpersonatePlayer,
} from "./hooks";
import { STATIC_PLAYER_COLUMNS } from "./consts";
import { filterPlayers, sortPlayers } from "./utils";
import { PlayersFilterBar } from "./components/PlayersFilterBar";
import { PlayerEditSheet } from "./components/PlayerEditSheet";
import type { DataTableColumn } from "@/components/DataTable";
import type {
  PlayerFilters,
  PlayerListItem,
  PlayerPatchInput,
  PlayerSort,
} from "./types";

const DEFAULT_FILTERS: PlayerFilters = {
  category: "all",
  preferredSide: "all",
  dominantHand: "all",
};

const DEFAULT_SORT: PlayerSort = { field: "name", direction: "asc" };

export function PlayersDirectory() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<PlayerFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<PlayerSort>(DEFAULT_SORT);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerListItem | null>(
    null,
  );
  const [editingPlayer, setEditingPlayer] = useState<PlayerListItem | null>(
    null,
  );
  const [deletingPlayer, setDeletingPlayer] = useState<PlayerListItem | null>(
    null,
  );

  const { data: players, isLoading, isError } = usePlayers();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  const impersonatePlayer = useImpersonatePlayer();

  const handleDeleteDialogClose = useGuardedDialogClose(
    deletePlayer.isPending,
    () => setDeletingPlayer(null),
  );

  const visiblePlayers = useMemo(() => {
    const filtered = filterPlayers(players ?? [], query, filters);
    return sortPlayers(filtered, sort);
  }, [players, query, filters, sort]);

  async function handleEditSubmit(input: PlayerPatchInput) {
    if (!editingPlayer) return;
    await updatePlayer.mutateAsync({ userId: editingPlayer.id, input });
  }

  async function confirmDelete() {
    if (!deletingPlayer) return;
    try {
      await deletePlayer.mutateAsync({ userId: deletingPlayer.id });
      setDeletingPlayer(null);
    } catch {
      // useDeletePlayer's onError already surfaces a toast; keep the dialog
      // open so the admin can retry or cancel.
    }
  }

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
      ...(isAdmin
        ? [
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right",
              cell: (player: PlayerListItem) => (
                <div className="flex justify-end gap-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${player.displayName}`}
                        onClick={() => setEditingPlayer(player)}
                      >
                        <Pencil />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Edit player</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${player.displayName}`}
                        onClick={() => setDeletingPlayer(player)}
                      >
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete player</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Impersonate ${player.displayName}`}
                        disabled={
                          impersonatePlayer.isPending &&
                          impersonatePlayer.variables?.userId === player.id
                        }
                        onClick={() =>
                          impersonatePlayer.mutate({ userId: player.id })
                        }
                      >
                        <UserRoundCog />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Sign in as this player</TooltipContent>
                  </Tooltip>
                </div>
              ),
            },
          ]
        : []),
    ],
    [isAdmin, impersonatePlayer],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <PlayersFilterBar
          query={query}
          onQueryChange={setQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
        />

        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <a href="/api/admin/export/players" download>
              <Download size={14} strokeWidth={2.25} />
              Export CSV
            </a>
          </Button>
        )}
      </div>

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

      <PlayerEditSheet
        open={editingPlayer !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPlayer(null);
        }}
        player={editingPlayer}
        onSubmit={handleEditSubmit}
        isSubmitting={updatePlayer.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingPlayer)}
        onOpenChange={handleDeleteDialogClose}
        title="Delete player?"
        description={
          deletingPlayer
            ? `"${deletingPlayer.displayName}" will be anonymized and removed from the directory. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        isPending={deletePlayer.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
