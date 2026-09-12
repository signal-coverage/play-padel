export type AvailabilityDayRow = {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
};

export type AvailabilityRowsEditorProps = {
  rows: AvailabilityDayRow[];
  onChange: (rows: AvailabilityDayRow[]) => void;
  /**
   * "stacked" (default): QuickSetupPanel above the day list, single column
   * — used by OperatingHoursSettingsCard's own page-scrolled card.
   * "split": QuickSetupPanel and the day list sit in two columns separated
   * by a vertical Separator, with ONLY the day-list column scrolling — used
   * by CourtFormSheet's fixed-height Availability step, so the modal itself
   * never grows/shrinks with the day list's own content.
   */
  layout?: "stacked" | "split";
};
