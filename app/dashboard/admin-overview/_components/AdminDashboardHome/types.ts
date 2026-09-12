export type AdminMetrics = {
  totalClubs: number;
  // A mutually exclusive partition of totalClubs (see GET
  // /api/admin/metrics's own comments for the exact ACTIVE/APPROVED/PENDING
  // semantics) — activeClubs + inactiveClubs + pendingApprovalClubs always
  // sums back to totalClubs.
  activeClubs: number;
  inactiveClubs: number;
  pendingApprovalClubs: number;
  totalCourts: number;
  totalPlayers: number;
  totalReservations: number;
};
