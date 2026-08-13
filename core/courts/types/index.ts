export interface Court {
  id: string;
  clubId: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  slotDurationMinutes: number;
  price?: number;
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
  slotDurationMinutes?: number;
  price?: number;
}

export interface UpdateCourtInput {
  name?: string;
  surface?: string;
  indoor?: boolean;
  color?: string;
  slotDurationMinutes?: number;
  price?: number;
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
}
