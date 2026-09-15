import type { AdminMetrics } from "./types";

// Single source of truth for which AdminMetrics field backs which card, its
// label, and its staggered fade-up entrance delay (this dashboard's existing
// convention — see DashboardBentoCard's animationDelay prop). `labelKey`
// (not a raw label) is looked up via the caller's own
// useTranslations("AdminDashboardHome") — this is a plain const, not a
// component, so it can't call useTranslations itself.
export const ADMIN_METRIC_CARDS: {
  key: keyof AdminMetrics;
  labelKey: string;
  animationDelay: string;
}[] = [
  { key: "totalClubs", labelKey: "totalClubs", animationDelay: "0ms" },
  { key: "totalCourts", labelKey: "totalCourts", animationDelay: "80ms" },
  {
    key: "totalPlayers",
    labelKey: "totalPlayers",
    animationDelay: "160ms",
  },
  {
    key: "totalReservations",
    labelKey: "reservationsBooked",
    animationDelay: "240ms",
  },
];

// The Total Clubs card's breakdown rows (see AdminDashboardHome.tsx's own
// key === "totalClubs" branch) — shown above the overall total itself, in
// this order, so an admin sees the composition before the single summary
// number.
export const CLUB_BREAKDOWN_ROWS: {
  key: "activeClubs" | "inactiveClubs" | "pendingApprovalClubs";
  labelKey: string;
}[] = [
  { key: "activeClubs", labelKey: "active" },
  { key: "inactiveClubs", labelKey: "inactive" },
  { key: "pendingApprovalClubs", labelKey: "pendingApproval" },
];
