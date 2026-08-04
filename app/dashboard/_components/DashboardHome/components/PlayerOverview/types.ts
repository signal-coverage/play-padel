export type PreferredSide = "forehand" | "backhand";

export type DominantHand = "right" | "left";

export type MatchResult = "W" | "L";

export type PlayerStyle = {
  preferredSide: PreferredSide;
  dominantHand: DominantHand;
};

export type PartnerSummary = {
  name: string;
  avatarUrl: string | null;
  timesPlayedTogether: number;
  lastPlayedLabel: string;
};

export type PerformanceSummary = {
  tournamentsWon: number;
  tournamentsPlayed: number;
  preferredPosition: PreferredSide;
  latestTournamentName: string;
  latestResults: MatchResult[];
};
