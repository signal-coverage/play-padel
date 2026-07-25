export type CourtRecord = {
  id: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  slotDurationMinutes: number;
  active: boolean;
};

export type CourtFormValues = {
  name: string;
  surface: string;
  indoor: boolean;
  color: string;
  slotDurationMinutes: number;
  active: boolean;
};

export type AvailabilityDayRow = {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
};
