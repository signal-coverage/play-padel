import type { DominantHand, PreferredSide } from "@/core/users/types";

export type MatchResult = "W" | "L";

export type PlayerStyle = {
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
};

export type PartnerSummary = {
  name: string;
  avatarUrl: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
  individualWinRate: number;
  individualMatchesPlayed: number;
  // Couple-matches-played is timesPlayedTogether above — no separate field.
  coupleWinRate: number;
};

export type PerformanceSummary = {
  tournamentsWon: number;
  tournamentsPlayed: number;
  latestTournamentName: string;
  latestResults: MatchResult[];
};
