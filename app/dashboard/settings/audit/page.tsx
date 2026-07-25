"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { AuditPage } from "./_components/AuditPage/AuditPage";

export default function AuditSettingsPage() {
  const { hasPermission } = usePermission();

  if (!hasPermission("settings.manage")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <AuditPage />;
}
