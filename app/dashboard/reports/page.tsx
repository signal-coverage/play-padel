"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { ReportsPage } from "./_components/ReportsPage";

export default function ReportsRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("billing.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <ReportsPage />;
}
