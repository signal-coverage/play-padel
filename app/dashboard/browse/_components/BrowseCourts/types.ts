import type { Slot } from "@/components/CourtAvailabilityGrid";
import type { Club } from "@/core/clubs/types";

export type ClubBrowseSummary = Club & {
  courtCount: number;
  hasAvailabilityToday: boolean;
};

export type BookSlotInput = {
  courtId: string;
  scheduledStart: string;
  scheduledEnd: string;
};

export type SelectedSlot = {
  courtId: string;
  courtName: string;
  /** Undefined means "not set"; 0 means genuinely free — kept distinct from unset. */
  price?: number;
  slot: Slot;
};

export type RawSlot = {
  start: string;
  end: string;
  status: "free" | "locked" | "closed";
  reservationId?: string;
  closureReason?: string;
};

export type RawCourt = {
  id: string;
  name: string;
  reservationFee?: number;
  surface?: string;
  color?: string;
  indoor?: boolean;
  photoUrl?: string;
  courtPrice?: number;
  slotDurationMinutes?: number;
  slots: RawSlot[];
};
