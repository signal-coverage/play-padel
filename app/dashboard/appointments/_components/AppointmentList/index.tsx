"use client";

import { AppointmentCard } from "@/app/dashboard/appointments/_components/AppointmentCard";
import type { AppointmentListProps } from "./types";

export function AppointmentList({
  appointments,
  isLoading,
  onEdit,
  onCancel,
  onComplete,
  onNoShow,
  onCreateInvoice,
  onRowClick,
}: AppointmentListProps) {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            <div className="w-24 h-4 rounded bg-muted animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 rounded bg-muted animate-pulse w-40" />
              <div className="h-3 rounded bg-muted animate-pulse w-28" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No appointments for today.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onEdit={onEdit}
          onCancel={onCancel}
          onComplete={onComplete}
          onNoShow={onNoShow}
          onCreateInvoice={onCreateInvoice}
          onRowClick={onRowClick}
        />
      ))}
    </div>
  );
}
