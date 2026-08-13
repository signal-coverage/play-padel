import type { DominantHand, PreferredSide } from "@/core/users/types";

export type PlayerProfileData = {
  displayName: string;
  avatarUrl: string | null;
  padelCategory: number | null;
  preferredSide: PreferredSide | null;
  dominantHand: DominantHand | null;
  email: string;
  phone: string | null;
  // Match/win-rate stats — undefined for real directory players (no match
  // data exists yet, see docs/superpowers/specs/2026-08-05-player-profile-directory-design.md).
  // Only ever populated today via LatestPartnerCard's mocked partner data.
  individualWinRate?: number;
  individualMatchesPlayed?: number;
  coupleWinRate?: number;
  coupleMatchesPlayed?: number;
};

export type PlayerProfileCardProps = {
  player: PlayerProfileData;
};
