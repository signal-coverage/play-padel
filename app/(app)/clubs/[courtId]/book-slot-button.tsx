"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  createReservationAction,
  type ReservationActionState,
} from "@/app/(app)/reservations/actions";

const initialState: ReservationActionState = {};

/**
 * Book CTA for a single available slot (design: Accent `#DFFD36`). Each
 * instance owns its own `useActionState` so a conflict on one slot (spec:
 * "Concurrent booking on a free slot") only surfaces an error next to that
 * slot, not the whole grid.
 */
export function BookSlotButton({
  courtId,
  startsAt,
  endsAt,
}: {
  courtId: string;
  startsAt: string;
  endsAt: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createReservationAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="courtId" value={courtId} />
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="endsAt" value={endsAt} />
      <Button
        type="submit"
        disabled={isPending}
        className="bg-[#DFFD36] text-black hover:bg-[#DFFD36]/85"
      >
        {isPending ? "Booking..." : "Book"}
      </Button>
      {state.error ? (
        <p className="text-xs text-[#F24236]">{state.error}</p>
      ) : null}
    </form>
  );
}
