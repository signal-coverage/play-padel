// Mirrors core/clubs/types's PendingClubSummary — the shape
// GET /api/admin/clubs/pending returns. Kept as a local, duck-typed copy
// (not imported across the API/UI boundary) per this repo's SRP-per-folder
// convention. `createdAt` is a string here (ISO timestamp), not a Date —
// this is what actually arrives over JSON.
export type PendingClub = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  // True when another club (any status) shares this club's email or
  // address — a warning for the admin to judge, not an automatic rejection.
  // See PendingClubSummary's own doc comment in core/clubs/types.
  possibleDuplicate: boolean;
};
