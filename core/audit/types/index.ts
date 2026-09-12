export type AuditAction =
  | "reservation.created"
  | "reservation.cancelled"
  | "reservation.completed"
  | "reservation.no_show"
  | "court.created"
  | "court.updated"
  | "court.deactivated"
  | "court.closure_created"
  | "court.closure_cancelled"
  | "club.created"
  | "club.updated"
  | "club.approved"
  | "club.rejected"
  | "user.created"
  | "user.updated"
  | "user.anonymized"
  | "user.impersonated"
  // Reserved for a future "promote player to admin" feature — no caller
  // uses this yet (see UserProfile.isAdmin in prisma/schema.prisma).
  | "user.role_changed"
  | "payment.confirmed"
  | "payment.refunded"
  | "waitlist.notified"
  | "tournament.created"
  | "tournament.updated"
  | "tournament.published"
  | "tournament.cancelled"
  | "tournament_team.registered"
  | "tournament_team.withdrawn"
  // Slice 2 ("Owner group + scoring tools") additions below.
  | "tournament_groups.set_manually"
  | "tournament_groups.generated_automatically"
  | "tournament_groups.locked"
  | "tournament_match.score_entered"
  | "tournament_match.walkover_recorded"
  // Slice 3 ("Knockout + standings") addition below.
  | "tournament_knockout.generated";

export interface AuditLog {
  id: string;
  clubId: string | null;
  userId: string;
  userDisplayName: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  timestamp: Date;
}

export interface AuditFilters {
  entity?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}
