import type { DominantHand, PreferredSide } from "@/core/users/types";

export type MatchResult = "W" | "L";

export type PlayerStyle = {
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
};

export type PartnerSummary = {
  id: string;
  name: string;
  avatarUrl: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
  // Match/win-rate stats — this app has no Tournament/Match model yet (see
  // PlayerProfileCard's PlayerProfileData, which this type otherwise
  // mirrors), so a real partner never has these. Optional rather than
  // removed so a future match-history feature can populate them without
  // another type change.
  individualWinRate?: number;
  individualMatchesPlayed?: number;
  // Couple-matches-played is timesPlayedTogether above — no separate field.
  coupleWinRate?: number;
};

export type PerformanceSummary = {
  tournamentsWon: number;
  tournamentsPlayed: number;
  latestTournamentName: string;
  latestResults: MatchResult[];
};
