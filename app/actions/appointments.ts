"use server";

import { checkPermission } from "@/core/permissions/utils";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/core/appointments/schemas/appointment.schema";
import {
  listAppointments as _listAppointments,
  getAppointment as _getAppointment,
  createAppointment as _createAppointment,
  updateAppointment as _updateAppointment,
  cancelAppointment as _cancelAppointment,
  completeAppointment as _completeAppointment,
  noShowAppointment as _noShowAppointment,
  checkAppointmentConflict,
} from "@/core/appointments/services/appointments.service";
import type {
  Appointment,
  AppointmentFilters,
  AppointmentStatus,
} from "@/core/appointments/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";
import { eventBus } from "@/core/events/event-bus";

export async function getAppointments(filters?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  professionalId?: string;
  status?: AppointmentStatus;
  patientId?: string;
}): Promise<ActionResult<Appointment[]>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }

    const parsedFilters: AppointmentFilters = {
      date: filters?.date ? new Date(filters.date) : undefined,
      dateFrom: filters?.dateFrom,
      dateTo: filters?.dateTo,
      professionalId: filters?.professionalId,
      status: filters?.status,
      patientId: filters?.patientId,
    };

    const data = await _listAppointments(profile.organizationId, parsedFilters);
    return { success: true, data };
  } catch (error) {
    console.error("getAppointments error:", error);
    return { success: false, error: "Failed to fetch appointments" };
  }
}

export async function getAppointment(
  id: string,
): Promise<ActionResult<Appointment | null>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getAppointment(profile.organizationId, id);
    return { success: true, data };
  } catch (error) {
    console.error("getAppointment error:", error);
    return { success: false, error: "Failed to fetch appointment" };
  }
}

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<Appointment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.create",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = createAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    if (parsed.data.professionalId) {
      const hasConflict = await checkAppointmentConflict({
        organizationId: profile.organizationId,
        professionalId: parsed.data.professionalId,
        scheduledStart: new Date(parsed.data.scheduledStart),
        scheduledEnd: new Date(parsed.data.scheduledEnd),
      });
      if (hasConflict) {
        return {
          success: false,
          error: "The professional already has an appointment at this time.",
        };
      }
    }
    const data = await _createAppointment(
      profile.organizationId,
      profile.id,
      parsed.data,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "appointment.created",
      entity: "appointment",
      entityId: data.id,
    });
    eventBus
      .emit("appointment.created", {
        appointmentId: data.id,
        organizationId: profile.organizationId,
        patientId: data.patientId,
        professionalId: data.professionalId ?? "",
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("createAppointment error:", error);
    return { success: false, error: "Failed to create appointment" };
  }
}

export async function updateAppointment(
  id: string,
  input: UpdateAppointmentInput,
): Promise<ActionResult<Appointment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = updateAppointmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    // Run conflict check when any time or professional field is changing
    if (
      parsed.data.scheduledStart !== undefined ||
      parsed.data.scheduledEnd !== undefined ||
      parsed.data.professionalId !== undefined
    ) {
      const current = await _getAppointment(profile.organizationId, id);
      if (!current) {
        return { success: false, error: "Appointment not found" };
      }
      // Resolve the final values (new value takes precedence over current)
      const professionalId =
        parsed.data.professionalId !== undefined
          ? parsed.data.professionalId
          : current.professionalId;
      if (professionalId) {
        const scheduledStart = parsed.data.scheduledStart
          ? new Date(parsed.data.scheduledStart)
          : current.scheduledStart;
        const scheduledEnd = parsed.data.scheduledEnd
          ? new Date(parsed.data.scheduledEnd)
          : current.scheduledEnd;
        const hasConflict = await checkAppointmentConflict({
          organizationId: profile.organizationId,
          professionalId,
          scheduledStart,
          scheduledEnd,
          excludeId: id,
        });
        if (hasConflict) {
          return {
            success: false,
            error: "The professional already has an appointment at this time.",
          };
        }
      }
    }
    const data = await _updateAppointment(
      profile.organizationId,
      id,
      profile.id,
      parsed.data,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "appointment.updated",
      entity: "appointment",
      entityId: id,
    });
    return { success: true, data };
  } catch (error) {
    console.error("updateAppointment error:", error);
    return { success: false, error: "Failed to update appointment" };
  }
}

export async function cancelAppointment(
  id: string,
): Promise<ActionResult<Appointment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.cancel",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const current = await _getAppointment(profile.organizationId, id).catch(
      () => null,
    );
    const previousStatus = current?.status ?? "SCHEDULED";
    const data = await _cancelAppointment(
      profile.organizationId,
      id,
      profile.id,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "appointment.cancelled",
      entity: "appointment",
      entityId: id,
    });
    eventBus
      .emit("appointment.status_changed", {
        appointmentId: id,
        organizationId: profile.organizationId,
        patientId: data.patientId,
        professionalId: data.professionalId ?? "",
        status: data.status,
        previousStatus,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("cancelAppointment error:", error);
    return { success: false, error: "Failed to cancel appointment" };
  }
}

export async function completeAppointment(
  id: string,
): Promise<ActionResult<Appointment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const current = await _getAppointment(profile.organizationId, id).catch(
      () => null,
    );
    const previousStatus = current?.status ?? "SCHEDULED";
    const data = await _completeAppointment(
      profile.organizationId,
      id,
      profile.id,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "appointment.completed",
      entity: "appointment",
      entityId: id,
    });
    eventBus
      .emit("appointment.status_changed", {
        appointmentId: id,
        organizationId: profile.organizationId,
        patientId: data.patientId,
        professionalId: data.professionalId ?? "",
        status: data.status,
        previousStatus,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("completeAppointment error:", error);
    return { success: false, error: "Failed to complete appointment" };
  }
}

export async function noShowAppointment(
  id: string,
): Promise<ActionResult<Appointment>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "appointments.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const current = await _getAppointment(profile.organizationId, id).catch(
      () => null,
    );
    const previousStatus = current?.status ?? "SCHEDULED";
    const data = await _noShowAppointment(
      profile.organizationId,
      id,
      profile.id,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "appointment.no_show",
      entity: "appointment",
      entityId: id,
    });
    eventBus
      .emit("appointment.status_changed", {
        appointmentId: id,
        organizationId: profile.organizationId,
        patientId: data.patientId,
        professionalId: data.professionalId ?? "",
        status: data.status,
        previousStatus,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("noShowAppointment error:", error);
    return { success: false, error: "Failed to mark appointment as no-show" };
  }
}
