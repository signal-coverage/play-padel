export type PartnerPickerProps = {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  // The signed-in booker's own id — never offered as a candidate (no
  // self-tagging, matches the server-side rule in
  // reservationPartners.service.ts's validatePartnerIds).
  excludeUserId?: string;
};
