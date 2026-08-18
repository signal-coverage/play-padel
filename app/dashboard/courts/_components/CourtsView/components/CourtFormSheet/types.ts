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
   * upload right after the court is created.
   */
  onSubmit: (values: CourtFormValues, photoFile?: File | null) => Promise<void>;
  isSubmitting: boolean;
};
