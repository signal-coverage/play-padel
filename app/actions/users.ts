"use server";

import { auth } from "@clerk/nextjs/server";
import { checkPermission } from "@/core/permissions/utils";
import {
  getUserProfile as _getUserProfile,
  createUserProfile as _createUserProfile,
  updateUserProfile as _updateUserProfile,
  listUsersByOrg as _listUsersByOrg,
} from "@/core/users/services/users.service";
import {
  updateUserProfileSchema,
  type UpdateUserProfileInput,
} from "@/core/users/schemas/user.schema";
import type { UserProfile } from "@/core/users/types";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";
import { logAudit } from "@/core/audit/services/audit.service";

export async function getUserProfile(
  uid: string,
): Promise<ActionResult<UserProfile | null>> {
  try {
    const profile = await requireOrgProfile();
    const data = await _getUserProfile(uid);
    if (!data || data.organizationId !== profile.organizationId) {
      return { success: false, error: "Not found" };
    }
    return { success: true, data };
  } catch (error) {
    console.error("getUserProfile error:", error);
    return { success: false, error: "Failed to fetch user profile" };
  }
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "id" | "createdAt" | "updatedAt">,
): Promise<ActionResult<UserProfile>> {
  try {
    const { userId } = await auth();
    if (!userId || userId !== uid) {
      return { success: false, error: "Unauthorized" };
    }
    const result = await _createUserProfile(uid, data);
    return { success: true, data: result };
  } catch (error) {
    console.error("createUserProfile error:", error);
    return { success: false, error: "Failed to create user profile" };
  }
}

export async function updateUserProfile(
  uid: string,
  input: UpdateUserProfileInput,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "users.update",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    if (profile.id === uid && input.roleId !== undefined) {
      return { success: false, error: "Cannot change your own role" };
    }
    if (profile.id === uid && input.status !== undefined) {
      return { success: false, error: "Cannot change your own status" };
    }
    const targetProfile = await _getUserProfile(uid);
    if (
      !targetProfile ||
      targetProfile.organizationId !== profile.organizationId
    ) {
      return { success: false, error: "Not found" };
    }
    const parsed = updateUserProfileSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Validation error",
      };
    }
    await _updateUserProfile(uid, parsed.data, profile.id);
    logAudit({
      organizationId: profile.organizationId,
      userId: profile.id,
      userDisplayName: profile.displayName,
      action: "user.updated",
      entity: "user",
      entityId: uid,
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return { success: false, error: "Failed to update user profile" };
  }
}

export async function listOrgUsers(): Promise<ActionResult<UserProfile[]>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "users.read",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const data = await _listUsersByOrg(profile.organizationId);
    return { success: true, data };
  } catch (error) {
    console.error("listOrgUsers error:", error);
    return { success: false, error: "Failed to fetch users" };
  }
}
