import type { ClubRecord, ClubSettingsFormValues } from "./types";

export function clubToFormValues(
  club?: ClubRecord | null,
): ClubSettingsFormValues {
  return {
    name: club?.name ?? "",
    legalName: club?.legalName ?? "",
    taxId: club?.taxId ?? "",
    email: club?.email ?? "",
    phone: club?.phone ?? "",
    logoUrl: club?.logoUrl ?? "",
    timezone: club?.timezone ?? "",
    currency: club?.currency ?? "",
  };
}
