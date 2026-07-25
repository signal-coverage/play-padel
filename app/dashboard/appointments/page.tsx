"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { AppointmentsPage } from "./_components/AppointmentsPage";

export default function AppointmentsRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("appointments.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <AppointmentsPage />;
}
