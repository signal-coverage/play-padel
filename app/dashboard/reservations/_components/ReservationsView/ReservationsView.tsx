"use client";

import { useMemo, useState } from "react";
import { CourtAvailabilityGrid, type Slot } from "@/components/CourtAvailabilityGrid";
import { ReservationsTable } from "./components/ReservationsTable";
import { SlotDetailsDialog } from "./components/SlotDetailsDialog";
import {
  useActiveCourts,
  useCourtSlotsQueries,
  useDayReservations,
  useReservationAction,
} from "./hooks";
import { buildCourtColumns, buildReservationMap } from "./utils";
import type { ReservationActionKind } from "./types";

export function ReservationsView() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | null
  >(null);

  const { data: courts = [], isLoading: courtsLoading } = useActiveCourts();
  const courtIds = useMemo(() => courts.map((court) => court.id), [courts]);
  const slotQueries = useCourtSlotsQueries(courtIds, selectedDate);
  const { data: reservations = [], isLoading: reservationsLoading } =
    useDayReservations(selectedDate);

  const reservationAction = useReservationAction();

  const courtColumns = useMemo(
    () => buildCourtColumns(courts, slotQueries),
    [courts, slotQueries],
  );
  const reservationMap = useMemo(
    () => buildReservationMap(reservations),
    [reservations],
  );

  const slotsLoading = slotQueries.some((query) => query.isLoading);
  const selectedReservation = selectedReservationId
    ? reservationMap.get(selectedReservationId) ?? null
    : null;

  function handleSlotClick(_courtId: string, slot: Slot) {
    if (slot.status !== "locked" || !slot.reservationId) return;
    setSelectedReservationId(slot.reservationId);
    setDialogOpen(true);
  }

  function handleAction(reservationId: string, action: ReservationActionKind) {
    reservationAction.mutate(
      { reservationId, action },
      {
        onSuccess: () => {
          if (reservationId === selectedReservationId) {
            setDialogOpen(false);
          }
        },
      },
    );
  }

  const pendingReservationId =
    reservationAction.isPending
      ? (reservationAction.variables?.reservationId ?? null)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reservations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View court availability and manage the day&apos;s bookings.
        </p>
      </div>

      <CourtAvailabilityGrid
        date={selectedDate}
        courts={courtColumns}
        variant="owner"
        onSlotClick={handleSlotClick}
        onDateChange={setSelectedDate}
        isLoading={courtsLoading || slotsLoading}
      />

      <ReservationsTable
        reservations={reservations}
        isLoading={reservationsLoading}
        onAction={handleAction}
        pendingReservationId={pendingReservationId}
      />

      <SlotDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        reservation={selectedReservation}
        onAction={handleAction}
        isPending={reservationAction.isPending}
      />
    </div>
  );
}
