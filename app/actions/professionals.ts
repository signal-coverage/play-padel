"use server";

import { checkPermission } from "@/core/permissions/utils";
import {
  createProfessionalSchema,
  updateProfessionalSchema,
  createWorkingHoursSchema,
  type CreateProfessionalInput,
  type UpdateProfessionalInput,
  type CreateWorkingHoursInput,
} from "@/core/professionals/schemas/professional.schema";
import {
  listProfessionals as _listProfessionals,
  getProfessional as _getProfessional,
  createProfessional as _createProfessional,
  updateProfessional as _updateProfessional,
  deactivateProfessional as _deactivateProfessional,
  getWorkingHours as _getWorkingHours,
  createWorkingHours as _createWorkingHours,
  deleteWorkingHours as _deleteWorkingHours,
} from "@/core/professionals/services/professionals.service";
import type {
  Professional,
  WorkingHours,
  ProfessionalFilters,
  PaginatedProfessionals,
} from "@/core/professionals/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";

export async function getProfessionals(
  filters?: ProfessionalFilters,
): Promise<ActionResult<PaginatedProfessionals>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _listProfessionals(
      profile.organizationId,
      filters ?? {},
    );
    return { success: true, data };
  } catch (error) {
    console.error("getProfessionals error:", error);
    return { success: false, error: "Failed to fetch professionals" };
  }
}

export async function getProfessional(
  id: string,
): Promise<ActionResult<Professional | null>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getProfessional(profile.organizationId, id);
    return { success: true, data };
  } catch (error) {
    console.error("getProfessional error:", error);
    return { success: false, error: "Failed to fetch professional" };
  }
}

export async function createProfessional(
  input: CreateProfessionalInput,
): Promise<ActionResult<Professional>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.create",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = createProfessionalSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _createProfessional(
      profile.organizationId,
      profile.id,
      parsed.data,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "professional.created",
      entity: "professional",
      entityId: data.id,
    });
    return { success: true, data };
  } catch (error) {
    console.error("createProfessional error:", error);
    return { success: false, error: "Failed to create professional" };
  }
}

export async function updateProfessional(
  id: string,
  input: UpdateProfessionalInput,
): Promise<ActionResult<Professional>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = updateProfessionalSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _updateProfessional(
      profile.organizationId,
      id,
      profile.id,
      parsed.data,
    );
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "professional.updated",
      entity: "professional",
      entityId: id,
    });
    return { success: true, data };
  } catch (error) {
    console.error("updateProfessional error:", error);
    return { success: false, error: "Failed to update professional" };
  }
}

export async function deactivateProfessional(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.delete",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    await _deactivateProfessional(profile.organizationId, id, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "professional.deactivated",
      entity: "professional",
      entityId: id,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deactivateProfessional error:", error);
    return { success: false, error: "Failed to deactivate professional" };
  }
}

export async function getWorkingHours(
  professionalId: string,
): Promise<ActionResult<WorkingHours[]>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _getWorkingHours(professionalId, profile.organizationId);
    return { success: true, data };
  } catch (error) {
    console.error("getWorkingHours error:", error);
    return { success: false, error: "Failed to fetch working hours" };
  }
}

export async function createWorkingHours(
  professionalId: string,
  input: CreateWorkingHoursInput,
): Promise<ActionResult<WorkingHours>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = createWorkingHoursSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    const data = await _createWorkingHours(
      profile.organizationId,
      professionalId,
      parsed.data,
    );
    return { success: true, data };
  } catch (error) {
    console.error("createWorkingHours error:", error);
    return { success: false, error: "Failed to create working hours" };
  }
}

export async function deleteWorkingHours(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "professionals.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    await _deleteWorkingHours(profile.organizationId, id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteWorkingHours error:", error);
    return { success: false, error: "Failed to delete working hours" };
  }
}
