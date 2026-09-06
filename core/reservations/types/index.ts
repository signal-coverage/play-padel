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
  paymentExpiresAt?: Date;
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

// Booking-confirmation ticket data — proof of the reservation itself, not of
// payment (see core/billing's InvoiceReceiptData for that). Deliberately
// carries no pricing/payment fields.
export interface TicketData {
  id: string;
  clubName: string;
  courtName: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  userName: string;
  status: ReservationStatus;
}
