export interface Court {
  id: string;
  clubId: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  slotDurationMinutes: number;
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
}

export interface UpdateCourtInput {
  name?: string;
  surface?: string;
  indoor?: boolean;
  color?: string;
  slotDurationMinutes?: number;
  active?: boolean;
}

export interface AvailabilityEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export type SlotStatus = "free" | "locked";

export interface Slot {
  start: Date;
  end: Date;
  status: SlotStatus;
  reservationId?: string;
}
