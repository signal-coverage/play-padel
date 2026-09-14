// Play order — matches the KnockoutRound enum's own declared order (see
// prisma/schema.prisma and core/tournaments/services/standings.service.ts's
// KNOCKOUT_ROUND_ORDER). Not user-facing copy — the round/status display
// labels themselves live in the "KnockoutRoundsList" messages namespace and
// are resolved in the component via useTranslations, since this plain consts
// file can't call useTranslations() itself.
export const KNOCKOUT_ROUND_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTERFINAL",
  "SEMIFINAL",
  "FINAL",
] as const;
