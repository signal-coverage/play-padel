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
  // Optional co-player tagging (see prisma/schema.prisma's
  // ReservationPartner) — omitted entirely (not just empty) when no
  // partners are selected, so a booking made with zero tags is byte-for-byte
  // identical to the pre-existing request shape.
  partnerIds?: string[];
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
  waitlisted?: boolean;
};

export type JoinWaitlistInput = {
  courtId: string;
  scheduledStart: string;
  scheduledEnd: string;
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
