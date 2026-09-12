"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchInput } from "@/components/SearchInput";
import { getInitials } from "@/lib/utils/initials";
import { cn } from "@/lib/utils/utils";
import { usePlayerCandidates } from "./hooks";
import { filterPlayerCandidates } from "./utils";
import type { PlayerPickerProps } from "./types";

/**
 * Shared candidate-search primitive extracted from the original
 * BookingConfirmDialog PartnerPicker. Owns the search box, candidate list,
 * and selection logic for both:
 * - multi-select (max > 1): PartnerPicker's "Playing with" co-player
 *   tagging, capped at MAX_RESERVATION_PARTNERS.
 * - single-select (max === 1): tournament partner registration, where
 *   picking a new candidate replaces the current selection outright.
 *
 * Callers own any surrounding header/label/count UI — this component
 * renders only the search input and the list itself.
 */
export function PlayerPicker({
  selectedIds,
  onChange,
  excludeUserId,
  max,
}: PlayerPickerProps) {
  const [query, setQuery] = useState("");
  const { data: players, isLoading } = usePlayerCandidates();

  const candidates = filterPlayerCandidates(
    players ?? [],
    query,
    excludeUserId,
  );
  const atLimit = max > 1 && selectedIds.length >= max;

  function toggle(id: string) {
    const selected = selectedIds.includes(id);
    if (max === 1) {
      onChange(selected ? [] : [id]);
      return;
    }
    if (selected) {
      onChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else if (!atLimit) {
      onChange([...selectedIds, id]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search players..."
      />

      <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
        {isLoading && (
          <p className="p-2 text-xs text-muted-foreground">Loading players…</p>
        )}
        {!isLoading && candidates.length === 0 && (
          <p className="p-2 text-xs text-muted-foreground">No players found.</p>
        )}
        {candidates.map((player) => {
          const selected = selectedIds.includes(player.id);
          const disabled = !selected && atLimit;
          return (
            <button
              key={player.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => toggle(player.id)}
              className={cn(
                "flex items-center gap-2 rounded-sm border p-2 text-left text-sm transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Avatar size="sm">
                {player.avatarUrl && (
                  <AvatarImage
                    src={player.avatarUrl}
                    alt={player.displayName}
                  />
                )}
                <AvatarFallback>
                  {getInitials(player.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{player.displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
