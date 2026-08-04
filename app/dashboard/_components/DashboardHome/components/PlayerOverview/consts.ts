import type {
  DominantHand,
  PartnerSummary,
  PerformanceSummary,
  PlayerStyle,
} from "./types";

export const DOMINANT_HAND_LABELS: Record<DominantHand, string> = {
  right: "Right-handed",
  left: "Left-handed",
};

// Placeholder data — this app has no backend concept yet for preferred
// side, doubles partners, or tournaments/matches (confirmed against
// prisma/schema.prisma: Reservation tracks a single booking user only,
// no Tournament/Match model exists). See
// docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md.
// Replace with real data once those features exist — the shape here is
// deliberately close to what a real API response would look like.

export const MOCK_PLAYER_STYLE: PlayerStyle = {
  preferredSide: "forehand",
  dominantHand: "right",
};

export const MOCK_LATEST_PARTNER: PartnerSummary = {
  name: "Sofía Martínez",
  avatarUrl: null,
  timesPlayedTogether: 5,
  lastPlayedLabel: "3 days ago",
};

export const MOCK_PERFORMANCE: PerformanceSummary = {
  tournamentsWon: 5,
  tournamentsPlayed: 12,
  preferredPosition: "forehand",
  latestTournamentName: "Summer Open 2026",
  latestResults: ["W", "W", "L", "W"],
};
