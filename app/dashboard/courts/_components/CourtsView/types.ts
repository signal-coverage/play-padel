export type CourtRecord = {
  id: string;
  name: string;
  surface?: string;
  indoor: boolean;
  color?: string;
  wallType?: string;
  lighting: boolean;
  netType?: string;
  photoUrl?: string;
  slotDurationMinutes: number;
  reservationFee?: number;
  courtPrice?: number;
  active: boolean;
};

export type CourtFormValues = {
  name: string;
  surface: string;
  indoor: boolean;
  color: string;
  wallType?: string;
  lighting: boolean;
  netType?: string;
  photoUrl?: string;
  slotDurationMinutes: number;
  reservationFee: number;
  courtPrice?: number;
  active: boolean;
};

// Relocated to the shared, cross-feature component — see
// components/AvailabilityRowsEditor/types.ts. Re-exported here so this
// feature's own CourtFormSheet.tsx/utils.ts imports don't need to change.
export type { AvailabilityDayRow } from "@/components/AvailabilityRowsEditor";

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
