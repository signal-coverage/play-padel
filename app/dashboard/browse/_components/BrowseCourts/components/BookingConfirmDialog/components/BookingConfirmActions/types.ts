import type { ReservationPaymentMethod } from "@/core/reservations/types";
import type { BookingPaymentState } from "../../types";

export type BookingConfirmActionsProps = {
  paymentState: BookingPaymentState;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  selectedMethod: ReservationPaymentMethod | null;
  /** See BookingConfirmDialogProps.confirmedTransferPending. */
  confirmedTransferPending: boolean;
};
