// Mirror the shapes GET /api/admin/search returns (see
// app/api/admin/search/route.ts). Kept as local, duck-typed copies (not
// imported across the API/UI boundary) per this repo's SRP-per-folder
// convention (see AdminClubSettingsView/types.ts's AdminClubListItem comment
// for the same rationale).
export type AdminSearchClubResult = {
  id: string;
  name: string;
  email: string;
  status: string;
};

export type AdminSearchPlayerResult = {
  id: string;
  displayName: string;
  email: string;
};

export type AdminSearchReservationResult = {
  id: string;
  courtName: string;
  clubId: string;
  playerName: string;
  scheduledStart: string;
  status: string;
};

export type AdminSearchResults = {
  clubs: AdminSearchClubResult[];
  players: AdminSearchPlayerResult[];
  reservations: AdminSearchReservationResult[];
};
