import type { PlayerListItem, PlayerPatchInput } from "../../types";

// Internal RHF form shape — every enum-like field is a plain string so Radix
// Select can drive it directly (Select requires string values and rejects an
// empty string, so unset preferredSide/dominantHand use the "unset"
// sentinel and unset padelCategory reuses onboarding's "unknown" sentinel —
// see ./consts.ts's select option lists). ./utils.ts converts this shape
// to/from the real PlayerPatchInput wire contract.
export type PlayerEditFormValues = {
  displayName: string;
  email: string;
  phone: string;
  padelCategory: string;
  preferredSide: string;
  dominantHand: string;
};

export type PlayerEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The player currently being edited; null while closed. */
  player: PlayerListItem | null;
  onSubmit: (input: PlayerPatchInput) => Promise<void>;
  isSubmitting: boolean;
};
