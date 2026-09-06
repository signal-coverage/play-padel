"use client";

import { AdminOnlyGuard } from "@/app/dashboard/_components/AdminOnlyGuard";
import { AuditLogsView } from "./_components/AuditLogsView";

// Admin-only technical tooling now, global across every club — owners no
// longer have access at all (see AdminOnlyGuard).
export default function AuditLogsPage() {
  return (
    <AdminOnlyGuard>
      <AuditLogsView />
    </AdminOnlyGuard>
  );
}
