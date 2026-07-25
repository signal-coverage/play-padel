import type { CourtFormValues, CourtRecord } from "../../types";

export type CourtFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined => create mode; a court => edit mode. */
  court?: CourtRecord | null;
  onSubmit: (values: CourtFormValues) => Promise<void>;
  isSubmitting: boolean;
};
