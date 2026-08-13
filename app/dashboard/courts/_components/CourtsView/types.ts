export type CourtRecord = {
  id: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  slotDurationMinutes: number;
  price?: number;
  active: boolean;
};

export type CourtFormValues = {
  name: string;
  surface: string;
  indoor: boolean;
  color: string;
  slotDurationMinutes: number;
  price?: number;
  active: boolean;
};

export type AvailabilityDayRow = {
  dayOfWeek: number;
  active: boolean;
  startTime: string;
  endTime: string;
};

export type RawCourtClosure = {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  createdAt: string;
  createdBy?: string;
  cancelledAt?: string;
  cancelledBy?: string;
};
