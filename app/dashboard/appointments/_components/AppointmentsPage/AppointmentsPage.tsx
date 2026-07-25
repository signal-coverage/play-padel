"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, startOfWeek, addDays } from "date-fns";
import { toast } from "sonner";
import { ListIcon, CalendarDaysIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import {
  getAppointments,
  cancelAppointment,
  completeAppointment,
  noShowAppointment,
} from "@/app/actions/appointments";
import { AppointmentCalendar } from "@/app/dashboard/appointments/_components/AppointmentCalendar";
import { AppointmentList } from "@/app/dashboard/appointments/_components/AppointmentList";
import { AppointmentSheet } from "@/app/dashboard/appointments/_components/AppointmentSheet";
import { AppointmentWeekView } from "@/app/dashboard/appointments/_components/AppointmentWeekView/AppointmentWeekView";
import { InvoiceSheet } from "@/app/dashboard/billing/_components/InvoiceSheet/InvoiceSheet";
import type { Appointment } from "@/core/appointments/types";

export function AppointmentsPage() {
  const { hasPermission } = usePermission();
  const canCreate = hasPermission("appointments.create");
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [view, setView] = useState<"list" | "week">("list");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<
    Appointment | undefined
  >(undefined);
  const [invoiceSheetOpen, setInvoiceSheetOpen] = useState(false);
  const [invoiceInitialPatientId, setInvoiceInitialPatientId] = useState("");
  const [invoiceInitialAppointmentId, setInvoiceInitialAppointmentId] =
    useState("");

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  const dailyQuery = useQuery({
    queryKey: ["appointments", "daily", format(selectedDate, "yyyy-MM-dd")],
    queryFn: () =>
      getAppointments({ date: format(selectedDate, "yyyy-MM-dd") }),
  });

  const upcomingQuery = useQuery({
    queryKey: ["appointments", "upcoming"],
    queryFn: () => getAppointments({ status: "SCHEDULED" }),
  });

  const weekQuery = useQuery({
    queryKey: ["appointments", "week", format(weekStart, "yyyy-MM-dd")],
    queryFn: () =>
      getAppointments({
        dateFrom: format(weekStart, "yyyy-MM-dd"),
        dateTo: format(addDays(weekStart, 6), "yyyy-MM-dd"),
      }),
    enabled: view === "week",
    placeholderData: (prev) => prev,
  });

  const appointments = dailyQuery.data?.success ? dailyQuery.data.data : [];
  const weekAppointments = weekQuery.data?.success ? weekQuery.data.data : [];

  const upcomingAppointments = (() => {
    if (!upcomingQuery.data?.success) return [];
    const now = new Date();
    return upcomingQuery.data.data
      .filter((a) => new Date(a.scheduledStart) > now)
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() -
          new Date(b.scheduledStart).getTime(),
      )
      .slice(0, 5);
  })();

  function handleDateSelect(date: Date) {
    setSelectedDate(date);
  }

  function handleNew() {
    setEditingAppointment(undefined);
    setSheetOpen(true);
  }

  function handleEdit(id: string) {
    const appt = appointments.find((a) => a.id === id);
    setEditingAppointment(appt);
    setSheetOpen(true);
  }

  function handleEditAppointment(appointment: Appointment) {
    setEditingAppointment(appointment);
    setSheetOpen(true);
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

  function handleSheetSuccess() {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
  }

  function handleCreateInvoice(appointmentId: string, patientId: string) {
    setInvoiceInitialPatientId(patientId);
    setInvoiceInitialAppointmentId(appointmentId);
    setInvoiceSheetOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("list")}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setView("week")}
              aria-label="Week view"
            >
              <CalendarDaysIcon className="h-4 w-4" />
            </Button>
          </div>
          {canCreate && <Button onClick={handleNew}>New appointment</Button>}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="shrink-0 flex flex-col gap-4">
          <AppointmentCalendar
            selected={selectedDate}
            onSelect={handleDateSelect}
          />

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              Upcoming
            </p>
            {upcomingAppointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No upcoming appointments.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="py-2">
                    <p className="text-xs text-muted-foreground">
                      {new Date(appt.scheduledStart).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })}
                      {" · "}
                      {new Date(appt.scheduledStart).toISOString().slice(11, 16)}
                    </p>
                    <p className="text-sm font-medium truncate">
                      {appt.patientName}
                    </p>
                    {appt.professionalName && (
                      <p className="text-xs text-muted-foreground truncate">
                        {appt.professionalName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {view === "week" ? (
            <AppointmentWeekView
              weekStart={weekStart}
              appointments={weekAppointments}
              onEdit={handleEditAppointment}
              isFetching={weekQuery.isFetching}
            />
          ) : (
            <AppointmentList
              appointments={appointments}
              isLoading={dailyQuery.isFetching}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onComplete={handleComplete}
              onNoShow={handleNoShow}
              onCreateInvoice={handleCreateInvoice}
            />
          )}
        </div>
      </div>

      <AppointmentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        appointment={editingAppointment}
        defaultDate={selectedDate}
        onSuccess={handleSheetSuccess}
      />

      <InvoiceSheet
        open={invoiceSheetOpen}
        onOpenChange={setInvoiceSheetOpen}
        mode="create"
        invoice={undefined}
        onSuccess={() => {
          setInvoiceSheetOpen(false);
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
        }}
        initialPatientId={invoiceInitialPatientId}
        initialAppointmentId={invoiceInitialAppointmentId}
      />
    </div>
  );
}
