import type { ReservationStatus } from "@/core/reservations/types";

export const STATUS_BADGE_VARIANT: Record<
  ReservationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "outline",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "secondary",
  NO_SHOW: "secondary",
};
