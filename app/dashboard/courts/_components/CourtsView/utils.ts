import {
  DAY_LABELS,
  DEFAULT_SLOT_DURATION_MINUTES,
} from "@/core/courts/consts";
import { COURT_SURFACE_OPTIONS } from "./components/CourtFormSheet/components/SurfaceField/consts";
import type { AvailabilityEntry, CourtClosure } from "@/core/courts/types";
import type {
  AvailabilityDayRow,
  CourtFormValues,
  CourtRecord,
  RawCourtClosure,
} from "./types";

export const DEFAULT_COURT_COLOR = "#2D8A60";

export function courtToFormValues(
  court?: CourtRecord | null,
): Omit<CourtFormValues, "reservationFee"> & { reservationFee?: number } {
  return {
    name: court?.name ?? "",
    courtNumber: court?.courtNumber,
    surface: court?.surface ?? "",
    indoor: court?.indoor ?? false,
    color: court?.color ?? DEFAULT_COURT_COLOR,
    wallType: court?.wallType ?? "",
    lighting: court?.lighting ?? false,
    netType: court?.netType ?? "",
    photoUrl: court?.photoUrl,
    slotDurationMinutes:
      court?.slotDurationMinutes ?? DEFAULT_SLOT_DURATION_MINUTES,
    reservationFee: court?.reservationFee,
    courtPrice: court?.courtPrice,
    active: court?.active ?? true,
  };
}

export function surfaceLabel(surface?: string): string {
  if (!surface || surface.trim().length === 0) return "—";
  return (
    COURT_SURFACE_OPTIONS.find((option) => option.value === surface)?.label ??
    surface
  );
}

export function indoorLabel(indoor: boolean): string {
  return indoor ? "Indoor" : "Outdoor";
}

/** Builds the 7-row weekly editor state from whatever entries the server has
 * on file, defaulting unset days to inactive with a sensible 09:00-21:00
 * placeholder window so toggling them on doesn't start from an empty range.
 *
 * Accepts either a court's own `CourtAvailability[]` (edit mode) or a club's
 * `GET /api/clubs/operating-hours` response (create mode) — both are
 * structurally assignable to `AvailabilityEntry[]`. Presence of a day in the
 * array means it's active; there's no separate `.active` filter, since
 * neither persisted shape is ever written with an inactive row (see
 * setCourtAvailability/setClubOperatingHours's delete-then-recreate-only-
 * provided-entries pattern). */
export function buildAvailabilityRows(
  entries: AvailabilityEntry[],
): AvailabilityDayRow[] {
  return DAY_LABELS.map((_, dayOfWeek) => {
    const entry = entries.find((e) => e.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      active: Boolean(entry),
      startTime: entry?.startTime ?? "09:00",
      endTime: entry?.endTime ?? "21:00",
    };
  });
}

export function availabilityRowsToEntries(
  rows: AvailabilityDayRow[],
): AvailabilityEntry[] {
  return rows
    .filter((row) => row.active)
    .map((row) => ({
      dayOfWeek: row.dayOfWeek,
      startTime: row.startTime,
      endTime: row.endTime,
    }));
}

export function toCourtClosure(raw: RawCourtClosure): CourtClosure {
  return {
    id: raw.id,
    courtId: raw.courtId,
    startsAt: new Date(raw.startsAt),
    endsAt: new Date(raw.endsAt),
    reason: raw.reason,
    createdAt: new Date(raw.createdAt),
    createdBy: raw.createdBy,
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
    cancelledBy: raw.cancelledBy,
  };
}
