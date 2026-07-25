"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMyReservations, useCancelReservation } from "./hooks";
import { ReservationRow } from "./components/ReservationRow";
import { CancelConfirmDialog } from "./components/CancelConfirmDialog";
import type { CancelTarget } from "./types";

export function MyReservations() {
  const [includePast, setIncludePast] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);

  const { data: reservations, isLoading } = useMyReservations(includePast);
  const cancelReservation = useCancelReservation();

  async function handleConfirmCancel() {
    if (!cancelTarget) return;
    try {
      await cancelReservation.mutateAsync(cancelTarget.id);
      toast.success("Reservation cancelled.");
      setCancelTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not cancel this reservation.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            My Reservations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {includePast
              ? "All your reservations, including past and cancelled ones."
              : "Your upcoming reservations."}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIncludePast((v) => !v)}
        >
          {includePast ? "Show upcoming only" : "Show past reservations"}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !reservations || reservations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {includePast
            ? "You have no reservations yet."
            : "You have no upcoming reservations. Go browse courts to book one."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              onCancel={() =>
                setCancelTarget({
                  id: reservation.id,
                  courtName: reservation.courtName,
                  scheduledStart: reservation.scheduledStart,
                })
              }
            />
          ))}
        </div>
      )}

      <CancelConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        target={cancelTarget}
        isSubmitting={cancelReservation.isPending}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
