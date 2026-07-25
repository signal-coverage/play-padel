"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, PencilIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientStatusBadge } from "@/app/dashboard/patients/_components/PatientStatusBadge";
import { PatientSheet } from "@/app/dashboard/patients/_components/PatientSheet";
import { AppointmentStatusBadge } from "@/app/dashboard/appointments/_components/AppointmentStatusBadge";
import { getPatient } from "@/app/actions/patients";
import { getAppointments } from "@/app/actions/appointments";
import { getInvoices } from "@/app/actions/billing";
import { INVOICE_STATUS_LABEL } from "@/core/billing/consts";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import type { InvoiceStatus } from "@/core/billing/types";

interface PatientHistoryPageProps {
  patientId: string;
}

const INVOICE_STATUS_VARIANT: Record<
  InvoiceStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "secondary",
  ISSUED: "outline",
  PAID: "default",
  VOID: "destructive",
};

export function PatientHistoryPage({ patientId }: PatientHistoryPageProps) {
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission("patients.update");
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: patientResult, isLoading: patientLoading } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: () => getPatient(patientId),
  });

  const { data: appointmentsResult, isLoading: appointmentsLoading } = useQuery(
    {
      queryKey: ["appointments", { patientId }],
      queryFn: () => getAppointments({ patientId }),
    },
  );

  const { data: invoicesResult, isLoading: invoicesLoading } = useQuery({
    queryKey: ["invoices", { patientId }],
    queryFn: () => getInvoices({ patientId, pageSize: 20 }),
  });

  const patient = patientResult?.success ? patientResult.data : null;
  const appointments = appointmentsResult?.success
    ? appointmentsResult.data
    : [];
  const invoices = invoicesResult?.success ? invoicesResult.data.invoices : [];

  function handleSheetSuccess() {
    queryClient.invalidateQueries({ queryKey: ["patient", patientId] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Link
        href="/dashboard/patients"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Patients
      </Link>

      {patientLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      ) : patient ? (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <PatientStatusBadge status={patient.status} />
              {patient.phone && (
                <span className="text-sm text-muted-foreground">
                  {patient.phone}
                </span>
              )}
              {patient.email && (
                <span className="text-sm text-muted-foreground">
                  {patient.email}
                </span>
              )}
            </div>
          </div>
          {canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSheetOpen(true)}
            >
              <PencilIcon className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">Patient not found.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Appointments</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Professional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointmentsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="text-sm">
                      {appt.scheduledStart.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.professionalName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {appt.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Invoices</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      #{invoice.number}
                    </TableCell>
                    <TableCell>
                      <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]}>
                        {INVOICE_STATUS_LABEL[invoice.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invoice.currency} {invoice.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {invoice.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {patient && (
        <PatientSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          patient={patient}
          onSuccess={handleSheetSuccess}
        />
      )}
    </div>
  );
}
