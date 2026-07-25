"use server";

import { prisma } from "@/infrastructure/db/client";
import { checkPermission } from "@/core/permissions/utils";
import type { ActionResult } from "@/core/billing/types";
import { requireOrgProfile } from "@/lib/auth/require-org-profile";

export type CustomRoleEntry = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  userCount: number;
};

export async function getCustomRoles(): Promise<
  ActionResult<CustomRoleEntry[]>
> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const roles = await prisma.customRole.findMany({
      where: { organizationId: profile.organizationId },
      include: { _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    });
    return {
      success: true,
      data: roles.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        name: r.name,
        description: r.description,
        permissions: r.permissions,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        createdBy: r.createdBy,
        userCount: r._count.users,
      })),
    };
  } catch (error) {
    console.error("getCustomRoles error:", error);
    return { success: false, error: "Failed to fetch custom roles" };
  }
}

export async function createCustomRole(input: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<ActionResult<CustomRoleEntry>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const role = await prisma.customRole.create({
      data: {
        organizationId: profile.organizationId,
        name: input.name,
        description: input.description ?? null,
        permissions: input.permissions,
        createdBy: profile.id,
      },
    });
    return {
      success: true,
      data: { ...role, userCount: 0 },
    };
  } catch (error) {
    console.error("createCustomRole error:", error);
    return { success: false, error: "Failed to create custom role" };
  }
}

export async function updateCustomRole(
  id: string,
  input: { name?: string; description?: string | null; permissions?: string[] },
): Promise<ActionResult<CustomRoleEntry>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const existing = await prisma.customRole.findFirst({
      where: { id, organizationId: profile.organizationId },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) return { success: false, error: "Role not found" };
    const role = await prisma.customRole.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        permissions: input.permissions,
      },
    });
    return {
      success: true,
      data: { ...role, userCount: existing._count.users },
    };
  } catch (error) {
    console.error("updateCustomRole error:", error);
    return { success: false, error: "Failed to update custom role" };
  }
}

export async function deleteCustomRole(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const existing = await prisma.customRole.findFirst({
      where: { id, organizationId: profile.organizationId },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) return { success: false, error: "Role not found" };
    if (existing._count.users > 0) {
      return {
        success: false,
        error:
          "Cannot delete a role with assigned users. Unassign all users first.",
      };
    }
    await prisma.customRole.delete({ where: { id } });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteCustomRole error:", error);
    return { success: false, error: "Failed to delete custom role" };
  }
}

export async function assignCustomRole(
  userId: string,
  customRoleId: string | null,
): Promise<ActionResult<void>> {
  try {
    const profile = await requireOrgProfile();
    if (
      !checkPermission(
        profile.roleId,
        "settings.manage",
        profile.effectivePermissions,
      )
    ) {
      return { success: false, error: "Forbidden" };
    }
    const targetUser = await prisma.userProfile.findFirst({
      where: { id: userId, organizationId: profile.organizationId },
    });
    if (!targetUser) return { success: false, error: "User not found" };

    if (customRoleId) {
      const customRole = await prisma.customRole.findFirst({
        where: { id: customRoleId, organizationId: profile.organizationId },
      });
      if (!customRole)
        return { success: false, error: "Custom role not found" };
    }

    await prisma.userProfile.update({
      where: { id: userId },
      data: { customRoleId },
    });
    return { success: true, data: undefined };
  } catch (error) {
    console.error("assignCustomRole error:", error);
    return { success: false, error: "Failed to assign custom role" };
  }
}
