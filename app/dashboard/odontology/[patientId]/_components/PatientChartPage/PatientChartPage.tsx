"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { getPatientChart } from "@/app/actions/odontology";
import { OdontologyPatientChart } from "../OdontologyPatientChart";
import type { PatientChartData } from "@/app/actions/odontology";
import type { PatientChartPageProps } from "./types";

export function PatientChartPage({ patientId }: PatientChartPageProps) {
  const [chart, setChart] = useState<PatientChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getPatientChart(patientId).catch(() => null);
      if (cancelled) return;
      if (!result) {
        toast.error("Failed to load patient chart");
        setLoading(false);
        return;
      }
      if (result.success) {
        setChart(result.data);
      } else {
        toast.error(result.error);
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading chart...</div>
    );
  }

  if (!chart) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Patient not found.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Link
        href="/dashboard/odontology"
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

      <OdontologyPatientChart
        patientId={chart.id}
        initialOdontogramState={chart.odontogramState}
        consultations={chart.consultations}
        treatments={chart.treatments}
        nextAppointment={chart.nextAppointment}
      />
    </div>
  );
}
