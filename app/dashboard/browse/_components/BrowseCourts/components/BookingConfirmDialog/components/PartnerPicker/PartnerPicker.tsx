"use client";

import { PlayerPicker } from "@/components/PlayerPicker";
import { MAX_RESERVATION_PARTNERS } from "@/core/reservations/consts";
import type { PartnerPickerProps } from "./types";

/**
 * Optional "Playing with" co-player picker for the booking confirm flow
 * (see prisma/schema.prisma's ReservationPartner). Thin wrapper around the
 * shared PlayerPicker primitive (components/PlayerPicker) — this component
 * only owns the header/count UI and the fixed multi-select cap; the
 * search box, candidate list, and selection logic live in PlayerPicker.
 * Client-side cap at MAX_RESERVATION_PARTNERS is defense in depth — the
 * real guard is server-side (reservationPartners.service.ts's
 * validatePartnerIds).
 */
export function PartnerPicker({
  selectedIds,
  onChange,
  excludeUserId,
}: PartnerPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Playing with (optional)</p>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length}/{MAX_RESERVATION_PARTNERS}
        </span>
      </div>

      <PlayerPicker
        selectedIds={selectedIds}
        onChange={onChange}
        excludeUserId={excludeUserId}
        max={MAX_RESERVATION_PARTNERS}
      />
    </div>
  );
}
