import type { Slot } from "@/components/CourtAvailabilityGrid";

export type BookingConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courtName: string;
  slot: Slot | null;
  /** Undefined means "not set"; 0 means genuinely free — kept distinct from unset. */
  price?: number;
  currency: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  // Optional co-player tagging (see prisma/schema.prisma's
  // ReservationPartner) — state lives in the parent (BrowseCourts) so it
  // survives the desktop/mobile variant swap and resets alongside
  // `selected` when the dialog closes.
  partnerIds: string[];
  onPartnerIdsChange: (ids: string[]) => void;
  // The signed-in booker's own id, threaded down to PartnerPicker so they
  // can never tag themselves.
  currentUserId?: string;
};

/**
 * The three states a booking's payment can be in, derived solely from this
 * court's price — a club-level "requires prepayment" setting no longer
 * factors in. A court priced at exactly 0 is genuinely free; any other
 * priced court must be paid online before the reservation is confirmed; an
 * unset price blocks booking rather than silently falling through as free.
 */
export type BookingPaymentState =
  | { kind: "free" }
  | { kind: "pay-now"; price: number }
  | { kind: "price-missing" };
