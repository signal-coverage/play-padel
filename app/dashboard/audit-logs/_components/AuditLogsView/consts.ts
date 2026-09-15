export const AUDIT_LOGS_PAGE_SIZE = 20;

// Also doubles as the messages/*.json "AuditLogsFilters" namespace's
// "entities.<value>" key for each option's translated label (see
// AuditLogsFilters.tsx) — the raw filter value sent to the API stays exactly
// this PascalCase entity name either way.
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

// Every AuditAction value (e.g. "reservation.created") is itself a dotted
// next-intl key path — this list drives AuditLogsFilters' action dropdown,
// and ./utils.ts's getActionLabel resolves each one against the
// messages/*.json "AuditActionLabels" namespace (a real nested object
// shaped exactly like these dotted segments), passing in its own caller's
// useTranslations('AuditActionLabels') result — same factory-parameter
// pattern as CourtsView/utils.ts's surfaceLabel.
export const AUDIT_ACTION_VALUES = [
  "reservation.created",
  "reservation.cancelled",
  "reservation.completed",
  "reservation.no_show",
  "court.created",
  "court.updated",
  "court.deactivated",
  "court.closure_created",
  "court.closure_cancelled",
  "club.created",
  "club.updated",
  "club.approved",
  "club.rejected",
  "user.created",
  "user.updated",
  "user.anonymized",
  "user.impersonated",
  "user.role_changed",
  "payment.confirmed",
  "payment.refunded",
  "waitlist.notified",
  "tournament.created",
  "tournament.updated",
  "tournament.published",
  "tournament.cancelled",
  "tournament_team.registered",
  "tournament_team.withdrawn",
  "tournament_groups.set_manually",
  "tournament_groups.generated_automatically",
  "tournament_groups.locked",
  "tournament_match.score_entered",
  "tournament_match.walkover_recorded",
  "tournament_knockout.generated",
] as const;
