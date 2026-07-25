import type { ReservationStatus } from "@/core/reservations/types";

export const myReservationsBaseKey = ["player", "my-reservations"] as const;

export function myReservationsQueryKey(includePast: boolean) {
  return [...myReservationsBaseKey, includePast] as const;
}

export const STATUS_BADGE_VARIANT: Record<
  ReservationStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  SCHEDULED: "secondary",
  CONFIRMED: "default",
  CANCELLED: "outline",
  COMPLETED: "secondary",
  NO_SHOW: "destructive",
};
