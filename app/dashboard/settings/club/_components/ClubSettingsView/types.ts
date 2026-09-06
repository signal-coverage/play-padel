export type ClubRecord = {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  province?: string;
  city?: string;
  zipCode?: string;
  // Always the club owner's own Clerk-synced profile photo (never an
  // independently-editable club logo) — see core/clubs/types/index.ts's
  // Club.ownerPhotoUrl.
  ownerPhotoUrl?: string | null;
  timezone: string;
  currency: string;
};

export type ClubSettingsViewProps = {
  // When provided, this view fetches/saves the specified club via the
  // admin-gated /api/admin/clubs/[clubId] endpoints instead of the
  // owner-only /api/clubs, and keys its query cache by clubId (see hooks.ts)
  // so switching between clubs in AdminClubSettingsView's picker never shows
  // stale data from a previously-selected club. Omitted entirely, this is
  // byte-identical to the original self-club, owner-only behavior.
  clubId?: string;
};

export type ClubSettingsFormValues = {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  province: string;
  city: string;
  zipCode: string;
  timezone: string;
  currency: string;
};
