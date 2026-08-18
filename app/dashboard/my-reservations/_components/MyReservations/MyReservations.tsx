"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGuardedDialogClose } from "@/hooks/use-guarded-dialog-close";
import { useMyReservations, useCancelReservation } from "./hooks";
import { ReservationRow } from "./components/ReservationRow";
import { CancelConfirmDialog } from "./components/CancelConfirmDialog";
import { LOADING_SKELETON_ROW_COUNT } from "./consts";
import type { CancelTarget } from "./types";

export function MyReservations() {
  const [includePast, setIncludePast] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CancelTarget | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const { data: reservations, isLoading } = useMyReservations(includePast);
  const cancelReservation = useCancelReservation();
  const handleDialogClose = useGuardedDialogClose(
    cancelReservation.isPending,
    () => setCancelTarget(null),
  );

  // Single persistent live region: stays mounted across loading/loaded/empty
  // and only its text changes, so screen readers reliably announce the
  // transition instead of relying on a status node that mounts after the
  // fact (see the loading/empty content below, which stays as the
  // visual-only presentation).
  const statusMessage = isLoading
    ? "Loading your reservations…"
    : !reservations || reservations.length === 0
      ? includePast
        ? "You have no reservations yet."
        : "You have no upcoming reservations."
      : `${reservations.length} reservation${reservations.length === 1 ? "" : "s"} loaded.`;

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
    <div className="flex flex-col gap-6 lg:h-full">
      <span role="status" className="sr-only">
        {statusMessage}
      </span>
      <div className="flex shrink-0 items-center justify-between flex-wrap gap-3">
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
          aria-pressed={includePast}
          onClick={() => setIncludePast((v) => !v)}
        >
          {includePast ? "Show upcoming only" : "Show past reservations"}
        </Button>
      </div>

      <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading"
              aria-hidden="true"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
              {Array.from({ length: LOADING_SKELETON_ROW_COUNT }).map(
                (_, index) => (
                  <Card key={index}>
                    <CardContent className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-8 w-16 rounded-sm" />
                      </div>
                    </CardContent>
                  </Card>
                ),
              )}
            </motion.div>
          ) : !reservations || reservations.length === 0 ? (
            <motion.p
              key="empty"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm text-muted-foreground"
            >
              {includePast
                ? "You have no reservations yet."
                : "You have no upcoming reservations. Go browse courts to book one."}
            </motion.p>
          ) : (
            <motion.div
              key="list"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col gap-3"
            >
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <CancelConfirmDialog
        open={!!cancelTarget}
        onOpenChange={handleDialogClose}
        target={cancelTarget}
        isSubmitting={cancelReservation.isPending}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
