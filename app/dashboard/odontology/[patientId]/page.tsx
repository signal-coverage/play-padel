"use client";

import { use } from "react";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { PatientChartPage } from "./_components/PatientChartPage";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default function PatientChartRoute({ params }: Props) {
  const { patientId } = use(params);
  const { hasPermission } = usePermission();

  if (!hasPermission("patients.read")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <PatientChartPage patientId={patientId} />;
}
