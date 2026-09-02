export type AvailabilityDayRow = {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
};

export type AvailabilityRowsEditorProps = {
  rows: AvailabilityDayRow[];
  onChange: (rows: AvailabilityDayRow[]) => void;
};
