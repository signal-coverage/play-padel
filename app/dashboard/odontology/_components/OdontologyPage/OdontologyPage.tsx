"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Stethoscope, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAppointments,
  cancelAppointment,
  completeAppointment,
  noShowAppointment,
} from "@/app/actions/appointments";
import { AppointmentList } from "@/app/dashboard/appointments/_components/AppointmentList";
import type { Appointment } from "@/core/appointments/types";

interface RecentlyTreatedPatient {
  patientId: string;
  patientName: string;
  lastTreatedAt: Date;
}

function getRecentlyTreated(
  completedAppointments: Appointment[],
): RecentlyTreatedPatient[] {
  const seen = new Map<string, RecentlyTreatedPatient>();
  const sorted = [...completedAppointments].sort(
    (a, b) =>
      new Date(b.scheduledStart).getTime() -
      new Date(a.scheduledStart).getTime(),
  );
  for (const appt of sorted) {
    if (!seen.has(appt.patientId)) {
      seen.set(appt.patientId, {
        patientId: appt.patientId,
        patientName: appt.patientName,
        lastTreatedAt: new Date(appt.scheduledStart),
      });
    }
  }
  return Array.from(seen.values()).slice(0, 8);
}

export function OdontologyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayString = format(today, "yyyy-MM-dd");
  const [patientSearch, setPatientSearch] = useState("");

  const completedQuery = useQuery({
    queryKey: ["appointments", "completed-today"],
    queryFn: () => getAppointments({ status: "COMPLETED" }),
  });

  const todayQuery = useQuery({
    queryKey: ["appointments", "today"],
    queryFn: () => getAppointments({ date: todayString }),
  });

  const allRecentlyTreated = completedQuery.data?.success
    ? getRecentlyTreated(completedQuery.data.data)
    : [];

  const recentlyTreated = patientSearch.trim()
    ? allRecentlyTreated.filter((p) =>
        p.patientName
          .toLowerCase()
          .includes(patientSearch.trim().toLowerCase()),
      )
    : allRecentlyTreated;

  const todayAppointments = todayQuery.data?.success
    ? todayQuery.data.data
    : [];

  function handleEdit() {
    router.push("/dashboard/appointments");
  }

  async function handleCancel(id: string) {
    const result = await cancelAppointment(id).catch(() => null);
    if (!result) {
      toast.error("Failed to cancel appointment");
      return;
    }
    if (result.success) {
      toast.success("Appointment cancelled");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } else {
      toast.error(result.error);
    }
  }

  async function handleComplete(id: string) {
    const result = await completeAppointment(id).catch(() => null);
    if (!result) {
      toast.error("Failed to complete appointment");
      return;
    }
    if (result.success) {
      toast.success("Appointment completed");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } else {
      toast.error(result.error);
    }
  }

  async function handleNoShow(id: string) {
    const result = await noShowAppointment(id).catch(() => null);
    if (!result) {
      toast.error("Failed to mark appointment as no-show");
      return;
    }
    if (result.success) {
      toast.success("Appointment marked as no-show");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Odontology</h1>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        <aside className="w-64 shrink-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="space-y-2">
              <CardTitle className="text-sm">Recently treated</CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-xs"
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {completedQuery.isFetching ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Loading...
                </div>
              ) : recentlyTreated.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {patientSearch.trim()
                    ? "No patients match your search."
                    : "No patients treated yet."}
                </div>
              ) : (
                <div className="divide-y">
                  {recentlyTreated.map((patient) => (
                    <Link
                      key={patient.patientId}
                      href={`/dashboard/odontology/${patient.patientId}`}
                      className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {patient.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(patient.lastTreatedAt, "MMM d, yyyy")}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t">
                <Link
                  href="/dashboard/patients"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Search className="h-3 w-3" />
                  Search all patients
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle>Today&apos;s appointments</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <AppointmentList
                appointments={todayAppointments}
                isLoading={todayQuery.isFetching}
                onEdit={handleEdit}
                onCancel={handleCancel}
                onComplete={handleComplete}
                onNoShow={handleNoShow}
                onRowClick={(appt) =>
                  router.push(`/dashboard/odontology/${appt.patientId}`)
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
