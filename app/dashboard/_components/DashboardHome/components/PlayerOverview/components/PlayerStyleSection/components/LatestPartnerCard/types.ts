import type { PartnerSummary } from "../../../../types";

export type LatestPartnerCardProps = {
  // null when the player has no partner history yet — renders an empty
  // state instead of the clickable card.
  partner: PartnerSummary | null;
};
