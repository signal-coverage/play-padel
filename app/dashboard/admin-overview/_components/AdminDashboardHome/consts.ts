import type { AdminMetrics } from "./types";

// Single source of truth for which AdminMetrics field backs which card, its
// label, and its staggered fade-up entrance delay (this dashboard's existing
// convention — see DashboardBentoCard's animationDelay prop).
export const ADMIN_METRIC_CARDS: {
  key: keyof AdminMetrics;
  label: string;
  animationDelay: string;
}[] = [
  { key: "totalClubs", label: "Total Clubs", animationDelay: "0ms" },
  { key: "totalCourts", label: "Total Courts", animationDelay: "80ms" },
  { key: "totalPlayers", label: "Total Players", animationDelay: "160ms" },
  {
    key: "totalReservations",
    label: "Reservations Booked",
    animationDelay: "240ms",
  },
];

// The Total Clubs card's breakdown rows (see AdminDashboardHome.tsx's own
// key === "totalClubs" branch) — shown above the overall total itself, in
// this order, so an admin sees the composition before the single summary
// number.
export const CLUB_BREAKDOWN_ROWS: {
  key: "activeClubs" | "inactiveClubs" | "pendingApprovalClubs";
  label: string;
}[] = [
  { key: "activeClubs", label: "Active" },
  { key: "inactiveClubs", label: "Inactive" },
  { key: "pendingApprovalClubs", label: "Pending approval" },
];
