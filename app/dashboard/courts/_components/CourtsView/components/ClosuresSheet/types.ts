import type { CourtRecord } from "../../types";

export type ClosuresSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  court: CourtRecord | null;
  courts: CourtRecord[];
};
