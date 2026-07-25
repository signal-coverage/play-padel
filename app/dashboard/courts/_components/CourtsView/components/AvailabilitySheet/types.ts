import type { CourtRecord } from "../../types";

export type AvailabilitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: CourtRecord | null;
};
