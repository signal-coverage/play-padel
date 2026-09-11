import type { AvailabilityEntry } from "@/core/courts/types";
import type { CourtFormValues, CourtRecord } from "../../types";

export type CourtFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined => create mode; a court => edit mode. */
  court?: CourtRecord | null;
  /**
   * `photoFile` is set when the user picked a photo before the court
   * existed yet (create mode) — PhotoField can't upload it immediately
   * without a courtId, so it stages the raw file here for the parent to
   * upload right after the court is created. `availability` is always sent
   * — details and the weekly schedule now save together as one action.
   */
  onSubmit: (
    values: CourtFormValues,
    photoFile: File | null | undefined,
    availability: AvailabilityEntry[],
  ) => Promise<void>;
  isSubmitting: boolean;
  /** Which step the modal opens on: 0 = Details (default), 1 = Attributes,
   * 2 = Pricing, 3 = Availability. Both the table's pencil and clock icons
   * open this same modal, just starting on a different step. */
  initialStep?: 0 | 1 | 2 | 3;
};
