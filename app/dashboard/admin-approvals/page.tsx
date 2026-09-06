"use client";

import { AdminOnlyGuard } from "@/app/dashboard/_components/AdminOnlyGuard";
import { AdminApprovalsView } from "./_components/AdminApprovalsView";

// Admin-only club approval queue — same AdminOnlyGuard pattern as
// app/dashboard/admin-search/page.tsx.
export default function AdminApprovalsPage() {
  return (
    <AdminOnlyGuard>
      <AdminApprovalsView />
    </AdminOnlyGuard>
  );
}
