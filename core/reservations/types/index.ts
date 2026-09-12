import type { DominantHand, PreferredSide } from "@/core/users/types";

export type ReservationStatus =
  "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";

// The two checkout paths a player can pick when a court requires payment.
// Distinct from core/billing's PaymentMethod ("CASH" | "CARD" | "TRANSFER" |
// "DIGITAL"), which models how an invoice was actually settled (including
// walk-in cash/card) — this one models the player's checkout CHOICE.
export type ReservationPaymentMethod = "MERCADOPAGO" | "TRANSFER";

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
  paymentMethod?: ReservationPaymentMethod;
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
  // Optional, additive (see prisma/schema.prisma's ReservationPartner):
  // other registered players (UserProfile ids) the booker is tagging as
  // co-players. Max 3, no self-tagging — validated server-side by
  // reservationPartners.service.ts's validatePartnerIds before the
  // reservation is created.
  partnerIds?: string[];
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

// Derived "Latest Partner" data for a given player (see reservationPartners
// .service.ts's getLatestPartnerForPlayer and docs: Latest Partner spec).
// Field names are shaped to drop straight into PlayerOverview's
// PartnerSummary UI type with no remapping. `name` mirrors that UI type's
// existing field name rather than this codebase's usual `displayName`,
// deliberately — this type only exists to feed that one card.
export interface LatestPartnerSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
}
