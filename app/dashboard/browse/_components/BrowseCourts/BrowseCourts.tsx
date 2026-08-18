"use client";

import { useEffect, useState } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";
import { track } from "@vercel/analytics";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Slot } from "@/components/CourtAvailabilityGrid";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { useIsMobile } from "@/hooks/use-mobile";
import { fireSuccessConfetti } from "@/lib/utils/confetti";
import { ClubListPanel } from "./components/ClubListPanel";
import { ClubCourtsPanel } from "./components/ClubCourtsPanel";
import { CourtSchedulePanel } from "./components/CourtSchedulePanel";
import { BookingConfirmDialog } from "./components/BookingConfirmDialog";
import { useActiveClubs, useClubAvailability, useBookSlot } from "./hooks";
import { parseAsLocalDate } from "./utils";
import type { SelectedSlot } from "./types";

export function BrowseCourts() {
  // Synced to the URL (`?club=`, `?court=`, `?date=`) so the current browse
  // selection is shareable and survives a refresh. `defaultDate` keeps a
  // stable lazy "today" for as long as the URL doesn't already specify one,
  // matching the previous `useState(() => new Date())` behavior.
  const [clubId, setClubId] = useQueryState("club", parseAsString);
  const [courtId, setCourtId] = useQueryState("court", parseAsString);
  const [defaultDate] = useState(() => new Date());
  const [date, setDate] = useQueryState(
    "date",
    parseAsLocalDate.withDefault(defaultDate),
  );
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const {
    data: clubs,
    isLoading: clubsLoading,
    isError: clubsError,
  } = useActiveClubs(date);
  const {
    data: courts,
    isLoading: availabilityLoading,
    isUpdating: availabilityUpdating,
    isError: availabilityError,
    rowCount,
  } = useClubAvailability(clubId, date);
  const bookSlot = useBookSlot();
  const handleDialogClose = useGuardedDialogClose(bookSlot.isPending, () =>
    setSelected(null),
  );

  const currentClub = clubs?.find((c) => c.id === clubId);
  const selectedCourt = (courts ?? []).find((c) => c.id === courtId) ?? null;

  // A court selected under one club shouldn't silently carry over once the
  // courts list changes (club switch, or the selected court closing/being
  // deactivated) — clear it if it's no longer in the current list.
  useEffect(() => {
    if (courtId && courts && !courts.some((c) => c.id === courtId)) {
      setCourtId(null);
    }
  }, [courts, courtId, setCourtId]);

  function handleSelectClub(id: string) {
    setClubId(id);
    setCourtId(null);
  }

  function handleBackToClubs() {
    setClubId(null);
    setCourtId(null);
  }

  function handleSlotClick(courtId: string, slot: Slot) {
    if (slot.status !== "free") return;
    // The confirm dialog's currency comes from `currentClub`, which is
    // derived from a separate, independently-loading query — on a shared
    // `?club=X&court=Y` URL the schedule panel can render clickable slots
    // before that club data resolves. Refuse to make a slot selectable
    // until we actually know the club's real currency, so the dialog never
    // silently falls back to a wrong-currency default for a real payment.
    if (!currentClub) {
      toast.error("Still loading club details, try again in a moment.");
      return;
    }
    const court = courts?.find((c) => c.id === courtId);
    if (!court) return;
    setSelected({
      courtId,
      courtName: court.name,
      price: court.reservationFee,
      slot,
    });
  }

  async function handleConfirm() {
    if (!selected) return;
    try {
      const result = (await bookSlot.mutateAsync({
        courtId: selected.courtId,
        scheduledStart: selected.slot.start.toISOString(),
        scheduledEnd: selected.slot.end.toISOString(),
      })) as { checkoutUrl?: string };

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      toast.success("Reservation confirmed.");
      track("booking_confirmed");
      if (!shouldReduceMotion) {
        fireSuccessConfetti();
      }
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not book this slot.",
      );
    }
  }

  const clubListPanel = (
    <ClubListPanel
      clubs={clubs ?? []}
      selectedClubId={clubId}
      onSelectClub={handleSelectClub}
      isLoading={clubsLoading}
      isError={clubsError}
    />
  );

  const courtsPanel = (
    <ClubCourtsPanel
      courts={courts ?? []}
      selectedClubId={clubId}
      selectedCourtId={courtId}
      onSelectCourt={setCourtId}
      isLoading={availabilityLoading}
      isUpdating={availabilityUpdating}
      isError={availabilityError}
    />
  );

  const schedulePanel = (
    <CourtSchedulePanel
      date={date}
      onDateChange={setDate}
      selectedCourt={selectedCourt}
      onSlotClick={handleSlotClick}
      isLoading={availabilityLoading}
      isUpdating={availabilityUpdating}
      isError={availabilityError}
      rowCount={rowCount}
    />
  );

  return (
    <div className="flex flex-col gap-6 lg:h-full">
      <div className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Browse Courts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a club, then a court, then a free slot to reserve.
        </p>
      </div>

      {isMobile ? (
        <div className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
          {!clubId && clubListPanel}
          {clubId && !courtId && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={handleBackToClubs}
              >
                <ArrowLeft /> Back to clubs
              </Button>
              {courtsPanel}
            </div>
          )}
          {clubId && courtId && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit"
                onClick={() => setCourtId(null)}
              >
                <ArrowLeft /> Back to courts
              </Button>
              {schedulePanel}
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4 lg:min-h-0 lg:flex-1">
          <div className="w-[20%] min-w-0">{clubListPanel}</div>
          <div className="w-[60%] min-w-0">{courtsPanel}</div>
          <div className="w-[20%] min-w-0">{schedulePanel}</div>
        </div>
      )}

      <BookingConfirmDialog
        open={!!selected}
        onOpenChange={handleDialogClose}
        courtName={selected?.courtName ?? ""}
        slot={selected?.slot ?? null}
        price={selected?.price}
        currency={currentClub?.currency ?? "USD"}
        isSubmitting={bookSlot.isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
