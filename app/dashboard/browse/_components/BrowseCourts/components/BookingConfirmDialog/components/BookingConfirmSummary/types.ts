import type { Slot } from "@/components/CourtAvailabilityGrid";
import type { BookingPaymentState } from "../../types";

export type BookingConfirmSummaryProps = {
  courtName: string;
  slot: Slot | null;
  paymentState: BookingPaymentState;
  currency: string;
};
