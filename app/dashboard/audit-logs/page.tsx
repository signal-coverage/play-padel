"use client";

import { OwnerOnlyGuard } from "@/app/dashboard/_components/OwnerOnlyGuard";
import { AuditLogsView } from "./_components/AuditLogsView";

export default function AuditLogsPage() {
  return (
    <OwnerOnlyGuard>
      <AuditLogsView />
    </OwnerOnlyGuard>
  );
}
