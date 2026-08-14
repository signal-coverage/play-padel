import type { PartnerSummary, PerformanceSummary, PlayerStyle } from "./types";

// Placeholder data — this app has no backend concept yet for doubles
// partners or tournaments/matches (confirmed against prisma/schema.prisma:
// Reservation tracks a single booking user only, no Tournament/Match model
// exists). See docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md
// and docs/superpowers/specs/2026-08-05-player-profile-directory-design.md.
// preferredSide/dominantHand are real, user-editable fields (see core/users);
// MOCK_PLAYER_STYLE only fills the sidebar in until the user sets their own.

export const MOCK_PLAYER_STYLE: PlayerStyle = {
  preferredSide: "forehand",
  dominantHand: "right",
};

export const MOCK_LATEST_PARTNER: PartnerSummary = {
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
  padelCategory: 3,
  preferredSide: "backhand",
  dominantHand: "right",
  email: "sofia.martinez@example.com",
  phone: "+54 9 11 5555-0123",
  individualWinRate: 62,
  individualMatchesPlayed: 34,
  coupleWinRate: 80,
};

export const MOCK_PERFORMANCE: PerformanceSummary = {
  tournamentsWon: 5,
  tournamentsPlayed: 12,
  latestTournamentName: "Summer Open 2026",
  latestResults: ["W", "W", "L", "W"],
};
