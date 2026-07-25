"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { OdontologyPage } from "./_components/OdontologyPage";

export default function OdontologyRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("patients.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <OdontologyPage />;
}
