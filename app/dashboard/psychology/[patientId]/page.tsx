"use client";

import { use } from "react";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PsychologyPatientChartPage } from "./_components/PsychologyPatientChartPage";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default function PsychologyPatientChartRoute({ params }: Props) {
  const { patientId } = use(params);
  const { hasPermission } = usePermission();

  if (!hasPermission("psychology.view")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <PsychologyPatientChartPage patientId={patientId} />;
}
