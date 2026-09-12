import type { PerformanceSummary, PlayerStyle } from "./types";

// "Latest Partner" and "Performance Summary" are both real data now (see
// hooks.ts's useLatestPartner/usePerformanceSummary and
// app/api/player/latest-partner, app/api/tournaments/performance-summary).
// See docs/superpowers/specs/2026-08-01-player-overview-sidebar-design.md and
// docs/superpowers/specs/2026-08-05-player-profile-directory-design.md.
// preferredSide/dominantHand are real, user-editable fields (see core/users);
// MOCK_PLAYER_STYLE only fills the sidebar in until the user sets their own.

export const MOCK_PLAYER_STYLE: PlayerStyle = {
  preferredSide: "forehand",
  dominantHand: "right",
};

// The "no tournament history yet" shape -- used both by the API's own
// computePerformanceSummaryForPlayer (a player with zero tournament teams)
// and here as usePlayerOverviewData's fallback while the real fetch is still
// loading, since PerformanceSummarySection renders `performance`
// unconditionally (no loading/null branch of its own, unlike
// LatestPartnerCard's `partner: PartnerSummary | null` pattern).
export const DEFAULT_PERFORMANCE_SUMMARY: PerformanceSummary = {
  tournamentsWon: 0,
  tournamentsPlayed: 0,
  latestTournamentName: "",
  latestResults: [],
};
