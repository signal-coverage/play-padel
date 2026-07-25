"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { CustomRolesPage } from "./_components/CustomRolesPage/CustomRolesPage";

export default function CustomRolesSettingsPage() {
  const { hasPermission } = usePermission();

  if (!hasPermission("settings.manage")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <CustomRolesPage />;
}
