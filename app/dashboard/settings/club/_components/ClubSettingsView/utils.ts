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
    address: club?.address ?? "",
    country: club?.country ?? "",
    province: club?.province ?? "",
    city: club?.city ?? "",
    zipCode: club?.zipCode ?? "",
    timezone: club?.timezone ?? "",
    currency: club?.currency ?? "",
  };
}
