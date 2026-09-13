import type { ClubClosure, RawClubClosure } from "./types";

export function toClubClosure(raw: RawClubClosure): ClubClosure {
  return {
    id: raw.id,
    courtId: raw.courtId,
    courtName: raw.courtName,
    startsAt: new Date(raw.startsAt),
    endsAt: new Date(raw.endsAt),
    reason: raw.reason,
    createdAt: new Date(raw.createdAt),
    createdBy: raw.createdBy,
    cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt) : undefined,
    cancelledBy: raw.cancelledBy,
  };
}
