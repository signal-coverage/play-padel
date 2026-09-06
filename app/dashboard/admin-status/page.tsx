"use client";

import { AdminOnlyGuard } from "@/app/dashboard/_components/AdminOnlyGuard";
import { AdminStatusView } from "./_components/AdminStatusView";

// Admin-only global observability tool — same AdminOnlyGuard pattern as
// app/dashboard/admin-search/page.tsx and app/dashboard/audit-logs/page.tsx.
export default function AdminStatusPage() {
  return (
    <AdminOnlyGuard>
      <AdminStatusView />
    </AdminOnlyGuard>
  );
}
