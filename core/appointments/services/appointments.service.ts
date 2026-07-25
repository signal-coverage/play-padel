import { prisma } from "@/infrastructure/db/client";
import { Prisma } from "@/lib/generated/prisma/client";
import { startOfDay, endOfDay } from "date-fns";
import { render } from "@react-email/render";
import * as React from "react";
import type {
  Appointment,
  AppointmentFilters,
} from "@/core/appointments/types";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "@/core/appointments/schemas/appointment.schema";
import { dispatch } from "@/lib/notifications/dispatcher";
import { AppointmentCancelled } from "@/lib/email/templates/AppointmentCancelled";

type AppointmentRow = NonNullable<
  Awaited<ReturnType<typeof prisma.appointment.findUnique>>
>;

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    organizationId: row.organizationId,
    patientId: row.patientId,
    patientName: row.patientName,
    professionalId: row.professionalId ?? undefined,
    professionalName: row.professionalName ?? undefined,
    pluginId: row.pluginId ?? undefined,
    status: row.status as Appointment["status"],
    scheduledStart: row.scheduledStart,
    scheduledEnd: row.scheduledEnd,
    reason: row.reason ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    cancelledBy: row.cancelledBy ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
  };
}

export async function listAppointments(
  orgId: string,
  filters: AppointmentFilters,
): Promise<Appointment[]> {
  const where: Prisma.AppointmentWhereInput = {
    organizationId: orgId,
    ...(filters.dateFrom && filters.dateTo
      ? {
          scheduledStart: {
            gte: startOfDay(new Date(filters.dateFrom)),
            lte: endOfDay(new Date(filters.dateTo)),
          },
        }
      : filters.date
        ? {
            scheduledStart: {
              gte: startOfDay(filters.date),
              lte: endOfDay(filters.date),
            },
          }
        : {}),
    ...(filters.professionalId
      ? { professionalId: filters.professionalId }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.patientId ? { patientId: filters.patientId } : {}),
  };

  const rows = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledStart: "asc" },
  });

  return rows.map(toAppointment);
}

export async function getAppointment(
  orgId: string,
  id: string,
): Promise<Appointment | null> {
  const row = await prisma.appointment.findUnique({
    where: { id, organizationId: orgId },
  });
  return row ? toAppointment(row) : null;
}

export async function createAppointment(
  orgId: string,
  createdBy: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId, organizationId: orgId },
    select: { firstName: true, lastName: true },
  });

  if (!patient) {
    throw new Error("Patient not found");
  }

  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  let professionalName: string | null = null;
  if (input.professionalId) {
    const professional = await prisma.professional.findUnique({
      where: { id: input.professionalId, organizationId: orgId },
      select: { displayName: true },
    });
    professionalName = professional?.displayName ?? null;
  }

  const row = await prisma.appointment.create({
    data: {
      organizationId: orgId,
      patientId: input.patientId,
      patientName,
      professionalId: input.professionalId ?? null,
      professionalName,
      pluginId: input.pluginId ?? null,
      status: "SCHEDULED",
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      reason: input.reason ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      createdBy,
      updatedBy: createdBy,
    },
  });

  return toAppointment(row);
}

export async function updateAppointment(
  orgId: string,
  id: string,
  updatedBy: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  let patientName: string | undefined;
  if (input.patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: input.patientId, organizationId: orgId },
      select: { firstName: true, lastName: true },
    });
    if (patient) {
      patientName = `${patient.firstName} ${patient.lastName}`.trim();
    }
  }

  let professionalName: string | null | undefined;
  if (input.professionalId !== undefined) {
    if (input.professionalId) {
      const professional = await prisma.professional.findUnique({
        where: { id: input.professionalId, organizationId: orgId },
        select: { displayName: true },
      });
      professionalName = professional?.displayName ?? null;
    } else {
      professionalName = null;
    }
  }

  const row = await prisma.appointment.update({
    where: { id, organizationId: orgId },
    data: {
      ...(input.patientId !== undefined && { patientId: input.patientId }),
      ...(patientName !== undefined && { patientName }),
      ...(input.professionalId !== undefined && {
        professionalId: input.professionalId ?? null,
      }),
      ...(professionalName !== undefined && { professionalName }),
      ...(input.scheduledStart !== undefined && {
        scheduledStart: new Date(input.scheduledStart),
      }),
      ...(input.scheduledEnd !== undefined && {
        scheduledEnd: new Date(input.scheduledEnd),
      }),
      ...(input.reason !== undefined && { reason: input.reason ?? null }),
      ...(input.location !== undefined && { location: input.location ?? null }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.pluginId !== undefined && { pluginId: input.pluginId ?? null }),
      updatedBy,
    },
  });

  return toAppointment(row);
}

export async function cancelAppointment(
  orgId: string,
  id: string,
  cancelledBy: string,
): Promise<Appointment> {
  const row = await prisma.appointment.update({
    where: { id, organizationId: orgId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy,
      updatedBy: cancelledBy,
    },
  });

  // Dispatch cancellation notification — non-throwing, does not affect return value
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: row.patientId },
      select: { email: true, firstName: true, lastName: true },
    });

    const patientName = patient
      ? `${patient.firstName} ${patient.lastName}`.trim()
      : row.patientName;

    const html = await render(
      React.createElement(AppointmentCancelled, {
        patientName,
        scheduledStart: row.scheduledStart,
        professionalName: row.professionalName ?? undefined,
      }),
    );

    await dispatch({
      type: "APPOINTMENT_CANCELLED",
      organizationId: orgId,
      recipientId: row.patientId,
      recipientEmail: patient?.email ?? null,
      recipientName: patientName,
      subject: "Your appointment has been cancelled",
      html,
    });
  } catch {
    // notification failure must not affect appointment cancellation
  }

  return toAppointment(row);
}

export async function completeAppointment(
  orgId: string,
  id: string,
  updatedBy: string,
): Promise<Appointment> {
  const row = await prisma.appointment.update({
    where: { id, organizationId: orgId },
    data: {
      status: "COMPLETED",
      updatedBy,
    },
  });
  return toAppointment(row);
}

export async function noShowAppointment(
  orgId: string,
  id: string,
  updatedBy: string,
): Promise<Appointment> {
  const row = await prisma.appointment.update({
    where: { id, organizationId: orgId },
    data: {
      status: "NO_SHOW",
      updatedBy,
    },
  });
  return toAppointment(row);
}

export async function checkAppointmentConflict({
  organizationId,
  professionalId,
  scheduledStart,
  scheduledEnd,
  excludeId,
}: {
  organizationId: string;
  professionalId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  excludeId?: string;
}): Promise<boolean> {
  const conflict = await prisma.appointment.findFirst({
    where: {
      organizationId,
      professionalId,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      // Overlap condition: existing.start < new.end AND existing.end > new.start
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
    select: { id: true },
  });
  return conflict !== null;
}

export async function syncPatientNameOnAppointments(
  orgId: string,
  patientId: string,
  newName: string,
): Promise<void> {
  await prisma.appointment.updateMany({
    where: {
      organizationId: orgId,
      patientId,
      status: { not: "CANCELLED" },
    },
    data: { patientName: newName },
  });
}
