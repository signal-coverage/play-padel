"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPatientNutritionChart } from "@/app/actions/nutrition";
import { NutritionPatientChart } from "../NutritionPatientChart";
import type { NutritionPatientChartPageProps } from "./types";

export function NutritionPatientChartPage({
  patientId,
}: NutritionPatientChartPageProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["nutrition-chart", patientId],
    queryFn: () => getPatientNutritionChart(patientId),
  });

  function handleRefresh() {
    void queryClient.invalidateQueries({
      queryKey: ["nutrition-chart", patientId],
    });
  }

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading chart...</div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Failed to load patient chart.
      </div>
    );
  }

  if (!data.success) {
    toast.error(data.error);
    return (
      <div className="p-6 text-sm text-muted-foreground">{data.error}</div>
    );
  }

  const chart = data.data;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <Link
        href="/dashboard/nutrition"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Patients
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {chart.firstName} {chart.lastName}
        </h1>
        {chart.birthDate && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Born{" "}
            {new Date(chart.birthDate).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {chart.phone ? ` · ${chart.phone}` : ""}
            {chart.email ? ` · ${chart.email}` : ""}
          </p>
        )}
      </div>

      <NutritionPatientChart
        patientId={chart.id}
        initialPlans={chart.plans}
        initialSessions={chart.sessions}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
