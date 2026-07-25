"use server";

import { checkPermission } from "@/core/permissions/utils";
import {
  createPatientSchema,
  updatePatientSchema,
  type CreatePatientInput,
  type UpdatePatientInput,
} from "@/core/patients/schemas/patient.schema";
import {
  listPatients as _listPatients,
  getPatient as _getPatient,
  createPatient as _createPatient,
  updatePatient as _updatePatient,
  deletePatient as _deletePatient,
} from "@/core/patients/services/patients.service";
import { syncPatientNameOnAppointments } from "@/core/appointments/services/appointments.service";
import type {
  PatientFilters,
  PaginatedPatients,
  Patient,
} from "@/core/patients/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";
import { eventBus } from "@/core/events/event-bus";

export async function getPatients(
  filters?: PatientFilters,
): Promise<ActionResult<PaginatedPatients>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _listPatients(profile.organizationId, filters ?? {});
    return { success: true, data };
  } catch (error) {
    console.error("getPatients error:", error);
    return { success: false, error: "Failed to fetch patients" };
  }
}

export async function getPatient(
  id: string,
): Promise<ActionResult<Patient | null>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getPatient(profile.organizationId, id);
    return { success: true, data };
  } catch (error) {
    console.error("getPatient error:", error);
    return { success: false, error: "Failed to fetch patient" };
  }
}

export async function createPatient(
  input: CreatePatientInput,
): Promise<ActionResult<Patient>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.create",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = createPatientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _createPatient(
      profile.organizationId,
      parsed.data,
      profile.id,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "patient.created",
      entity: "patient",
      entityId: data.id,
    });
    eventBus
      .emit("patient.created", {
        patientId: data.id,
        organizationId: profile.organizationId,
        createdBy: profile.id,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("createPatient error:", error);
    return { success: false, error: "Failed to create patient" };
  }
}

export async function updatePatient(
  id: string,
  input: UpdatePatientInput,
): Promise<ActionResult<Patient>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = updatePatientSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _updatePatient(
      profile.organizationId,
      id,
      parsed.data,
      profile.id,
    );
    if (
      parsed.data.firstName !== undefined ||
      parsed.data.lastName !== undefined
    ) {
      const newName = `${data.firstName} ${data.lastName}`.trim();
      await syncPatientNameOnAppointments(profile.organizationId, id, newName);
    }
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "patient.updated",
      entity: "patient",
      entityId: id,
    });
    eventBus
      .emit("patient.updated", {
        patientId: id,
        organizationId: profile.organizationId,
        updatedBy: profile.id,
      })
      .catch(() => null);
    return { success: true, data };
  } catch (error) {
    console.error("updatePatient error:", error);
    return { success: false, error: "Failed to update patient" };
  }
}

export async function deletePatient(id: string): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "patients.delete",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    await _deletePatient(profile.organizationId, id, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "patient.deleted",
      entity: "patient",
      entityId: id,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deletePatient error:", error);
    return { success: false, error: "Failed to delete patient" };
  }
}
