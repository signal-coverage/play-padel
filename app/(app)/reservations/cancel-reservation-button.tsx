"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  cancelReservationAction,
  type ReservationActionState,
} from "./actions";

const initialState: ReservationActionState = {};

/** Owner-only cancel button (spec: "Cancellation"). */
export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    cancelReservationAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="reservationId" value={reservationId} />
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Cancelling..." : "Cancel"}
      </Button>
      {state.error ? (
        <p className="text-xs text-[#F24236]">{state.error}</p>
      ) : null}
    </form>
  );
}
