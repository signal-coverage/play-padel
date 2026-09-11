// Wire shape returned by GET /api/tournaments/open — see
// listOpenTournamentsForPlayer. Kept intentionally minimal, only the
// fields the Players-Directory-style row actually renders (name as title,
// club name as subtitle).
export interface OpenTournamentSummary {
  id: string;
  name: string;
  clubName: string;
  // Serialized as an ISO string over JSON (Date -> string via
  // NextResponse.json). Optional because a Tournament may not be published
  // yet in principle, even though every tournament this endpoint actually
  // returns is either open for registration or has an active team, so in
  // practice it's always set. Drives the nav badge's "New" (<48h) vs "Open"
  // state — see AppNavbar/hooks.ts's useOpenTournamentsStatus.
  publishedAt?: string;
}
