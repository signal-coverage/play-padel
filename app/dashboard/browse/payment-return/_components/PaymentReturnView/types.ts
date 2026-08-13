export type ReturnReservation = {
  id: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentExpiresAt?: string;
  courtName: string;
  scheduledStart: string;
};

export type PaymentReturnState = "processing" | "success" | "failed";
