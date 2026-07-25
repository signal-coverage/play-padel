"use client";

import { use } from "react";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { NutritionPatientChartPage } from "./_components/NutritionPatientChartPage";

interface Props {
  params: Promise<{ patientId: string }>;
}

export default function NutritionPatientChartRoute({ params }: Props) {
  const { patientId } = use(params);
  const { hasPermission } = usePermission();

  if (!hasPermission("nutrition.view")) {
    return (
      <p className="text-muted-foreground">
        You do not have permission to view this page.
      </p>
    );
  }

  return <NutritionPatientChartPage patientId={patientId} />;
}
