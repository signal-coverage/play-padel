"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { RolesMatrix } from "./_components/RolesMatrix";

export default function RolesSettingsPage() {
  const { hasPermission } = usePermission();

  if (!hasPermission("settings.manage")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <RolesMatrix />;
}
