import type { AuditAction } from "@/core/audit/types";

export const AUDIT_LOGS_PAGE_SIZE = 20;

export const AUDIT_ENTITY_OPTIONS = [
  "Club",
  "Court",
  "CourtClosure",
  "Payment",
  "Reservation",
  "UserProfile",
  "WaitlistEntry",
] as const;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  "reservation.created": "Reservation created",
  "reservation.cancelled": "Reservation cancelled",
  "reservation.completed": "Reservation completed",
  "reservation.no_show": "Reservation no-show",
  "court.created": "Court created",
  "court.updated": "Court updated",
  "court.deactivated": "Court deactivated",
  "court.closure_created": "Court closure created",
  "court.closure_cancelled": "Court closure cancelled",
  "club.created": "Club created",
  "club.updated": "Club updated",
  "user.created": "Player joined",
  "user.updated": "Profile updated",
  "user.anonymized": "Account deleted",
  "payment.confirmed": "Payment confirmed",
  "payment.refunded": "Payment refunded",
  "waitlist.notified": "Waitlist notified",
};
