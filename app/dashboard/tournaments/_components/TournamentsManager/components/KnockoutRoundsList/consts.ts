// Play order — matches the KnockoutRound enum's own declared order (see
// prisma/schema.prisma and core/tournaments/services/standings.service.ts's
// KNOCKOUT_ROUND_ORDER).
export const KNOCKOUT_ROUND_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
] as const;

export const KNOCKOUT_ROUND_LABELS: Record<string, string> = {
  ROUND_OF_32: "Round of 32",
  ROUND_OF_16: "Round of 16",
  QUARTERFINAL: "Quarterfinal",
  SEMIFINAL: "Semifinal",
  FINAL: "Final",
};

export const KNOCKOUT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  WALKOVER: "Walkover",
  CANCELLED: "Cancelled",
};
