"use client";

import { AdminOnlyGuard } from "@/app/dashboard/_components/AdminOnlyGuard";
import { AdminSearchView } from "./_components/AdminSearchView";

// Admin-only global support tool — same AdminOnlyGuard pattern as
// app/dashboard/audit-logs/page.tsx.
export default function AdminSearchPage() {
  return (
    <AdminOnlyGuard>
      <AdminSearchView />
    </AdminOnlyGuard>
  );
}
