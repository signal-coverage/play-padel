"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Brain, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getRecentPsychologyPatients } from "@/app/actions/psychology";

export function PsychologyPage() {
  const [patientSearch, setPatientSearch] = useState("");

  const recentQuery = useQuery({
    queryKey: ["psychology-recent-patients"],
    queryFn: () => getRecentPsychologyPatients(),
  });

  const allRecentPatients = recentQuery.data?.success
    ? recentQuery.data.data
    : [];

  const recentPatients = patientSearch.trim()
    ? allRecentPatients.filter((p) =>
        p.patientName
          .toLowerCase()
          .includes(patientSearch.trim().toLowerCase()),
      )
    : allRecentPatients;

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Psychology</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 gap-6">
        <aside className="w-64 shrink-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="space-y-2">
              <CardTitle className="text-sm">Recent patients</CardTitle>
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
              {recentQuery.isFetching ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Loading...
                </div>
              ) : recentPatients.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  {patientSearch.trim()
                    ? "No patients match your search."
                    : "No recent psychology patients."}
                </div>
              ) : (
                <div className="divide-y">
                  {recentPatients.map((patient) => (
                    <Link
                      key={patient.patientId}
                      href={`/dashboard/psychology/${patient.patientId}`}
                      className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {patient.patientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(patient.lastSessionAt), "MMM d, yyyy")}
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
                  View all patients
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="flex-1 min-w-0">
          <Card className="h-full flex flex-col items-center justify-center">
            <div className="text-center space-y-2 p-8">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">Select a patient</p>
              <p className="text-xs text-muted-foreground">
                Choose a patient from the sidebar to view their psychology
                record.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
