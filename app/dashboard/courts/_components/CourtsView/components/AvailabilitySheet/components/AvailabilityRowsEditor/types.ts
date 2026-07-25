import type { CourtAvailability } from "@/core/courts/types";
import type { AvailabilityDayRow } from "../../../../types";

export type AvailabilityRowsEditorProps = {
  initialAvailability: CourtAvailability[];
  onSave: (rows: AvailabilityDayRow[]) => void;
  isSaving: boolean;
};
