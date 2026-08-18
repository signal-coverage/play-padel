import type { BookingPaymentState } from "../../types";

export type BookingConfirmActionsProps = {
  paymentState: BookingPaymentState;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};
