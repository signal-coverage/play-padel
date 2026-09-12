import type { ReservationPaymentMethod } from "@/core/reservations/types";

export type PaymentMethodPickerProps = {
  availableMethods: ReservationPaymentMethod[];
  selectedMethod: ReservationPaymentMethod | null;
  onSelectMethod: (method: ReservationPaymentMethod) => void;
};
