"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { ProfessionalsPage } from "./_components/ProfessionalsPage";

export default function ProfessionalsRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("professionals.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <ProfessionalsPage />;
}
