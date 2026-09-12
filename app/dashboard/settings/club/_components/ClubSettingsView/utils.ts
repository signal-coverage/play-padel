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
    whatsappNumber: club?.whatsappNumber ?? "",
    // Not derived from `club` — there's no persisted whatsappCountry column
    // to seed from (see ClubSettingsFormValues); PhoneField's own
    // splitPhone detects the country straight from the seeded
    // whatsappNumber at mount, so this only tracks later combobox picks.
    whatsappCountry: "",
    address: club?.address ?? "",
    country: club?.country ?? "",
    province: club?.province ?? "",
    city: club?.city ?? "",
    zipCode: club?.zipCode ?? "",
    timezone: club?.timezone ?? "",
    currency: club?.currency ?? "",
  };
}
