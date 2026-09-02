import { DAY_LABELS } from "@/core/courts/consts";
import type { OperatingHoursRow } from "./types";

export const DEFAULT_OPERATING_HOURS_START = "09:00";
export const DEFAULT_OPERATING_HOURS_END = "21:00";

// Seeded once as this field's RHF default value (see OnboardingWizard's
// useForm defaultValues) — all 7 days closed, with a sensible placeholder
// window so toggling a day on doesn't start from an empty range. Same
// defaults QuickSetupPanel itself uses.
export const DEFAULT_OPERATING_HOURS_ROWS: OperatingHoursRow[] = DAY_LABELS.map(
  (_, dayOfWeek) => ({
    dayOfWeek,
    active: false,
    startTime: DEFAULT_OPERATING_HOURS_START,
    endTime: DEFAULT_OPERATING_HOURS_END,
  }),
);
