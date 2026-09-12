import type { PartnerSummary, PlayerStyle } from "../../types";

export type PlayerStyleSectionProps = {
  playerStyle: PlayerStyle;
  // null while the player has no partner history yet (see
  // LatestPartnerCard, which renders an empty state for this case).
  partner: PartnerSummary | null;
};
