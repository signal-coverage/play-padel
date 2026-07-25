"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PatientsPage } from "./_components/PatientsPage";

export default function PatientsRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("patients.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <PatientsPage />;
}
