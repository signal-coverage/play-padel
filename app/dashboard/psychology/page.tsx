"use client";

import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PsychologyPage } from "./_components/PsychologyPage/PsychologyPage";

export default function PsychologyRoute() {
  const { hasPermission } = usePermission();

  if (!hasPermission("psychology.view")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <PsychologyPage />;
}
