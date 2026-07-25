import type { Slot } from "@/components/CourtAvailabilityGrid";

export type BookSlotInput = {
  courtId: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export type SelectedSlot = {
  courtId: string;
  courtName: string;
  slot: Slot;
};

export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked";
  reservationId?: string;
};

export type RawCourt = {
  id: string;
  name: string;
  slots: RawSlot[];
};
