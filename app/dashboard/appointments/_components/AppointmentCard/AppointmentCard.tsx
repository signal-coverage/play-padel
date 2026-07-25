"use client";

import {
  PencilIcon,
  XCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ReceiptIcon,
  MoreHorizontalIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppointmentStatusBadge } from "@/app/dashboard/appointments/_components/AppointmentStatusBadge";
import { usePermission } from "@/core/permissions/hooks/use-permission";
import { cn } from "@/lib/utils/utils";
import { formatTimeRange } from "./utils";
import type { AppointmentCardProps } from "./types";

export function AppointmentCard({
  appointment,
  onEdit,
  onCancel,
  onComplete,
  onNoShow,
  onCreateInvoice,
  onRowClick,
}: AppointmentCardProps) {
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission("appointments.update");
  const canCancel = hasPermission("appointments.cancel");
  const canCreateInvoice = hasPermission("billing.create");

  const isActive =
    appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";

  const showInvoice =
    canCreateInvoice &&
    (appointment.status === "COMPLETED" ||
      appointment.status === "CONFIRMED" ||
      appointment.status === "SCHEDULED");

  const hasActions =
    (isActive && (canUpdate || canCancel)) || showInvoice;

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-3 rounded-md transition-colors",
        onRowClick && "group",
      )}
    >
      {/* Clickable zone: time + info */}
      <div
        role={onRowClick ? "button" : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onClick={() => onRowClick?.(appointment)}
        onKeyDown={(e) => {
          if (onRowClick && (e.key === "Enter" || e.key === " "))
            onRowClick(appointment);
        }}
        className={cn(
          "flex flex-1 min-w-0 items-center gap-3",
          onRowClick &&
            "cursor-pointer rounded-md px-1 -mx-1 py-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        <div className="w-24 shrink-0">
          <p className="text-sm font-medium tabular-nums">
            {formatTimeRange(
              appointment.scheduledStart,
              appointment.scheduledEnd,
            )}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "font-medium text-sm",
              onRowClick &&
                "group-hover:text-primary transition-colors duration-150",
            )}
          >
            {appointment.patientName}
          </p>
          {appointment.professionalName && (
            <p className="text-xs text-muted-foreground">
              {appointment.professionalName}
            </p>
          )}
          {appointment.reason && (
            <p className="text-xs text-muted-foreground truncate">
              {appointment.reason}
            </p>
          )}
        </div>

        <AppointmentStatusBadge status={appointment.status} />

        {onRowClick && (
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!onRowClick && isActive && canUpdate && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(appointment.id)}
            aria-label="Edit appointment"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        )}

        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Appointment actions"
              >
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onRowClick && isActive && canUpdate && (
                <DropdownMenuItem onClick={() => onEdit(appointment.id)}>
                  <PencilIcon className="h-4 w-4" />
                  Edit appointment
                </DropdownMenuItem>
              )}
              {isActive && canUpdate && (
                <>
                  <DropdownMenuItem
                    onClick={() => onComplete(appointment.id)}
                    className="text-green-700 focus:text-green-700"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    Mark as complete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onNoShow(appointment.id)}
                    className="text-yellow-700 focus:text-yellow-700"
                  >
                    <ClockIcon className="h-4 w-4" />
                    Mark as no-show
                  </DropdownMenuItem>
                </>
              )}
              {isActive && canCancel && (
                <>
                  {canUpdate && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() => onCancel(appointment.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    Cancel appointment
                  </DropdownMenuItem>
                </>
              )}
              {showInvoice && (
                <>
                  {(isActive || !canUpdate) && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onClick={() =>
                      onCreateInvoice?.(appointment.id, appointment.patientId)
                    }
                  >
                    <ReceiptIcon className="h-4 w-4" />
                    Create invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
