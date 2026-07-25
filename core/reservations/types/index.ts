export type ReservationStatus =
  "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

export interface Reservation {
  id: string;
  clubId: string;
  userId: string;
  userName: string;
  courtId: string;
  courtName: string;
  status: ReservationStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateReservationInput {
  userId: string;
  courtId: string;
  scheduledStart: string;
  scheduledEnd: string;
  notes?: string;
}

export interface UpdateReservationInput {
  userId?: string;
  courtId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  notes?: string;
}

export interface ReservationFilters {
  date?: Date;
  dateFrom?: string; // ISO date string "YYYY-MM-DD"
  dateTo?: string; // ISO date string "YYYY-MM-DD"
  courtId?: string;
  status?: ReservationStatus;
  userId?: string;
}
