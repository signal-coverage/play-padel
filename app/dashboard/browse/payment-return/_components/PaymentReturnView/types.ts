export type ReturnReservation = {
  id: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  paymentExpiresAt?: string;
  courtName: string;
  scheduledStart: string;
};

// "failed" is a normal business outcome (the payment genuinely didn't go
// through, or the slot hold expired) — "error" is OUR OWN
// `/api/player/reservations` call itself breaking, which tells the player
// nothing about whether their payment actually succeeded. Kept distinct so
// the UI never tells a player their booking failed when the real problem
// is this app's own backend (see hooks.ts, PaymentReturnView.tsx).
export type PaymentReturnState = "processing" | "success" | "failed" | "error";
