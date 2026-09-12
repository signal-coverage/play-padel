// Mirrors ClubOperationalGate/types.ts's own ClubOperationalCause (same wire
// shape, from lib/mercadopago/operationalStatus.ts). Kept as an independent
// local copy per the SRP-per-folder convention.
export type ClubOperationalCause =
  "MP_NOT_CONNECTED" | "CLUB_INACTIVE" | "PENDING_APPROVAL";

// Minimal mirror of ClubOperationalGate/types.ts's
// ClubOperationalStatusResponse (same wire shape, from
// app/api/clubs/mercadopago/operational-status/route.ts). Kept as an
// independent local copy per the SRP-per-folder convention. `cause` is used
// by UserMenu to tell "pending approval" apart from every other
// non-operational reason (see its own useClubOperationalCause caller) —
// nav-link visibility itself still only needs the `operational` flag.
export type ClubOperationalStatusResponse = {
  operational: boolean;
  cause: ClubOperationalCause | null;
};

// Minimal mirror of GET /api/tournaments/open's response shape (see
// app/dashboard/tournaments-hub/_components/TournamentsHub/types.ts's
// OpenTournamentSummary for the full wire shape). Kept as an independent
// local copy per the SRP-per-folder convention documented above — this
// folder only needs each tournament's `publishedAt` (for the badge's
// new-vs-open state) and doesn't care about anything else in the payload.
export type OpenTournamentsStatusResponse = {
  tournaments: { publishedAt?: string }[];
};
