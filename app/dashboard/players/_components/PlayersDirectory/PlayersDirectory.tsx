"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Trash2, UserRoundCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-medium">{player.displayName}</span>
              {/* The signed-in user's own row in this directory — GET
                  /api/players is a global player directory, not scoped to
                  the caller, so this is the only client-side way to spot
                  "that's me" among the list. Shown regardless of admin
                  status: this isn't the admin-only Role column, just a
                  personal marker for whoever's actually logged in. */}
              {player.id === user?.id && (
                // Accent, not the neutral outline every other badge in
                // this table uses (Role/Category) — this calls out "that's
                // you", not status info, so it should stand out rather
                // than blend in.
                <Badge className="shrink-0 border-transparent bg-accent text-accent-foreground">
                  You
                </Badge>
              )}
            </span>
          </button>
        ),
      },
      ...STATIC_PLAYER_COLUMNS,
      ...(isAdmin
        ? [
            {
              // Only meaningful to an admin viewer — a regular player never
              // gets `isAdmin` back from GET /api/players at all (see that
              // route's own comment), so this column only ever exists
              // inside this same isAdmin-gated block.
              key: "role",
              header: "Role",
              cell: (player: PlayerListItem) => (
                <Badge variant={player.isAdmin ? "default" : "outline"}>
                  {player.isAdmin ? "Admin" : "Player"}
                </Badge>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              className: "text-right",
              cell: (player: PlayerListItem) => {
                // The server rejects both of these for your OWN row the
                // same way it rejects impersonating another admin — POST
                // /api/admin/impersonate ("You cannot impersonate
                // yourself.") and DELETE /api/admin/players/[userId]
                // ("You cannot delete your own account.") each check this
                // before anything else. Disabled here too so an admin
                // never has to click through to discover either, rather
                // than as a real security boundary of its own.
                const isSelf = player.id === user?.id;
                const impersonateDisabled =
                  isSelf ||
                  player.isAdmin ||
                  (impersonatePlayer.isPending &&
                    impersonatePlayer.variables?.userId === player.id);
                return (
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
                        {/* A disabled native <button> never fires pointer
                            or focus events at all (not just a CSS thing —
                            browsers withhold them entirely), so
                            TooltipTrigger's own hover/focus listeners would
                            never fire if attached to the Button directly
                            whenever isSelf disables it, leaving its "why"
                            permanently invisible. Wrapping it in a plain,
                            never-disabled span gives Radix something that
                            DOES receive those events — the button's own
                            pointer-events: none (see disabled:pointer-events-none
                            in button.tsx) lets hover on its area pass
                            through to this wrapper anyway. tabIndex only
                            when actually disabled: when enabled, the
                            Button itself is already a real tab stop, so an
                            unconditional tabIndex here would add a
                            redundant one right before it. */}
                        <span
                          tabIndex={isSelf ? 0 : undefined}
                          className="inline-flex"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${player.displayName}`}
                            disabled={isSelf}
                            onClick={() => setDeletingPlayer(player)}
                          >
                            <Trash2 />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSelf
                          ? "You can't delete your own account"
                          : "Delete player"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Same disabled-button/tooltip wrapper as Delete
                            above — this one can also end up disabled by
                            player.isAdmin, not just isSelf. */}
                        <span
                          tabIndex={impersonateDisabled ? 0 : undefined}
                          className="inline-flex"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Impersonate ${player.displayName}`}
                            disabled={impersonateDisabled}
                            onClick={() =>
                              impersonatePlayer.mutate({ userId: player.id })
                            }
                          >
                            <UserRoundCog />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSelf
                          ? "You can't impersonate yourself"
                          : player.isAdmin
                            ? "Can't impersonate another admin"
                            : "Sign in as this player"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [isAdmin, impersonatePlayer, user?.id],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4">
      {/* flex-col by default so the filter bar (already flex-col
          sm:flex-row internally) gets the whole row's width on mobile
          instead of being squeezed into a narrow column next to the Export
          button — same sm: breakpoint PlayersFilterBar's own fields switch
          at, so both stack/unstack together. */}
      <div
        data-testid="players-toolbar"
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
      >
        <PlayersFilterBar
          query={query}
          onQueryChange={setQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
        />

        {isAdmin && (
          <Button variant="outline" size="sm" asChild className="self-start">
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
          // main (DashboardShell.tsx) is overflow-y-auto (whole-page scroll)
          // below md, not md:overflow-hidden — so the h-full/flex-1 chain
          // this table normally stretches against never gets a definite
          // height there, and it collapses to its own content's height
          // instead. min-h-[60svh] doesn't depend on that chain (it's sized
          // off the viewport), giving the table real height — and its own
          // internal overflow-auto (see DataTable.tsx) then scrolls that
          // fixed-height box instead of only the outer page. md:min-h-0
          // restores the exact previous desktop sizing untouched. Trailing
          // breathing room below the (mobile-only) overflowing table lives
          // in the sibling spacer div right after this component, not a
          // margin/padding here — see that div's own comment for why.
          className="min-h-[60svh] flex-1 md:min-h-0"
          columns={columns}
          rows={visiblePlayers}
          rowKey={(player) => player.id}
          isLoading={isLoading}
          loadingLabel="Loading players…"
          emptyState={<StatusBox>No players match your filters.</StatusBox>}
        />
      )}

      {/* Real spacer box (height, not margin/padding) below the table,
          mobile only. PlayersDirectory's own wrapper above has min-h-0 and a
          fixed computed height (from its PlayersPage parent's h-full flex
          shrink) — that's exactly what lets the taller table overflow it and
          reach useful height at all (see the DataTable className comment).
          But a fixed-height, overflow-visible flex container's rendered
          scrollHeight (as seen by <main>, the real mobile scrollport) does
          NOT include a descendant's trailing margin/padding past that
          overflow — a well-known browser quirk. An actual block box with its
          own height doesn't have that problem: it's real layout content, so
          it reliably extends <main>'s scrollable area and keeps the table
          from sitting flush against the fixed MobileBottomNav once scrolled
          to the end. */}
      <div className="h-8 shrink-0 md:hidden" aria-hidden="true" />

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
