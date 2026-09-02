export interface Court {
  id: string;
  clubId: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  photoUrl?: string;
  slotDurationMinutes: number;
  reservationFee?: number;
  courtPrice?: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface CourtAvailability {
  id: string;
  courtId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  createdAt: Date;
}

export interface CreateCourtInput {
  name: string;
  surface?: string;
  indoor?: boolean;
  color?: string;
  photoUrl?: string;
  slotDurationMinutes?: number;
  reservationFee?: number;
  courtPrice?: number;
  // Omitted/empty means "use the club's own default" — see createCourt's use
  // of resolveDefaultCourtAvailability.
  availability?: AvailabilityEntry[];
}

export interface UpdateCourtInput {
  name?: string;
  surface?: string;
  indoor?: boolean;
  color?: string;
  photoUrl?: string;
  slotDurationMinutes?: number;
  reservationFee?: number;
  courtPrice?: number;
  active?: boolean;
}

export interface AvailabilityEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CourtClosure {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdAt: Date;
  createdBy?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
}

export interface CreateClosureInput {
  startsAt: string;
  endsAt: string;
  reason: string;
}

export type SlotStatus = "free" | "locked" | "closed";

export interface Slot {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
  closureReason?: string;
  /** Only meaningful when status is "locked" — true if the CURRENT player has an active (WAITING) waitlist entry for this exact slot. Undefined/false for a free or closed slot, or a locked slot the current player hasn't joined the waitlist for. */
  waitlisted?: boolean;
}
