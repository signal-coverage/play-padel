// Translation keys (under the "DayLabels" namespace), not literal display
// text — AvailabilityRowsEditor/QuickSetupPanel look up the actual label via
// useTranslations. Two other call sites (CourtsView/OperatingHoursSettingsCard
// utils.ts) only use this for its length while iterating all 7 days, so the
// key format doesn't affect them.
export const DAY_LABELS: readonly string[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const DEFAULT_SLOT_DURATION_MINUTES = 90;
