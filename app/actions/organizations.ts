"use server";

import { auth } from "@clerk/nextjs/server";
import { checkPermission } from "@/core/permissions/utils";
import {
  getOrganization as _getOrganization,
  createOrganization as _createOrganization,
  updateOrganization as _updateOrganization,
  disableOrganization as _disableOrganization,
  enableOrganization as _enableOrganization,
  deleteOrganization as _deleteOrganization,
} from "@/core/organizations/services/organizations.service";
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/core/organizations/schemas/organization.schema";
import { PLAN_VALUES, type Organization, type Plan } from "@/core/organizations/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";

export async function getOrganization(
  id: string,
): Promise<ActionResult<Organization | null>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "organization.read")) {
      return { success: false, error: "Forbidden" };
    }
    if (id !== profile.organizationId) {
      return { success: false, error: "Not found" };
    }
    const data = await _getOrganization(id);
    return { success: true, data };
  } catch (error) {
    console.error("getOrganization error:", error);
    return { success: false, error: "Failed to fetch organization" };
  }
}

export async function createOrganization(
  data: Omit<Organization, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
): Promise<ActionResult<Organization>> {
  try {
    const { userId } = await auth();
    if (!userId) return { success: false, error: "Unauthorized" };
    const result = await _createOrganization(data, createdBy);
    return { success: true, data: result };
  } catch (error) {
    console.error("createOrganization error:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export async function updateOrganization(
  id: string,
  data: Partial<Omit<Organization, "id" | "createdAt" | "createdBy">>,
  updatedBy: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "organization.update")) {
      return { success: false, error: "Forbidden" };
    }
    if (id !== profile.organizationId) {
      return { success: false, error: "Not found" };
    }
    await _updateOrganization(id, data, updatedBy);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateOrganization error:", error);
    return { success: false, error: "Failed to update organization" };
  }
}

export async function disableOrganization(): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (profile.roleId !== "admin")
      return { success: false, error: "Forbidden" };
    await _disableOrganization(profile.organizationId, profile.id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("disableOrganization error:", error);
    return { success: false, error: "Failed to disable organization" };
  }
}

export async function enableOrganization(): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (profile.roleId !== "admin")
      return { success: false, error: "Forbidden" };
    await _enableOrganization(profile.organizationId, profile.id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("enableOrganization error:", error);
    return { success: false, error: "Failed to enable organization" };
  }
}

export async function deleteOrganization(): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (profile.roleId !== "admin")
      return { success: false, error: "Forbidden" };
    await _deleteOrganization(profile.organizationId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteOrganization error:", error);
    return { success: false, error: "Failed to delete organization" };
  }
}

export async function updateOrganizationSettings(
  input: UpdateOrganizationInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "organization.update")) {
      return { success: false, error: "Forbidden" };
    }
    const parsed = updateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    await _updateOrganization(profile.organizationId, parsed.data, profile.id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateOrganizationSettings error:", error);
    return { success: false, error: "Failed to update organization settings" };
  }
}

export async function updateOrganizationPlan(
  plan: Plan,
): Promise<ActionResult<void>> {
  try {
    if (!PLAN_VALUES.includes(plan)) {
      return { success: false, error: "Invalid plan" };
    }
    const profile = await requireOrgProfile();
    if (!checkPermission(profile.roleId, "organization.update")) {
      return { success: false, error: "Forbidden" };
    }
    await _updateOrganization(profile.organizationId, { plan }, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "organization.plan_changed",
      entity: "organization",
      entityId: profile.organizationId,
      metadata: { plan },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateOrganizationPlan error:", error);
    return { success: false, error: "Failed to update plan" };
  }
}
