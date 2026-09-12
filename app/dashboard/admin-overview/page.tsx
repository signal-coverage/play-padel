"use client";

import { AdminOnlyGuard } from "@/app/dashboard/_components/AdminOnlyGuard";
import { AdminDashboardHome } from "./_components/AdminDashboardHome";

// Admin-only platform overview — same AdminOnlyGuard pattern as
// app/dashboard/admin-search/page.tsx and app/dashboard/admin-status/
// page.tsx. Reached from the Admin dropdown's "Overview" item (see
// AppNavbar/consts.ts); this used to be DashboardHome's own
// `if (user.isAdmin) return <AdminDashboardHome />` branch, which replaced
// an admin's ENTIRE dashboard (including a player/owner who's also an
// admin) — moved here so that no longer happens.
export default function AdminOverviewPage() {
  return (
    <AdminOnlyGuard>
      <AdminDashboardHome />
    </AdminOnlyGuard>
  );
}
