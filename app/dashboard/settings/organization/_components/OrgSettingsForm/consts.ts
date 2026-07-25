import { CURRENCIES } from "@/lib/consts";
import type { UpdateOrganizationInput } from "@/core/organizations/schemas/organization.schema";

export { CURRENCIES };

export const DEFAULT_FORM_VALUES: UpdateOrganizationInput = {
  name: "",
  email: "",
  phone: "",
  currency: "ARS",
  legalName: "",
  taxId: "",
};
