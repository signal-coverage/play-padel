import type { AuditAction } from "@/core/audit/types";

export const AUDIT_LOGS_PAGE_SIZE = 20;

export const AUDIT_ENTITY_OPTIONS = [
  "Club",
  "Court",
  "CourtClosure",
  "Payment",
  "Reservation",
  "Tournament",
  "TournamentCategory",
  "TournamentMatch",
  "TournamentTeam",
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
  "club.approved": "Club approved",
  "club.rejected": "Club rejected",
  "user.created": "Player joined",
  "user.updated": "Profile updated",
  "user.anonymized": "Account deleted",
  "user.impersonated": "Admin impersonated user",
  "user.role_changed": "Role changed",
  "payment.confirmed": "Payment confirmed",
  "payment.refunded": "Payment refunded",
  "waitlist.notified": "Waitlist notified",
  "tournament.created": "Tournament created",
  "tournament.updated": "Tournament updated",
  "tournament.published": "Tournament published",
  "tournament.cancelled": "Tournament cancelled",
  "tournament_team.registered": "Tournament team registered",
  "tournament_team.withdrawn": "Tournament team withdrawn",
  "tournament_groups.set_manually": "Tournament groups set manually",
  "tournament_groups.generated_automatically":
    "Tournament groups generated automatically",
  "tournament_groups.locked": "Tournament groups locked",
  "tournament_match.score_entered": "Tournament match score entered",
  "tournament_match.walkover_recorded": "Tournament match walkover recorded",
  "tournament_knockout.generated": "Tournament knockout bracket generated",
};
