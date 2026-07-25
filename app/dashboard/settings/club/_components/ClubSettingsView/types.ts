export type ClubRecord = {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
};

export type ClubSettingsFormValues = {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  logoUrl: string;
  timezone: string;
  currency: string;
};
