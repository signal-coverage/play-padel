import type { BookingPaymentState } from "../../types";

export type BookingConfirmPriceTagProps = {
  paymentState: BookingPaymentState;
  currency: string;
};
